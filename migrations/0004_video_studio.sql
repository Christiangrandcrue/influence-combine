-- Video Studio: AI-powered video creation
-- Supports: voice cloning, dubbing, avatar generation, video editing

-- Add voice/avatar fields to users
ALTER TABLE users ADD COLUMN cloned_voice_id TEXT;
ALTER TABLE users ADD COLUMN talking_photo_id TEXT;

-- Studio jobs table
CREATE TABLE IF NOT EXISTS studio_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Job type: 'dubbing', 'avatar_video', 'tts', 'video_edit'
  type TEXT NOT NULL,
  
  -- External service job ID
  external_id TEXT,
  
  -- Status: 'pending', 'processing', 'completed', 'failed'
  status TEXT DEFAULT 'pending',
  
  -- Progress 0-100
  progress INTEGER DEFAULT 0,
  
  -- Job parameters (JSON)
  params TEXT,
  
  -- Result
  result_url TEXT,
  result_data TEXT, -- JSON for additional data
  
  -- Error info
  error_message TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_studio_jobs_user_id ON studio_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_jobs_status ON studio_jobs(status);
CREATE INDEX IF NOT EXISTS idx_studio_jobs_type ON studio_jobs(type);
