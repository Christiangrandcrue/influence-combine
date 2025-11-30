// Database utilities for Influence Combine

import { generateId, generateAuthCode, getPlanLimits } from './utils';
import type { User, Video, Idea, ChatMessage, StorytellingStructure, KnowledgeBase } from '../types';

// ============ USER OPERATIONS ============

export async function createUser(db: D1Database, email: string): Promise<User> {
  const id = generateId();
  const limits = getPlanLimits('free');
  
  await db.prepare(`
    INSERT INTO users (id, email, plan, analyses_limit, ideas_limit)
    VALUES (?, ?, 'free', ?, ?)
  `).bind(id, email, limits.analyses, limits.ideas).run();
  
  return getUserById(db, id) as Promise<User>;
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  return result || null;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
  return result || null;
}

export async function updateUser(db: D1Database, id: string, data: Partial<User>): Promise<void> {
  const fields = Object.keys(data)
    .filter(k => k !== 'id' && k !== 'created_at')
    .map(k => `${k} = ?`);
  
  if (fields.length === 0) return;
  
  const values = Object.entries(data)
    .filter(([k]) => k !== 'id' && k !== 'created_at')
    .map(([_, v]) => v);
  
  await db.prepare(`
    UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(...values, id).run();
}

export async function updateUserOnboarding(
  db: D1Database,
  userId: string,
  data: {
    name?: string;
    niche?: string;
    target_audience?: string;
    content_style?: string;
    expertise?: string;
    goals?: string;
  }
): Promise<void> {
  await db.prepare(`
    UPDATE users SET
      name = ?,
      niche = ?,
      target_audience = ?,
      content_style = ?,
      expertise = ?,
      goals = ?,
      onboarding_completed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    data.name || null,
    data.niche || null,
    data.target_audience || null,
    data.content_style || null,
    data.expertise || null,
    data.goals || null,
    userId
  ).run();
}

export async function incrementUserUsage(db: D1Database, userId: string, type: 'analyses' | 'ideas'): Promise<void> {
  const field = type === 'analyses' ? 'analyses_used' : 'ideas_used';
  await db.prepare(`UPDATE users SET ${field} = ${field} + 1 WHERE id = ?`).bind(userId).run();
}

// ============ AUTH OPERATIONS ============

export async function createAuthCode(db: D1Database, email: string): Promise<string> {
  const id = generateId();
  const code = generateAuthCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
  
  // Delete old codes for this email
  await db.prepare('DELETE FROM auth_codes WHERE email = ?').bind(email).run();
  
  await db.prepare(`
    INSERT INTO auth_codes (id, email, code, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(id, email, code, expiresAt).run();
  
  return code;
}

export async function verifyAuthCode(db: D1Database, email: string, code: string): Promise<boolean> {
  const result = await db.prepare(`
    SELECT * FROM auth_codes 
    WHERE email = ? AND code = ? AND expires_at > datetime('now') AND used_at IS NULL
  `).bind(email, code).first();
  
  if (!result) return false;
  
  // Mark as used
  await db.prepare(`
    UPDATE auth_codes SET used_at = CURRENT_TIMESTAMP WHERE email = ? AND code = ?
  `).bind(email, code).run();
  
  return true;
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const id = generateId();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  
  await db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(id, userId, expiresAt).run();
  
  return id;
}

export async function getSession(db: D1Database, sessionId: string): Promise<{ user_id: string } | null> {
  const result = await db.prepare(`
    SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')
  `).bind(sessionId).first<{ user_id: string }>();
  
  return result || null;
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

// ============ VIDEO OPERATIONS ============

export async function createVideo(db: D1Database, userId: string, filename: string): Promise<string> {
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO videos (id, user_id, filename, status)
    VALUES (?, ?, ?, 'pending')
  `).bind(id, userId, filename).run();
  
  return id;
}

export async function getVideoById(db: D1Database, id: string): Promise<Video | null> {
  const result = await db.prepare('SELECT * FROM videos WHERE id = ?').bind(id).first<Video>();
  return result || null;
}

export async function getUserVideos(db: D1Database, userId: string, limit: number = 20): Promise<Video[]> {
  const result = await db.prepare(`
    SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `).bind(userId, limit).all<Video>();
  
  return result.results || [];
}

export async function updateVideo(db: D1Database, id: string, data: Partial<Video>): Promise<void> {
  const fields = Object.keys(data)
    .filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at')
    .map(k => `${k} = ?`);
  
  if (fields.length === 0) return;
  
  const values = Object.entries(data)
    .filter(([k]) => k !== 'id' && k !== 'user_id' && k !== 'created_at')
    .map(([_, v]) => v);
  
  await db.prepare(`
    UPDATE videos SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(...values, id).run();
}

export async function updateVideoAnalysis(
  db: D1Database,
  id: string,
  analysis: {
    transcript?: string;
    transcript_language?: string;
    scenes_data?: string;
    emotions_data?: string;
    objects_data?: string;
    hook_score?: number;
    retention_score?: number;
    clarity_score?: number;
    cta_score?: number;
    overall_score?: number;
    recommendations?: string;
  }
): Promise<void> {
  await db.prepare(`
    UPDATE videos SET
      transcript = ?,
      transcript_language = ?,
      scenes_data = ?,
      emotions_data = ?,
      objects_data = ?,
      hook_score = ?,
      retention_score = ?,
      clarity_score = ?,
      cta_score = ?,
      overall_score = ?,
      recommendations = ?,
      status = 'completed',
      analyzed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    analysis.transcript || null,
    analysis.transcript_language || null,
    analysis.scenes_data || null,
    analysis.emotions_data || null,
    analysis.objects_data || null,
    analysis.hook_score || null,
    analysis.retention_score || null,
    analysis.clarity_score || null,
    analysis.cta_score || null,
    analysis.overall_score || null,
    analysis.recommendations || null,
    id
  ).run();
}

