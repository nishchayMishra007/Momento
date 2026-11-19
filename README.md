# Clipping

AI video clipping app — paste a YouTube URL or upload a video, get short vertical clips with captions.

## Requirements

- Node.js 20+
- PostgreSQL
- [dbmate](https://github.com/amacneil/dbmate)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (on your PATH)
- [ffmpeg](https://ffmpeg.org/) (on your PATH, with `ffprobe`)
- A [Google Gemini API key](https://aistudio.google.com/apikey)

## Setup

```bash
# 1. Env
cp .env.example .env
# Edit .env — set DATABASE_URL and GEMINI_API_KEY

# 2. Database
createdb clipping   # or create the DB however you prefer
cd backend && dbmate up && cd ..

# 3. Install deps (if needed)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## Run

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — UI
cd frontend && npm run dev
```

- Frontend: http://localhost:3000  
- Backend:  http://localhost:4000  

## Pipeline

`pending → downloading → transcribing → analyzing → clipping → completed` (or `failed`)
