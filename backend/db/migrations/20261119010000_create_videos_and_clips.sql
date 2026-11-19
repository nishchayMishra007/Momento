-- migrate:up

-- Videos table: one row per YouTube URL or uploaded file the user submits
CREATE TABLE videos (
  id serial PRIMARY KEY,
  source_type text NOT NULL,              -- 'youtube_url' or 'upload'
  source_url text,                         -- YouTube URL (nullable for uploads)
  original_filename text,                  -- original upload filename (nullable for YouTube)
  status text NOT NULL DEFAULT 'pending',  -- pending -> downloading -> transcribing -> analyzing -> clipping -> completed | failed
  error_message text,                      -- human-readable error when status = 'failed'
  created_at timestamp NOT NULL DEFAULT now()
);

-- Clips table: one row per short clip cut from a video
CREATE TABLE clips (
  id serial PRIMARY KEY,
  video_id integer NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  title text NOT NULL,
  caption_text text NOT NULL,
  start_time numeric NOT NULL,
  end_time numeric NOT NULL,
  file_path text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

-- migrate:down

DROP TABLE IF EXISTS clips;
DROP TABLE IF EXISTS videos;