// ============ IDEA OPERATIONS ============

export async function createIdea(
  db: D1Database,
  userId: string,
  idea: {
    title: string;
    hook?: string;
    structure?: string;
    key_message?: string;
    target_audience?: string;
    viral_potential?: number;
    video_id?: string;
  }
): Promise<string> {
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO ideas (id, user_id, video_id, title, hook, structure, key_message, target_audience, viral_potential)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    userId,
    idea.video_id || null,
    idea.title,
    idea.hook || null,
    idea.structure || null,
    idea.key_message || null,
    idea.target_audience || null,
    idea.viral_potential || null
  ).run();
  
  return id;
}

export async function getIdeaById(db: D1Database, id: string): Promise<Idea | null> {
  const result = await db.prepare('SELECT * FROM ideas WHERE id = ?').bind(id).first<Idea>();
  return result || null;
}

export async function getUserIdeas(db: D1Database, userId: string, limit: number = 50): Promise<Idea[]> {
  const result = await db.prepare(`
    SELECT * FROM ideas WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `).bind(userId, limit).all<Idea>();
  
  return result.results || [];
}

export async function updateIdea(db: D1Database, id: string, data: Partial<Idea>): Promise<void> {
  const fields = Object.keys(data)
    .filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at')
    .map(k => `${k} = ?`);
  
  if (fields.length === 0) return;
  
  const values = Object.entries(data)
    .filter(([k]) => k !== 'id' && k !== 'user_id' && k !== 'created_at')
    .map(([_, v]) => v);
  
  await db.prepare(`
    UPDATE ideas SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(...values, id).run();
}

// ============ CHAT OPERATIONS ============

export async function saveChatMessage(
  db: D1Database,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  contextType?: string,
  contextId?: string
): Promise<string> {
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO chat_messages (id, user_id, role, content, context_type, context_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, userId, role, content, contextType || null, contextId || null).run();
  
  return id;
}

export async function getChatHistory(db: D1Database, userId: string, limit: number = 20): Promise<ChatMessage[]> {
  const result = await db.prepare(`
    SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `).bind(userId, limit).all<ChatMessage>();
  
  return (result.results || []).reverse();
}

// ============ KNOWLEDGE BASE ============

export async function searchKnowledgeBase(db: D1Database, query: string, limit: number = 3): Promise<KnowledgeBase[]> {
  // Simple keyword search (in production, use vector similarity)
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
  
  if (keywords.length === 0) {
    const result = await db.prepare('SELECT * FROM knowledge_base LIMIT ?').bind(limit).all<KnowledgeBase>();
    return result.results || [];
  }
  
  const conditions = keywords.map(() => `(LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)`).join(' OR ');
  const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`, `%${k}%`]);
  
  const result = await db.prepare(`
    SELECT * FROM knowledge_base WHERE ${conditions} LIMIT ?
  `).bind(...params, limit).all<KnowledgeBase>();
  
  return result.results || [];
}

export async function getAllKnowledgeBase(db: D1Database): Promise<KnowledgeBase[]> {
  const result = await db.prepare('SELECT * FROM knowledge_base').all<KnowledgeBase>();
  return result.results || [];
}

// ============ STORYTELLING STRUCTURES ============

export async function getStorytellingStructures(db: D1Database): Promise<StorytellingStructure[]> {
  const result = await db.prepare('SELECT * FROM storytelling_structures').all<StorytellingStructure>();
  return result.results || [];
}

export async function getStructureById(db: D1Database, id: string): Promise<StorytellingStructure | null> {
  const result = await db.prepare('SELECT * FROM storytelling_structures WHERE id = ?').bind(id).first<StorytellingStructure>();
  return result || null;
}

// ============ DASHBOARD STATS ============

export async function getUserStats(db: D1Database, userId: string): Promise<{
  total_videos: number;
  total_ideas: number;
  avg_score: number;
  videos_this_month: number;
}> {
  const [videos, ideas, avgScore, thisMonth] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM videos WHERE user_id = ?').bind(userId).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM ideas WHERE user_id = ?').bind(userId).first<{ count: number }>(),
    db.prepare('SELECT AVG(overall_score) as avg FROM videos WHERE user_id = ? AND overall_score IS NOT NULL').bind(userId).first<{ avg: number }>(),
    db.prepare(`SELECT COUNT(*) as count FROM videos WHERE user_id = ? AND created_at >= date('now', '-30 days')`).bind(userId).first<{ count: number }>()
  ]);
  
  return {
    total_videos: videos?.count || 0,
    total_ideas: ideas?.count || 0,
    avg_score: avgScore?.avg || 0,
    videos_this_month: thisMonth?.count || 0
  };
}
