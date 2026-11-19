// Downloads a YouTube video with yt-dlp, or returns the path of an uploaded file.

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const uploadsDir = path.join(__dirname, "../storage/uploads");

/**
 * Run a shell command (spawn) and resolve when it exits with code 0.
 * Rejects with stderr text if the process fails.
 */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`[downloader] Running: ${command} ${args.join(" ")}`);

    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      reject(
        new Error(
          `Could not start "${command}". Is it installed and on your PATH? (${err.message})`
        )
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `${command} failed (exit ${code}): ${stderr || stdout || "no output"}`
          )
        );
      }
    });
  });
}

/**
 * Download a YouTube video to the uploads folder using yt-dlp.
 * Returns the absolute path to the downloaded .mp4 file.
 * @param {string} youtubeUrl
 * @param {number} videoId - used to name the output file
 * @returns {Promise<string>} path to the downloaded video file
 */
async function downloadYouTubeVideo(youtubeUrl, videoId) {
  if (!youtubeUrl || typeof youtubeUrl !== "string") {
    throw new Error("A valid YouTube URL is required.");
  }

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // yt-dlp writes to this template; %(ext)s becomes mp4 because of --merge-output-format
  const outputTemplate = path.join(uploadsDir, `video_${videoId}.%(ext)s`);
  const expectedPath = path.join(uploadsDir, `video_${videoId}.mp4`);

  // Prefer mp4 so ffmpeg and the browser can handle it easily
  await runCommand("yt-dlp", [
    "--no-playlist",
    "--merge-output-format",
    "mp4",
    "-f",
    "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
    "-o",
    outputTemplate,
    youtubeUrl,
  ]);

  if (!fs.existsSync(expectedPath)) {
    // Fallback: find whatever file yt-dlp created for this video id
    const matches = fs
      .readdirSync(uploadsDir)
      .filter((name) => name.startsWith(`video_${videoId}.`));
    if (matches.length === 0) {
      throw new Error("yt-dlp finished but no output file was found.");
    }
    return path.join(uploadsDir, matches[0]);
  }

  console.log(`[downloader] Downloaded to ${expectedPath}`);
  return expectedPath;
}

/**
 * For uploads we already have the file on disk — just return its path.
 * @param {string} filePath - path where multer saved the upload
 * @returns {Promise<string>}
 */
async function useUploadedFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("Uploaded video file was not found on disk.");
  }
  console.log(`[downloader] Using uploaded file: ${filePath}`);
  return filePath;
}

module.exports = {
  downloadYouTubeVideo,
  useUploadedFile,
};
