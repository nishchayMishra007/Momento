// Extracts audio from a video and sends it to Google Gemini for a timestamped transcript.

const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { GoogleGenAI } = require("@google/genai");

/**
 * Create a Gemini client using GEMINI_API_KEY from the environment.
 */
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error("GEMINI_API_KEY is missing. Add it to your .env file.");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Guess an audio MIME type from a file extension.
 */
function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "audio/webm";
  return "application/octet-stream";
}

/**
 * Extract audio from a video file into an mp3 next to it.
 * Returns the absolute path to the mp3.
 * @param {string} videoPath
 * @returns {Promise<string>}
 */
function extractAudio(videoPath) {
  const audioPath = videoPath.replace(path.extname(videoPath), "") + "_audio.mp3";

  return new Promise((resolve, reject) => {
    console.log(`[transcriber] Extracting audio → ${audioPath}`);

    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .on("end", () => resolve(audioPath))
      .on("error", (err) => {
        reject(new Error(`ffmpeg audio extract failed: ${err.message}`));
      })
      .save(audioPath);
  });
}

/**
 * Wait until a Gemini Files API upload finishes processing.
 */
async function waitForFileActive(ai, uploaded) {
  let file = uploaded;
  // Poll until the file is ready (or failed)
  while (file.state === "PROCESSING") {
    console.log(`[transcriber] Gemini file still processing: ${file.name}`);
    await new Promise((r) => setTimeout(r, 3000));
    file = await ai.files.get({ name: file.name });
  }
  if (file.state === "FAILED") {
    throw new Error("Gemini failed to process the uploaded audio file.");
  }
  return file;
}

/**
 * Transcribe a video file with Gemini.
 * Extracts audio, uploads it, and asks for a timestamped transcript.
 * Returns a timestamped transcript string.
 * @param {string} videoPath - absolute path to the video file
 * @returns {Promise<string>} timestamped transcript text
 */
async function transcribeVideo(videoPath) {
  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error("Video file for transcription was not found.");
  }

  const ai = getGeminiClient();
  const audioPath = await extractAudio(videoPath);

  console.log(`[transcriber] Uploading audio to Gemini...`);
  let uploaded = await ai.files.upload({
    file: audioPath,
    config: { mimeType: mimeFromPath(audioPath) },
  });
  uploaded = await waitForFileActive(ai, uploaded);

  const prompt = `Transcribe this audio carefully.
Return a timestamped transcript only.
Use this exact line format for every spoken segment:
[MM:SS] spoken words here

Rules:
- Cover the full audio from start to end
- Keep timestamps accurate
- Do not add commentary, titles, or summaries — transcript lines only`;

  console.log(`[transcriber] Asking Gemini for transcript...`);
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            fileData: {
              fileUri: uploaded.uri,
              mimeType: uploaded.mimeType || mimeFromPath(audioPath),
            },
          },
        ],
      },
    ],
  });

  const transcript = (response.text || "").trim();
  if (!transcript) {
    throw new Error("Gemini returned an empty transcript.");
  }

  // Best-effort cleanup of temp audio + remote file
  try {
    fs.unlinkSync(audioPath);
  } catch (_e) {
    /* ignore */
  }
  try {
    if (uploaded.name) {
      await ai.files.delete({ name: uploaded.name });
    }
  } catch (_e) {
    /* ignore */
  }

  console.log(`[transcriber] Transcript ready (${transcript.length} chars)`);
  return transcript;
}

module.exports = {
  transcribeVideo,
};
