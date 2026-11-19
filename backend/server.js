// Express server entry point for the clipping API.

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

// Load env vars from the project root .env file
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { router: videosRouter, downloadClip } = require("./routes/videos");

const app = express();
const PORT = process.env.PORT || 4000;

// --- Ensure storage folders exist on startup ---
const uploadsDir = path.join(__dirname, "storage/uploads");
const clipsDir = path.join(__dirname, "storage/clips");

for (const dir of [uploadsDir, clipsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[server] Created folder: ${dir}`);
  }
}

// --- Middleware ---
app.use(cors()); // allow the Next.js frontend to call this API
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/videos", videosRouter);

// Clip download lives under /api/clips (not nested under /api/videos)
app.get("/api/clips/:id/download", downloadClip);

// --- Start ---
app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
