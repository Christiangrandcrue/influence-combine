-- Influence Combine Database Schema
-- Version: 1.0.0

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  
  -- Onboarding data (positioning)
  niche TEXT,
  target_audience TEXT,
  content_style TEXT,
  expertise TEXT,
  goals TEXT,
  
  -- Subscription
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'team')),
  plan_expires_at DATETIME,
  
  -- Usage limits (reset monthly)
  analyses_used INTEGER DEFAULT 0,
  analyses_limit INTEGER DEFAULT 3,
  ideas_used INTEGER DEFAULT 0,
  ideas_limit INTEGER DEFAULT 5,
  
  -- Timestamps
  onboarding_completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auth sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Auth codes (passwordless)
CREATE TABLE IF NOT EXISTS auth_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Videos
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- File info
  filename TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  duration_seconds REAL,
  
  -- Analysis status
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'uploading', 'processing', 'analyzing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Technical metrics
  resolution TEXT,
  fps REAL,
  bitrate INTEGER,
  lufs REAL,
  snr REAL,
  
  -- Content analysis
  transcript TEXT,
  transcript_language TEXT,
  scenes_data TEXT, -- JSON
  emotions_data TEXT, -- JSON
  objects_data TEXT, -- JSON
  
  -- Computed scores
  hook_score REAL,
  retention_score REAL,
  clarity_score REAL,
  cta_score REAL,
  overall_score REAL,
  
  -- Recommendations
  recommendations TEXT, -- JSON array
  
  -- Timestamps
  analyzed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Generated ideas
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT, -- optional, linked to analyzed video
  
  -- Idea content
  title TEXT NOT NULL,
  hook TEXT,
  structure TEXT, -- petal, emotion, transformation, etc.
  key_message TEXT,
  target_audience TEXT,
  viral_potential INTEGER CHECK(viral_potential BETWEEN 1 AND 10),
  
  -- Status
  status TEXT DEFAULT 'new' CHECK(status IN ('new', 'saved', 'in_progress', 'filmed', 'archived')),
  
  -- Full script if generated
  script TEXT, -- JSON with scenes
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE SET NULL
);

-- AI Chat history
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Context (for RAG)
  context_type TEXT, -- 'video_analysis', 'idea', 'general'
  context_id TEXT, -- video_id or idea_id
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Knowledge base articles (for RAG)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY,
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL, -- 'hooks', 'storytelling', 'editing', 'algorithm', etc.
  tags TEXT, -- JSON array
  
  -- For search
  embedding TEXT, -- stored as JSON array (will use external vector DB in prod)
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Storytelling structures library
CREATE TABLE IF NOT EXISTS storytelling_structures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  use_case TEXT,
  use_case_ru TEXT,
  example_structure TEXT, -- JSON with scene breakdown
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User saved templates/scripts
CREATE TABLE IF NOT EXISTS saved_scripts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  idea_id TEXT,
  
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- JSON with full script
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_codes_email ON auth_codes(email);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
