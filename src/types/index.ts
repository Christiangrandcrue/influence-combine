// Influence Combine Types

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  
  // Positioning
  niche?: string;
  target_audience?: string;
  content_style?: string;
  expertise?: string;
  goals?: string;
  
  // Subscription
  plan: 'free' | 'pro' | 'team';
  plan_expires_at?: string;
  
  // Usage
  analyses_used: number;
  analyses_limit: number;
  ideas_used: number;
  ideas_limit: number;
  
  onboarding_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  user_id: string;
  
  filename: string;
  file_url?: string;
  file_size?: number;
  duration_seconds?: number;
  
  status: 'pending' | 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  
  // Technical
  resolution?: string;
  fps?: number;
  bitrate?: number;
  lufs?: number;
  snr?: number;
  
  // Content
  transcript?: string;
  transcript_language?: string;
  scenes_data?: string;
  emotions_data?: string;
  objects_data?: string;
  
  // Scores
  hook_score?: number;
  retention_score?: number;
  clarity_score?: number;
  cta_score?: number;
  overall_score?: number;
  
  recommendations?: string;
  
  analyzed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  video_id?: string;
  
  title: string;
  hook?: string;
  structure?: string;
  key_message?: string;
  target_audience?: string;
  viral_potential?: number;
  
  status: 'new' | 'saved' | 'in_progress' | 'filmed' | 'archived';
  script?: string;
  
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  context_type?: string;
  context_id?: string;
  created_at: string;
}

export interface StorytellingStructure {
  id: string;
  name: string;
  name_ru: string;
  description: string;
  description_ru: string;
  use_case?: string;
  use_case_ru?: string;
  example_structure?: string;
}

export interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Video Analysis types
export interface VideoAnalysis {
  technical: {
    resolution: string;
    fps: number;
    duration: number;
    bitrate: number;
    lufs: number;
    snr: number;
  };
  content: {
    transcript: string;
    language: string;
    scenes: Scene[];
    emotions: EmotionData[];
    objects: ObjectDetection[];
  };
  scores: {
    hook: number;
    retention: number;
    clarity: number;
    cta: number;
    overall: number;
  };
  recommendations: Recommendation[];
}

export interface Scene {
  start_time: number;
  end_time: number;
  type: 'hook' | 'content' | 'transition' | 'cta' | 'other';
  description?: string;
  has_face: boolean;
  has_text: boolean;
  dominant_emotion?: string;
}

export interface EmotionData {
  timestamp: number;
  emotion: string;
  confidence: number;
}

export interface ObjectDetection {
  timestamp: number;
  object: string;
  confidence: number;
  bbox?: [number, number, number, number];
}

export interface Recommendation {
  type: 'hook' | 'retention' | 'audio' | 'visual' | 'cta' | 'general';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
}

// Idea Generation types
export interface IdeaGenerationRequest {
  theme?: string;
  target_audience?: string;
  content_style?: string;
  count?: number;
}

export interface GeneratedIdea {
  title: string;
  hook: string;
  structure: string;
  key_message: string;
  target_audience: string;
  viral_potential: number;
  scenes?: SceneScript[];
}

export interface SceneScript {
  number: number;
  duration_sec: number;
  type: string;
  description: string;
  text_overlay?: string;
  audio?: string;
  camera_movement?: string;
  editing_tip?: string;
}

// Cloudflare Bindings
export interface Bindings {
  DB: D1Database;
  OPENAI_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  JWT_SECRET?: string;
  APP_NAME: string;
  APP_VERSION: string;
}

// Hono Context Types
export interface Variables {
  user?: User;
  session_id?: string;
}
