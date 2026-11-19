// API routes for videos and clips.
// The heavy pipeline runs in the background so HTTP responses stay fast.

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const {
  createVideo,
  getVideoById,
  updateVideoStatus,
  updateVideoError,
  createClip,
  getClipsByVideoId,
  getClipById,
} = require("../db/queries");

const { downloadYouTubeVideo, useUploadedFile } = require("../services/downloader");
const { transcribeVideo } = require("../services/transcriber");
const { findBestClips } = require("../services/clipFinder");
const { processClip } = require("../services/videoProcessor");

const router = express.Router();

// Where multer saves uploaded video files
const uploadsDir = path.join(__dirname, "../storage/uploads");

// Save uploads with a unique name: video_<timestamp>_<originalname>
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `upload_${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
});

/**
 * Background pipeline: download → transcribe → find clips → process clips.
 * Any failure sets the video status to "failed" with a readable error_message.
 */
async function runPipeline(videoId, options) {
  const { sourceType, youtubeUrl, uploadedPath } = options;

  try {
    // --- Step 1: get the video file on disk ---
    console.log(`[pipeline] Video #${videoId}: downloading...`);
    await updateVideoStatus(videoId, "downloading");

    let videoPath;
    if (sourceType === "youtube_url") {
      videoPath = await downloadYouTubeVideo(youtubeUrl, videoId);
    } else {
      videoPath = await useUploadedFile(uploadedPath);
    }
    console.log(`[pipeline] Video #${videoId}: file ready at ${videoPath}`);

    // --- Step 2: transcript ---
    console.log(`[pipeline] Video #${videoId}: transcribing...`);
    await updateVideoStatus(videoId, "transcribing");
    const transcript = await transcribeVideo(videoPath);
    console.log(`[pipeline] Video #${videoId}: transcript length ${transcript.length}`);

    // --- Step 3: find best moments ---
    console.log(`[pipeline] Video #${videoId}: analyzing...`);
    await updateVideoStatus(videoId, "analyzing");
    const moments = await findBestClips(transcript);
    console.log(`[pipeline] Video #${videoId}: found ${moments.length} moments`);

    // --- Step 4: cut / crop / caption each clip ---
    console.log(`[pipeline] Video #${videoId}: clipping...`);
    await updateVideoStatus(videoId, "clipping");

    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i];
      console.log(
        `[pipeline] Video #${videoId}: processing clip ${i + 1}/${moments.length} — "${moment.title}"`
      );

      const filePath = await processClip({
        sourcePath: videoPath,
        videoId,
        clipIndex: i,
        startTime: moment.start_time,
        endTime: moment.end_time,
        captionText: moment.caption_text,
      });

      await createClip({
        videoId,
        title: moment.title,
        captionText: moment.caption_text,
        startTime: moment.start_time,
        endTime: moment.end_time,
        filePath,
      });
    }

    // --- Done ---
    await updateVideoStatus(videoId, "completed");
    console.log(`[pipeline] Video #${videoId}: completed`);
  } catch (err) {
    console.error(`[pipeline] Video #${videoId}: FAILED`, err);
    const message =
      err && err.message
        ? err.message
        : "Something went wrong while processing this video.";
    try {
      await updateVideoError(videoId, message);
    } catch (dbErr) {
      console.error(`[pipeline] Could not save error for video #${videoId}`, dbErr);
    }
  }
}

/**
 * POST /api/videos
 * Body: JSON { youtubeUrl } OR multipart with field "video"
 * Creates a pending video row, starts the pipeline, returns { id, status }.
 */
router.post("/", upload.single("video"), async (req, res) => {
  try {
    const youtubeUrl = req.body.youtubeUrl || req.body.youtube_url;
    const hasFile = Boolean(req.file);

    if (!youtubeUrl && !hasFile) {
      return res.status(400).json({
        error: "Provide either a youtubeUrl or upload a video file.",
      });
    }

    if (youtubeUrl && hasFile) {
      return res.status(400).json({
        error: "Send either a YouTube URL or a file, not both.",
      });
    }

    let video;
    if (youtubeUrl) {
      video = await createVideo({
        sourceType: "youtube_url",
        sourceUrl: youtubeUrl,
      });

      // Don't await — run in the background
      runPipeline(video.id, {
        sourceType: "youtube_url",
        youtubeUrl,
      });
    } else {
      video = await createVideo({
        sourceType: "upload",
        originalFilename: req.file.originalname,
      });

      runPipeline(video.id, {
        sourceType: "upload",
        uploadedPath: req.file.path,
      });
    }

    return res.status(201).json({ id: video.id, status: video.status });
  } catch (err) {
    console.error("[POST /api/videos]", err);
    return res.status(500).json({ error: "Could not create video." });
  }
});

/**
 * GET /api/videos/:id
 * Returns the video row (status, error_message, etc.) for polling.
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid video id." });
    }

    const video = await getVideoById(id);
    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    return res.json(video);
  } catch (err) {
    console.error("[GET /api/videos/:id]", err);
    return res.status(500).json({ error: "Could not fetch video." });
  }
});

/**
 * GET /api/videos/:id/clips
 * Returns all clips for a video.
 */
router.get("/:id/clips", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid video id." });
    }

    const video = await getVideoById(id);
    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    const clips = await getClipsByVideoId(id);
    return res.json(clips);
  } catch (err) {
    console.error("[GET /api/videos/:id/clips]", err);
    return res.status(500).json({ error: "Could not fetch clips." });
  }
});

/**
 * GET /api/clips/:id/download
 * Streams the clip video file.
 * - Default: inline (works in <video> preview)
 * - ?download=1: Content-Disposition attachment for the Download button
 */
async function downloadClip(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid clip id." });
    }

    const clip = await getClipById(id);
    if (!clip) {
      return res.status(404).json({ error: "Clip not found." });
    }

    if (!clip.file_path || !fs.existsSync(clip.file_path)) {
      return res.status(404).json({ error: "Clip file is missing on disk." });
    }

    const filename = path.basename(clip.file_path);
    const forceDownload = req.query.download === "1";

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
      "Content-Disposition",
      `${forceDownload ? "attachment" : "inline"}; filename="${filename}"`
    );

    const stream = fs.createReadStream(clip.file_path);
    stream.on("error", (err) => {
      console.error("[GET /api/clips/:id/download] stream error", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Could not stream clip." });
      }
    });
    stream.pipe(res);
  } catch (err) {
    console.error("[GET /api/clips/:id/download]", err);
    return res.status(500).json({ error: "Could not download clip." });
  }
}

module.exports = {
  router,
  downloadClip,
};
