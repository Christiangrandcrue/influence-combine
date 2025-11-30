// Video Analysis routes for Influence Combine

import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { createVideo, getVideoById, getUserVideos, updateVideo, updateVideoAnalysis, incrementUserUsage } from '../lib/db';
import { analyzeTranscript } from '../lib/openai';

const videos = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Upload video metadata (actual file goes to R2 or external service)
videos.post('/upload', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    // Check limits
    if (user.analyses_used >= user.analyses_limit) {
      return c.json({ 
        success: false, 
        error: 'Лимит анализов исчерпан',
        upgrade_required: true
      }, 403);
    }
    
    const { filename, file_size, duration_seconds, file_url } = await c.req.json<{
      filename: string;
      file_size?: number;
      duration_seconds?: number;
      file_url?: string;
    }>();
    
    if (!filename) {
      return c.json({ success: false, error: 'Имя файла обязательно' }, 400);
    }
    
    // Create video record
    const videoId = await createVideo(c.env.DB, user.id, filename);
    
    // Update with additional info
    if (file_size || duration_seconds || file_url) {
      await updateVideo(c.env.DB, videoId, {
        file_size,
        duration_seconds,
        file_url,
        status: 'uploading'
      });
    }
    
    return c.json({
      success: true,
      video_id: videoId,
      message: 'Видео создано, ожидает загрузки'
    });
  } catch (error) {
    console.error('Upload video error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get all user's videos
videos.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '20');
    
    let userVideos = await getUserVideos(c.env.DB, user.id, limit);
    
    if (status) {
      userVideos = userVideos.filter(v => v.status === status);
    }
    
    return c.json({
      success: true,
      videos: userVideos,
      total: userVideos.length
    });
  } catch (error) {
    console.error('Get videos error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get single video
videos.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const id = c.req.param('id');
    const video = await getVideoById(c.env.DB, id);
    
    if (!video) {
      return c.json({ success: false, error: 'Видео не найдено' }, 404);
    }
    
    if (video.user_id !== user.id) {
      return c.json({ success: false, error: 'Нет доступа' }, 403);
    }
    
    // Parse JSON fields
    const parsedVideo = {
      ...video,
      scenes_data: video.scenes_data ? JSON.parse(video.scenes_data) : null,
      emotions_data: video.emotions_data ? JSON.parse(video.emotions_data) : null,
      objects_data: video.objects_data ? JSON.parse(video.objects_data) : null,
      recommendations: video.recommendations ? JSON.parse(video.recommendations) : null
    };
    
    return c.json({ success: true, video: parsedVideo });
  } catch (error) {
    console.error('Get video error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Update video status (webhook from ML service)
videos.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, progress, error_message } = await c.req.json<{
      status?: string;
      progress?: number;
      error_message?: string;
    }>();
    
    await updateVideo(c.env.DB, id, {
      status: status as any,
      progress,
      error_message
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update status error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Start analysis (mock for now, would call external ML service)
videos.post('/:id/analyze', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const id = c.req.param('id');
    const video = await getVideoById(c.env.DB, id);
    
    if (!video) {
      return c.json({ success: false, error: 'Видео не найдено' }, 404);
    }
    
    if (video.user_id !== user.id) {
      return c.json({ success: false, error: 'Нет доступа' }, 403);
    }
    
    // Check limits
    if (user.analyses_used >= user.analyses_limit) {
      return c.json({ 
        success: false, 
        error: 'Лимит анализов исчерпан',
        upgrade_required: true
      }, 403);
    }
    
    // Update status to processing
    await updateVideo(c.env.DB, id, { 
      status: 'processing',
      progress: 0
    });
    
    // In production, this would call Modal.com or similar ML service
    // For now, generate mock analysis
    
    // Simulate async processing with mock data
    setTimeout(async () => {
      try {
        // Mock technical metrics
        const mockAnalysis = {
          transcript: 'Привет! Сегодня я расскажу вам о том, как создавать вирусный контент. Первое правило - это сильный хук в первые 3 секунды...',
          transcript_language: 'ru',
          scenes_data: JSON.stringify([
            { start_time: 0, end_time: 3, type: 'hook', has_face: true, has_text: true },
            { start_time: 3, end_time: 15, type: 'content', has_face: true, has_text: false },
            { start_time: 15, end_time: 25, type: 'content', has_face: true, has_text: true },
            { start_time: 25, end_time: 30, type: 'cta', has_face: true, has_text: true }
          ]),
          emotions_data: JSON.stringify([
            { timestamp: 0, emotion: 'surprise', confidence: 0.85 },
            { timestamp: 5, emotion: 'neutral', confidence: 0.72 },
            { timestamp: 15, emotion: 'happy', confidence: 0.78 },
            { timestamp: 25, emotion: 'excited', confidence: 0.81 }
          ]),
          hook_score: 72,
          retention_score: 65,
          clarity_score: 78,
          cta_score: 55,
          overall_score: 68,
          recommendations: JSON.stringify([
            {
              type: 'hook',
              priority: 'high',
              title: 'Усильте хук',
              description: 'Хук хороший, но можно добавить больше интриги или неожиданности',
              action: 'Попробуйте начать с провокационного вопроса или шокирующего факта'
            },
            {
              type: 'cta',
              priority: 'medium',
              title: 'Добавьте чёткий CTA',
              description: 'В конце видео нет явного призыва к действию',
              action: 'Добавьте конкретный CTA: подписка, комментарий или сохранение'
            },
            {
              type: 'retention',
              priority: 'medium',
              title: 'Увеличьте динамику',
              description: 'Между 10 и 20 секундой возможен провал удержания',
              action: 'Добавьте визуальное разнообразие или смените ракурс'
            }
          ])
        };
        
        await updateVideoAnalysis(c.env.DB, id, mockAnalysis);
        await incrementUserUsage(c.env.DB, user.id, 'analyses');
        
      } catch (err) {
        console.error('Mock analysis error:', err);
        await updateVideo(c.env.DB, id, { 
          status: 'failed',
          error_message: 'Ошибка анализа'
        });
      }
    }, 3000); // 3 second delay to simulate processing
    
    return c.json({
      success: true,
      message: 'Анализ запущен',
      video_id: id
    });
  } catch (error) {
    console.error('Start analysis error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Analyze transcript with AI
videos.post('/:id/analyze-transcript', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'OpenAI API не настроен' }, 500);
    }
    
    const id = c.req.param('id');
    const video = await getVideoById(c.env.DB, id);
    
    if (!video) {
      return c.json({ success: false, error: 'Видео не найдено' }, 404);
    }
    
    if (video.user_id !== user.id) {
      return c.json({ success: false, error: 'Нет доступа' }, 403);
    }
    
    if (!video.transcript) {
      return c.json({ success: false, error: 'Транскрипт не найден' }, 400);
    }
    
    const analysis = await analyzeTranscript(
      apiKey,
      video.transcript,
      video.transcript_language || 'ru'
    );
    
    return c.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Analyze transcript error:', error);
    return c.json({ success: false, error: 'Ошибка анализа' }, 500);
  }
});

// Delete video
videos.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const id = c.req.param('id');
    const video = await getVideoById(c.env.DB, id);
    
    if (!video) {
      return c.json({ success: false, error: 'Видео не найдено' }, 404);
    }
    
    if (video.user_id !== user.id) {
      return c.json({ success: false, error: 'Нет доступа' }, 403);
    }
    
    await c.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(id).run();
    
    return c.json({ success: true, message: 'Видео удалено' });
  } catch (error) {
    console.error('Delete video error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

export default videos;
