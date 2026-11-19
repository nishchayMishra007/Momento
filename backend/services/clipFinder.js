// Asks Gemini to pick the 3–6 most interesting moments from a transcript.

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
 * Parse a JSON array out of a model response that might include markdown fences.
 * @param {string} text
 * @returns {unknown}
 */
function parseJsonArray(text) {
  let cleaned = text.trim();

  // Strip ```json ... ``` if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // If there's extra prose, try to grab the first [...] block
  const bracketStart = cleaned.indexOf("[");
  const bracketEnd = cleaned.lastIndexOf("]");
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    cleaned = cleaned.slice(bracketStart, bracketEnd + 1);
  }

  return JSON.parse(cleaned);
}

/**
 * Convert a timestamp like "1:05" or "01:05" or "0:01:05" into seconds.
 * Also accepts a plain number.
 */
function toSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return NaN;
  }

  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parts = trimmed.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) {
    return NaN;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return NaN;
}

/**
 * Normalize one raw moment object from Gemini into our clip shape.
 * Returns null if the moment is invalid.
 */
function normalizeMoment(raw) {
  const start = toSeconds(raw.start_time ?? raw.startTime ?? raw.start);
  const end = toSeconds(raw.end_time ?? raw.endTime ?? raw.end);
  const title = String(raw.title || "").trim();
  const caption = String(
    raw.caption_text ?? raw.captionText ?? raw.caption ?? ""
  ).trim();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  if (!title || !caption) {
    return null;
  }

  // Keep clips reasonably short for vertical social video
  const maxDuration = 60;
  const clippedEnd = Math.min(end, start + maxDuration);

  return {
    start_time: Math.max(0, start),
    end_time: clippedEnd,
    title: title.slice(0, 80),
    caption_text: caption.slice(0, 200),
  };
}

/**
 * Analyze a transcript and return an array of clip moment objects.
 * Each object: { start_time, end_time, title, caption_text }
 * Times are in seconds.
 * @param {string} transcript - timestamped transcript text
 * @returns {Promise<Array<{start_time:number,end_time:number,title:string,caption_text:string}>>}
 */
async function findBestClips(transcript) {
  if (!transcript || !transcript.trim()) {
    throw new Error("Cannot find clips without a transcript.");
  }

  const ai = getGeminiClient();

  const prompt = `You are a short-form video editor. Read this timestamped transcript and pick the 3 to 6 most interesting moments for viral vertical clips.

Look for moments that are funny, emotional, catchy, sarcastic, or quotable.

Return ONLY a valid JSON array (no markdown, no explanation). Each item must be:
{
  "start_time": <number of seconds>,
  "end_time": <number of seconds>,
  "title": "<short catchy title>",
  "caption_text": "<short caption/subtitle text for the clip>"
}

Rules:
- Prefer 15–45 second clips
- start_time and end_time must be numbers in seconds (not strings)
- caption_text should be a punchy line suitable as on-screen text
- Do not overlap clips too much
- Pick between 3 and 6 clips

TRANSCRIPT:
${transcript}`;

  console.log(`[clipFinder] Asking Gemini to pick best moments...`);
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const text = (response.text || "").trim();
  if (!text) {
    throw new Error("Gemini returned an empty response for clip detection.");
  }

  let parsed;
  try {
    parsed = parseJsonArray(text);
  } catch (err) {
    console.error("[clipFinder] Raw Gemini response:", text);
    throw new Error(`Could not parse clip JSON from Gemini: ${err.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini did not return a JSON array of clips.");
  }

  const moments = parsed.map(normalizeMoment).filter(Boolean);

  if (moments.length === 0) {
    throw new Error("Gemini did not return any valid clip moments.");
  }

  // Cap at 6 clips
  const limited = moments.slice(0, 6);
  console.log(`[clipFinder] Selected ${limited.length} moments`);
  return limited;
}

module.exports = {
  findBestClips,
};
