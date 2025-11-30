-- Channel Analytics Schema
-- For Instagram channel analysis and virality prediction

-- Channels table - connected Instagram accounts
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  
  -- Basic stats (manual or from API)
  followers INTEGER,
  following INTEGER,
  posts_count INTEGER,
  bio TEXT,
  profile_pic_url TEXT,
  is_verified INTEGER DEFAULT 0,
  is_business INTEGER DEFAULT 0,
  
  -- Engagement metrics
  avg_views INTEGER,
  avg_likes INTEGER,
  avg_comments INTEGER,
  avg_shares INTEGER,
  engagement_rate REAL,
  
  -- Content info
  niche TEXT,
  content_frequency TEXT, -- posts per week
  primary_content_type TEXT, -- reels, photos, stories
  
  -- Analysis results
  health_score INTEGER,
  growth_potential TEXT,
  last_analysis TEXT, -- JSON with full analysis
  last_analyzed_at DATETIME,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, active, error
  connection_type TEXT DEFAULT 'manual', -- manual, oauth, api
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Predictions table - virality predictions for video concepts
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  
  -- Video concept
  video_concept TEXT NOT NULL, -- JSON: hook, topic, structure, etc.
  
  -- Prediction result
  prediction TEXT NOT NULL, -- JSON: scores, factors, improvements
  
  -- Tracking (if video was actually posted)
  actual_views INTEGER,
  actual_likes INTEGER,
  actual_comments INTEGER,
  actual_shares INTEGER,
  video_url TEXT,
  posted_at DATETIME,
  
  -- Accuracy tracking
  prediction_accuracy REAL, -- calculated after actual data
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reels data - historical reels performance (if available)
CREATE TABLE IF NOT EXISTS reels (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  
  -- Instagram data
  instagram_id TEXT,
  url TEXT,
  thumbnail_url TEXT,
  
  -- Content
  caption TEXT,
  hashtags TEXT, -- JSON array
  duration INTEGER, -- seconds
  
  -- Metrics
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  saves INTEGER,
  reach INTEGER,
  impressions INTEGER,
  
  -- Calculated
  engagement_rate REAL,
  virality_score INTEGER,
  
  -- Timing
  posted_at DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_channels_user ON channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_username ON channels(username);
CREATE INDEX IF NOT EXISTS idx_predictions_channel ON predictions(channel_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_channel ON reels(channel_id);
CREATE INDEX IF NOT EXISTS idx_reels_posted ON reels(posted_at DESC);

-- Add instagram_username to users if not exists
-- Note: SQLite doesn't support IF NOT EXISTS for columns, 
-- so this might fail on re-run which is fine
-- ALTER TABLE users ADD COLUMN instagram_username TEXT;
