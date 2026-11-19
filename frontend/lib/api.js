// Small helpers for calling the Express backend.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Base URL for the backend API.
 */
export function getApiUrl() {
  return API_URL;
}

/**
 * Create a video job from a YouTube URL.
 * @param {string} youtubeUrl
 * @returns {Promise<{id:number,status:string}>}
 */
export async function createVideoFromUrl(youtubeUrl) {
  const res = await fetch(`${API_URL}/api/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ youtubeUrl }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not start clipping job.");
  }
  return data;
}

/**
 * Create a video job from an uploaded file.
 * @param {File} file
 * @returns {Promise<{id:number,status:string}>}
 */
export async function createVideoFromFile(file) {
  const form = new FormData();
  form.append("video", file);

  const res = await fetch(`${API_URL}/api/videos`, {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not start clipping job.");
  }
  return data;
}

/**
 * Fetch a video row (used for status polling).
 * @param {string|number} id
 */
export async function getVideo(id) {
  const res = await fetch(`${API_URL}/api/videos/${id}`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not load video status.");
  }
  return data;
}

/**
 * Fetch clips for a completed video.
 * @param {string|number} id
 */
export async function getClips(id) {
  const res = await fetch(`${API_URL}/api/videos/${id}/clips`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not load clips.");
  }
  return data;
}

/**
 * URL to stream/preview a clip in a <video> element.
 * @param {string|number} clipId
 */
export function getClipStreamUrl(clipId) {
  return `${API_URL}/api/clips/${clipId}/download`;
}

/**
 * URL that forces a file download for a clip.
 * @param {string|number} clipId
 */
export function getClipDownloadUrl(clipId) {
  return `${API_URL}/api/clips/${clipId}/download?download=1`;
}
