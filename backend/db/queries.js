// All database queries live here as named functions.
// Uses the plain "pg" package with parameterized SQL — no ORM.

const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// One shared connection pool for the whole app
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Insert a new video row and return it.
 * @param {object} data - { sourceType, sourceUrl, originalFilename }
 */
async function createVideo({ sourceType, sourceUrl = null, originalFilename = null }) {
  const result = await pool.query(
    `INSERT INTO videos (source_type, source_url, original_filename, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [sourceType, sourceUrl, originalFilename]
  );
  return result.rows[0];
}

/**
 * Fetch a single video by id.
 * @param {number} id
 */
async function getVideoById(id) {
  const result = await pool.query(`SELECT * FROM videos WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

/**
 * Update a video's status (and clear any previous error).
 * @param {number} id
 * @param {string} status
 */
async function updateVideoStatus(id, status) {
  const result = await pool.query(
    `UPDATE videos
     SET status = $1, error_message = NULL
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );
  return result.rows[0];
}

/**
 * Mark a video as failed and store a human-readable error message.
 * @param {number} id
 * @param {string} errorMessage
 */
async function updateVideoError(id, errorMessage) {
  const result = await pool.query(
    `UPDATE videos
     SET status = 'failed', error_message = $1
     WHERE id = $2
     RETURNING *`,
    [errorMessage, id]
  );
  return result.rows[0];
}

/**
 * Insert a new clip row for a video and return it.
 * @param {object} data
 */
async function createClip({
  videoId,
  title,
  captionText,
  startTime,
  endTime,
  filePath,
}) {
  const result = await pool.query(
    `INSERT INTO clips (video_id, title, caption_text, start_time, end_time, file_path)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [videoId, title, captionText, startTime, endTime, filePath]
  );
  return result.rows[0];
}

/**
 * Fetch all clips for a given video, newest first.
 * @param {number} videoId
 */
async function getClipsByVideoId(videoId) {
  const result = await pool.query(
    `SELECT * FROM clips WHERE video_id = $1 ORDER BY start_time ASC`,
    [videoId]
  );
  return result.rows;
}

/**
 * Fetch a single clip by id.
 * @param {number} id
 */
async function getClipById(id) {
  const result = await pool.query(`SELECT * FROM clips WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

module.exports = {
  pool,
  createVideo,
  getVideoById,
  updateVideoStatus,
  updateVideoError,
  createClip,
  getClipsByVideoId,
  getClipById,
};
