// Cuts clips with ffmpeg: trim, center-crop to 9:16, burn in captions.

const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const clipsDir = path.join(__dirname, "../storage/clips");

/**
 * Escape text so it is safe inside an SRT file / ffmpeg subtitles filter.
 */
function escapeForSrt(text) {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

/**
 * Format seconds as SRT timestamp: HH:MM:SS,mmm
 */
function formatSrtTime(seconds) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  const pad = (n, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Write a tiny SRT file for one caption covering the whole clip duration.
 * Times are relative to the clipped segment (starts at 0).
 * @returns {string} path to the .srt file
 */
function writeCaptionSrt(captionText, durationSeconds, outPath) {
  const end = Math.max(0.5, durationSeconds);
  const content = `1
${formatSrtTime(0)} --> ${formatSrtTime(end)}
${escapeForSrt(captionText)}
`;
  fs.writeFileSync(outPath, content, "utf8");
  return outPath;
}

/**
 * Escape a file path for use inside an ffmpeg filtergraph (esp. on Windows/macOS).
 */
function escapeFilterPath(filePath) {
  // ffmpeg filter paths: escape \, :, and '
  return filePath
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}

/**
 * Probe a video file and return { width, height, duration }.
 */
function probeVideo(sourcePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(sourcePath, (err, data) => {
      if (err) {
        reject(new Error(`ffprobe failed: ${err.message}`));
        return;
      }
      const stream = (data.streams || []).find((s) => s.codec_type === "video");
      if (!stream) {
        reject(new Error("No video stream found in source file."));
        return;
      }
      resolve({
        width: stream.width,
        height: stream.height,
        duration: Number(data.format?.duration) || 0,
      });
    });
  });
}

/**
 * Build a center-crop filter that produces a 9:16 frame, then scale to 1080x1920.
 * Simple center crop as specified.
 */
function buildCropScaleFilter(width, height) {
  const targetRatio = 9 / 16;
  const currentRatio = width / height;

  let cropW;
  let cropH;

  if (currentRatio > targetRatio) {
    // Too wide — crop the sides
    cropH = height;
    cropW = Math.floor(height * targetRatio);
  } else {
    // Too tall — crop top/bottom
    cropW = width;
    cropH = Math.floor(width / targetRatio);
  }

  // Keep even dimensions for codec friendliness
  cropW = cropW - (cropW % 2);
  cropH = cropH - (cropH % 2);

  const x = Math.floor((width - cropW) / 2);
  const y = Math.floor((height - cropH) / 2);

  return `crop=${cropW}:${cropH}:${x}:${y},scale=1080:1920`;
}

/**
 * Cut one clip from the source video, crop to 9:16, burn in caption text.
 * Returns the absolute path to the output clip file.
 * @param {object} options
 * @param {string} options.sourcePath - original video file
 * @param {number} options.videoId - used in the output filename
 * @param {number} options.clipIndex - used in the output filename
 * @param {number} options.startTime - start in seconds
 * @param {number} options.endTime - end in seconds
 * @param {string} options.captionText - text to burn in as subtitles
 * @returns {Promise<string>} path to the processed clip
 */
async function processClip({
  sourcePath,
  videoId,
  clipIndex,
  startTime,
  endTime,
  captionText,
}) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error("Source video for clipping was not found.");
  }

  if (!fs.existsSync(clipsDir)) {
    fs.mkdirSync(clipsDir, { recursive: true });
  }

  const duration = Math.max(0.5, Number(endTime) - Number(startTime));
  const outputPath = path.join(
    clipsDir,
    `video_${videoId}_clip_${clipIndex}.mp4`
  );
  const srtPath = path.join(
    clipsDir,
    `video_${videoId}_clip_${clipIndex}.srt`
  );

  writeCaptionSrt(captionText || "", duration, srtPath);

  const meta = await probeVideo(sourcePath);
  const cropScale = buildCropScaleFilter(meta.width, meta.height);
  const srtEscaped = escapeFilterPath(srtPath);

  // Force style: white text, black outline, bottom-centered
  const subtitlesFilter = `subtitles='${srtEscaped}':force_style='Alignment=2,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=80'`;

  console.log(
    `[videoProcessor] Cutting ${startTime}s–${endTime}s → ${outputPath}`
  );

  await new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .setStartTime(Number(startTime))
      .setDuration(duration)
      .videoFilters([cropScale, subtitlesFilter])
      .outputOptions([
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
      ])
      .on("end", () => resolve())
      .on("error", (err) => {
        reject(new Error(`ffmpeg clip processing failed: ${err.message}`));
      })
      .save(outputPath);
  });

  // Remove temp SRT (clip file stays)
  try {
    fs.unlinkSync(srtPath);
  } catch (_e) {
    /* ignore */
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error("ffmpeg finished but the clip file was not created.");
  }

  console.log(`[videoProcessor] Clip ready: ${outputPath}`);
  return outputPath;
}

module.exports = {
  processClip,
};
