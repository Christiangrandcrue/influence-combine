// Video Analysis routes for Influence Combine
// AI-powered video analysis with real file upload, transcription, and vision analysis

import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { createVideo, getVideoById, getUserVideos, updateVideo, incrementUserUsage } from '../lib/db';
import { chatCompletion, transcribeAudio, analyzeVideoFrames } from '../lib/openai';

const videos = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Helper: Generate unique ID
function generateId(): string {
  return crypto.randomUUID();
}

// Helper: Extract frames from video as base64 (simplified - uses first frame from uploaded data)
// In production, this would use a video processing service
async function extractFrameFromBlob(videoBlob: Blob, timestamp: number = 0): Promise<string | null> {
  // For Cloudflare Workers, we can't process video directly
  // We'll rely on the video being analyzed via GPT-4o Vision with the video URL
  // or request the client to send frame screenshots
  return null;
}

// ==================== UPLOAD ENDPOINTS ====================

// Upload video file directly to R2
videos.post('/upload-file', async (c) => {
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
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return c.json({ success: false, error: 'Файл не найден' }, 400);
    }
    
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ success: false, error: 'Неподдерживаемый формат видео. Используйте MP4, MOV или WebM' }, 400);
    }
    
    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ success: false, error: 'Файл слишком большой. Максимум 100MB' }, 400);
    }
    
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'mp4';
    const videoId = generateId();
    const r2Key = `videos/${user.id}/${videoId}.${ext}`;
    
    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      },
      customMetadata: {
        userId: user.id,
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    });
    
    // Create video record in DB
    await c.env.DB.prepare(`
      INSERT INTO videos (id, user_id, filename, file_url, file_size, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'uploaded', datetime('now'), datetime('now'))
    `).bind(videoId, user.id, file.name, r2Key, file.size).run();
    
    return c.json({
      success: true,
      video_id: videoId,
      file_url: r2Key,
      message: 'Видео загружено'
    });
  } catch (error: any) {
    console.error('Upload file error:', error);
    return c.json({ success: false, error: 'Ошибка загрузки', details: error?.message }, 500);
  }
});

// Upload video metadata (for URL-based videos)
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
    
    const body = await c.req.json<{
      filename: string;
      file_url?: string;
      duration_seconds?: number;
      description?: string;
      transcript?: string;
    }>();
    
    if (!body.filename) {
      return c.json({ success: false, error: 'Имя файла обязательно' }, 400);
    }
    
    // Create video record
    const videoId = await createVideo(c.env.DB, user.id, body.filename);
    
    // Update with additional info
    await updateVideo(c.env.DB, videoId, {
      file_url: body.file_url,
      duration_seconds: body.duration_seconds,
      transcript: body.description || body.transcript,
      status: 'pending'
    });
    
    return c.json({
      success: true,
      video_id: videoId,
      message: 'Видео добавлено'
    });
  } catch (error) {
    console.error('Upload video error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Upload frames for analysis (client extracts and sends frames)
videos.post('/:id/upload-frames', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const id = c.req.param('id');
    const video = await getVideoById(c.env.DB, id);
    
    if (!video || video.user_id !== user.id) {
      return c.json({ success: false, error: 'Видео не найдено' }, 404);
    }
    
    const formData = await c.req.formData();
    const frames: string[] = [];
    
    // Process uploaded frames
    for (let i = 0; i < 10; i++) {
      const frame = formData.get(`frame_${i}`) as File | null;
      if (frame) {
        const arrayBuffer = await frame.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        frames.push(`data:${frame.type};base64,${base64}`);
      }
    }
    
    // Also accept base64 strings directly
    const framesJson = formData.get('frames') as string | null;
    if (framesJson) {
      try {
        const parsedFrames = JSON.parse(framesJson);
        frames.push(...parsedFrames);
      } catch {}
    }
    
    if (frames.length === 0) {
      return c.json({ success: false, error: 'Кадры не найдены' }, 400);
    }
    
    // Store frames reference in video record
    await c.env.DB.prepare(`
      UPDATE videos SET 
        scenes_data = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(JSON.stringify({ frames }), id).run();
    
    return c.json({
      success: true,
      frames_count: frames.length,
      message: 'Кадры загружены'
    });
  } catch (error: any) {
    console.error('Upload frames error:', error);
    return c.json({ success: false, error: 'Ошибка загрузки кадров', details: error?.message }, 500);
  }
});

// Upload audio for transcription
videos.post('/:id/upload-audio', async (c) => {
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
    
    if (!video || video.user_id !== user.id) {
      return c.json({ success: false, error: 'Видео не найдено' }, 404);
    }
    
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    
    if (!audioFile) {
      return c.json({ success: false, error: 'Аудио файл не найден' }, 400);
    }
    
    // Validate file size (25MB max for Whisper)
    if (audioFile.size > 25 * 1024 * 1024) {
      return c.json({ success: false, error: 'Аудио файл слишком большой. Максимум 25MB' }, 400);
    }
    
    // Update status
    await updateVideo(c.env.DB, id, { status: 'processing', progress: 20 });
    
    // Transcribe with Whisper
    const audioBuffer = await audioFile.arrayBuffer();
    const transcription = await transcribeAudio(apiKey, audioBuffer, audioFile.name, {
      response_format: 'verbose_json'
    });
    
    // Save transcription
    await c.env.DB.prepare(`
      UPDATE videos SET 
        transcript = ?,
        transcript_language = ?,
        duration_seconds = ?,
        progress = 50,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      transcription.text,
      transcription.language || 'ru',
      transcription.duration || null,
      id
    ).run();
    
    return c.json({
      success: true,
      transcript: transcription.text,
      language: transcription.language,
      duration: transcription.duration,
      message: 'Транскрипция завершена'
    });
  } catch (error: any) {
    console.error('Upload audio error:', error);
    return c.json({ success: false, error: 'Ошибка транскрипции', details: error?.message }, 500);
  }
});

// ==================== ANALYSIS ENDPOINTS ====================

// Full AI Video Analysis with Vision + Transcription
videos.post('/:id/analyze-full', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'OpenAI API не настроен' }, 500);
    }
    
    // Check limits
    if (user.analyses_used >= user.analyses_limit) {
      return c.json({ 
        success: false, 
        error: 'Лимит анализов исчерпан',
        upgrade_required: true
      }, 403);
    }
    
    const id = c.req.param('id');
    const video = await getVideoById(c.env.DB, id) as any;
    
    if (!video || video.user_id !== user.id) {
      return c.json({ success: false, error: 'Видео не найдено' }, 404);
    }
    
    // Get request body with optional frames and context
    const body = await c.req.json<{
      frames?: string[];           // Base64 frames from client
      hookFrames?: string[];       // First 3 sec frames
      middleFrames?: string[];     // Middle frames
      endFrames?: string[];        // Last 3 sec frames
      transcript?: string;         // Manual or auto transcript
      duration?: number;
      topic?: string;
      hashtags?: string[];
    }>().catch(() => ({}));
    
    // Update status
    await updateVideo(c.env.DB, id, { status: 'analyzing', progress: 10 });
    
    // Get stored frames if available
    let framesData: any = null;
    if (video.scenes_data) {
      try {
        framesData = JSON.parse(video.scenes_data);
      } catch {}
    }
    
    // Determine which frames to use
    const frames = body.frames || framesData?.frames || [];
    const hookFrames = body.hookFrames || frames.slice(0, 3);
    const middleFrames = body.middleFrames || frames.slice(3, 6);
    const endFrames = body.endFrames || frames.slice(-3);
    
    // Get channel data for context
    const channelData = await c.env.DB.prepare(`
      SELECT * FROM channels WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(user.id).first() as any;
    
    let visualAnalysis = null;
    let combinedAnalysis: any = null;
    
    // Step 1: Vision Analysis (if frames available)
    if (hookFrames.length > 0 || middleFrames.length > 0 || endFrames.length > 0) {
      await updateVideo(c.env.DB, id, { progress: 30 });
      
      try {
        visualAnalysis = await analyzeVideoFrames(apiKey, {
          hookFrames,
          middleFrames,
          endFrames
        }, {
          duration: body.duration || video.duration_seconds,
          transcript: body.transcript || video.transcript,
          niche: channelData?.niche || user.niche
        });
      } catch (visionError: any) {
        console.error('Vision analysis error:', visionError);
        // Continue without vision analysis
      }
    }
    
    await updateVideo(c.env.DB, id, { progress: 60 });
    
    // Step 2: Combined Analysis with GPT-4o
    const analysisPrompt = `Ты — AI-эксперт по анализу Instagram Reels с опытом 10,000+ проанализированных видео.

ДАННЫЕ ВИДЕО:
- Название: ${video.filename}
- Длительность: ${body.duration || video.duration_seconds || 30} секунд
- Транскрипт: ${body.transcript || video.transcript || 'не указан'}
- Тема: ${body.topic || 'не указана'}
- Хэштеги: ${body.hashtags?.join(', ') || 'не указаны'}

${visualAnalysis ? `
ВИЗУАЛЬНЫЙ АНАЛИЗ (GPT-4o Vision):
- Hook Score: ${visualAnalysis.visual_analysis?.hook?.score || 'N/A'}
- Content Score: ${visualAnalysis.visual_analysis?.content?.score || 'N/A'}
- CTA Score: ${visualAnalysis.visual_analysis?.cta?.score || 'N/A'}
- Лицо в кадре: ${visualAnalysis.visual_analysis?.hook?.has_face ? 'Да' : 'Нет'}
- Текст на экране: ${visualAnalysis.visual_analysis?.hook?.has_text_overlay ? 'Да' : 'Нет'}
- Visual Quality: ${visualAnalysis.visual_analysis?.content?.visual_quality || 'N/A'}
` : 'Визуальный анализ недоступен (кадры не загружены)'}

ДАННЫЕ КАНАЛА:
- Подписчики: ${channelData?.followers?.toLocaleString() || 'неизвестно'}
- Средние просмотры: ${channelData?.avg_views?.toLocaleString() || 'неизвестно'}
- ER: ${channelData?.engagement_rate?.toFixed(2) || 'неизвестно'}%
- Ниша: ${channelData?.niche || user.niche || 'не указана'}

ЗАДАЧА: Провести РЕАЛЬНЫЙ анализ на основе предоставленных данных. Будь честен в оценках.
${!visualAnalysis ? 'ВАЖНО: Без кадров анализ менее точный. Укажи это в вердикте.' : ''}

ФОРМАТ ОТВЕТА (JSON):
{
  "overall_score": 68,
  "verdict": "Краткий вердикт в 1-2 предложениях. ${!visualAnalysis ? 'Отметь, что без видеокадров анализ основан только на описании.' : ''}",
  "analysis_type": "${visualAnalysis ? 'full_video' : 'text_only'}",
  
  "scores": {
    "hook": {
      "score": ${visualAnalysis?.visual_analysis?.hook?.score || 'оцени на основе транскрипта'},
      "max": 100,
      "analysis": "Детальный анализ хука",
      "strengths": [],
      "weaknesses": []
    },
    "retention": {
      "score": 65,
      "max": 100,
      "analysis": "Анализ удержания внимания",
      "drop_off_points": [],
      "strengths": [],
      "weaknesses": []
    },
    "content": {
      "score": ${visualAnalysis?.visual_analysis?.content?.score || 'оцени на основе транскрипта'},
      "max": 100,
      "analysis": "Анализ качества контента",
      "strengths": [],
      "weaknesses": []
    },
    "cta": {
      "score": ${visualAnalysis?.visual_analysis?.cta?.score || 'оцени на основе транскрипта'},
      "max": 100,
      "analysis": "Анализ призыва к действию",
      "strengths": [],
      "weaknesses": []
    },
    "virality": {
      "score": 60,
      "max": 100,
      "analysis": "Потенциал виральности",
      "factors_positive": [],
      "factors_negative": []
    }
  },
  
  "recommendations": [
    {
      "id": "rec_1",
      "priority": "high",
      "category": "hook | retention | content | cta | technical",
      "title": "Название",
      "problem": "Проблема",
      "solution": "Решение",
      "example": "Пример",
      "impact": {
        "metric": "views",
        "current": 100,
        "potential": 150,
        "change_percent": 50
      },
      "effort": "easy | medium | hard",
      "time_to_implement": "5 минут"
    }
  ],
  
  "prediction_current": {
    "views": { "min": 5000, "likely": 12000, "max": 30000 },
    "likes": { "min": 200, "likely": 500, "max": 1200 },
    "comments": { "min": 10, "likely": 30, "max": 80 },
    "shares": { "min": 5, "likely": 15, "max": 40 },
    "saves": { "min": 20, "likely": 60, "max": 150 },
    "engagement_rate": 4.2,
    "viral_probability": 0.08,
    "confidence": ${visualAnalysis ? 0.85 : 0.6}
  },
  
  "prediction_improved": {
    "views": { "min": 15000, "likely": 35000, "max": 80000 },
    "likes": { "min": 600, "likely": 1400, "max": 3200 },
    "comments": { "min": 30, "likely": 85, "max": 200 },
    "shares": { "min": 15, "likely": 45, "max": 100 },
    "saves": { "min": 60, "likely": 180, "max": 400 },
    "engagement_rate": 6.8,
    "viral_probability": 0.25,
    "confidence": ${visualAnalysis ? 0.75 : 0.5},
    "improvement_summary": "При выполнении рекомендаций ожидается рост просмотров на ~190%"
  },
  
  "quick_wins": [],
  "best_posting_time": "Вторник 19:00 или Четверг 20:00",
  "suggested_hashtags": [],
  "suggested_hook_alternatives": []
}`;

    const response = await chatCompletion(apiKey, [
      { role: 'system', content: analysisPrompt },
      { role: 'user', content: 'Проведи полный анализ этого видео.' }
    ], {
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    try {
      combinedAnalysis = JSON.parse(response);
    } catch {
      console.error('Failed to parse analysis:', response);
      await updateVideo(c.env.DB, id, { status: 'failed', error_message: 'Ошибка парсинга анализа' });
      return c.json({ success: false, error: 'Ошибка парсинга анализа' }, 500);
    }

    // Merge visual analysis recommendations if available
    if (visualAnalysis?.recommendations) {
      combinedAnalysis.recommendations = [
        ...combinedAnalysis.recommendations,
        ...visualAnalysis.recommendations.map((r: any) => ({
          id: `vis_${Math.random().toString(36).substr(2, 9)}`,
          priority: r.priority,
          category: r.category,
          title: r.suggestion,
          problem: r.issue,
          solution: r.suggestion,
          effort: 'medium',
          time_to_implement: 'varies'
        }))
      ];
    }

    // Save analysis to database
    await c.env.DB.prepare(`
      UPDATE videos SET
        status = 'completed',
        progress = 100,
        overall_score = ?,
        hook_score = ?,
        retention_score = ?,
        clarity_score = ?,
        cta_score = ?,
        recommendations = ?,
        prediction_current = ?,
        prediction_improved = ?,
        analysis_verdict = ?,
        emotions_data = ?,
        analyzed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      combinedAnalysis.overall_score,
      combinedAnalysis.scores?.hook?.score || null,
      combinedAnalysis.scores?.retention?.score || null,
      combinedAnalysis.scores?.content?.score || null,
      combinedAnalysis.scores?.cta?.score || null,
      JSON.stringify(combinedAnalysis.recommendations || []),
      JSON.stringify(combinedAnalysis.prediction_current || {}),
      JSON.stringify(combinedAnalysis.prediction_improved || {}),
      combinedAnalysis.verdict || null,
      visualAnalysis ? JSON.stringify(visualAnalysis) : null,
      id
    ).run();

    // Increment usage
    await incrementUserUsage(c.env.DB, user.id, 'analyses');

    return c.json({
      success: true,
      analysis: combinedAnalysis,
      visual_analysis: visualAnalysis,
      analysis_type: visualAnalysis ? 'full_video' : 'text_only',
      video_id: id
    });
  } catch (error: any) {
    console.error('Full analyze error:', error);
    return c.json({ success: false, error: 'Ошибка анализа', details: error?.message }, 500);
  }
});

// Simple analysis (text-based, for backward compatibility)
videos.post('/:id/analyze', async (c) => {
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
    const video = await getVideoById(c.env.DB, id) as any;
    
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
    
    const body = await c.req.json<{
      description?: string;
      transcript?: string;
      hook?: string;
      duration?: number;
      topic?: string;
      hashtags?: string[];
    }>().catch(() => ({}));
    
    if (body.description || body.transcript) {
      await updateVideo(c.env.DB, id, {
        transcript: body.transcript || body.description
      });
    }
    
    await updateVideo(c.env.DB, id, { status: 'analyzing', progress: 10 });
    
    const channelData = await c.env.DB.prepare(`
      SELECT * FROM channels WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(user.id).first() as any;
    
    const analysisPrompt = `Ты — AI-эксперт по анализу Instagram Reels с опытом 10,000+ проанализированных видео.

ДАННЫЕ ВИДЕО:
- Название: ${video.filename}
- Длительность: ${body.duration || video.duration_seconds || 30} секунд
- Описание/Транскрипт: ${body.description || body.transcript || video.transcript || 'не указано'}
- Хук (первые 3 сек): ${body.hook || 'не указан'}
- Тема: ${body.topic || 'не указана'}
- Хэштеги: ${body.hashtags?.join(', ') || 'не указаны'}

ДАННЫЕ КАНАЛА (если есть):
- Подписчики: ${channelData?.followers?.toLocaleString() || 'неизвестно'}
- Средние просмотры: ${channelData?.avg_views?.toLocaleString() || 'неизвестно'}
- ER: ${channelData?.engagement_rate?.toFixed(2) || 'неизвестно'}%
- Ниша: ${channelData?.niche || user.niche || 'не указана'}

ВАЖНО: Анализ основан только на текстовом описании. Для более точного анализа рекомендуется загрузить видеофайл.

ФОРМАТ ОТВЕТА (JSON):
{
  "overall_score": 68,
  "verdict": "Краткий вердикт. Отметь, что анализ основан на описании без просмотра видео.",
  "analysis_type": "text_only",
  
  "scores": {
    "hook": { "score": 72, "max": 100, "analysis": "Анализ хука", "strengths": [], "weaknesses": [] },
    "retention": { "score": 65, "max": 100, "analysis": "Анализ удержания", "drop_off_points": [], "strengths": [], "weaknesses": [] },
    "content": { "score": 78, "max": 100, "analysis": "Анализ контента", "strengths": [], "weaknesses": [] },
    "cta": { "score": 55, "max": 100, "analysis": "Анализ CTA", "strengths": [], "weaknesses": [] },
    "virality": { "score": 60, "max": 100, "analysis": "Потенциал виральности", "factors_positive": [], "factors_negative": [] }
  },
  
  "recommendations": [
    {
      "id": "rec_1",
      "priority": "high",
      "category": "hook",
      "title": "Название",
      "problem": "Проблема",
      "solution": "Решение",
      "example": "Пример",
      "impact": { "metric": "hook_score", "current": 72, "potential": 85, "change_percent": 18 },
      "effort": "easy",
      "time_to_implement": "5 минут"
    }
  ],
  
  "prediction_current": {
    "views": { "min": 5000, "likely": 12000, "max": 30000 },
    "likes": { "min": 200, "likely": 500, "max": 1200 },
    "comments": { "min": 10, "likely": 30, "max": 80 },
    "shares": { "min": 5, "likely": 15, "max": 40 },
    "saves": { "min": 20, "likely": 60, "max": 150 },
    "engagement_rate": 4.2,
    "viral_probability": 0.08,
    "confidence": 0.6
  },
  
  "prediction_improved": {
    "views": { "min": 15000, "likely": 35000, "max": 80000 },
    "likes": { "min": 600, "likely": 1400, "max": 3200 },
    "comments": { "min": 30, "likely": 85, "max": 200 },
    "shares": { "min": 15, "likely": 45, "max": 100 },
    "saves": { "min": 60, "likely": 180, "max": 400 },
    "engagement_rate": 6.8,
    "viral_probability": 0.25,
    "confidence": 0.5,
    "improvement_summary": "При выполнении рекомендаций ожидается рост просмотров на ~190%"
  },
  
  "quick_wins": [],
  "best_posting_time": "Вторник 19:00",
  "suggested_hashtags": [],
  "suggested_hook_alternatives": []
}`;

    const response = await chatCompletion(apiKey, [
      { role: 'system', content: analysisPrompt },
      { role: 'user', content: 'Проведи полный анализ этого видео.' }
    ], {
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    let analysis;
    try {
      analysis = JSON.parse(response);
    } catch {
      console.error('Failed to parse analysis:', response);
      await updateVideo(c.env.DB, id, { status: 'failed', error_message: 'Ошибка парсинга анализа' });
      return c.json({ success: false, error: 'Ошибка парсинга анализа' }, 500);
    }

    await c.env.DB.prepare(`
      UPDATE videos SET
        status = 'completed',
        progress = 100,
        overall_score = ?,
        hook_score = ?,
        retention_score = ?,
        clarity_score = ?,
        cta_score = ?,
        recommendations = ?,
        prediction_current = ?,
        prediction_improved = ?,
        analysis_verdict = ?,
        analyzed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      analysis.overall_score,
      analysis.scores?.hook?.score || null,
      analysis.scores?.retention?.score || null,
      analysis.scores?.content?.score || null,
      analysis.scores?.cta?.score || null,
      JSON.stringify(analysis.recommendations || []),
      JSON.stringify(analysis.prediction_current || {}),
      JSON.stringify(analysis.prediction_improved || {}),
      analysis.verdict || null,
      id
    ).run();

    await incrementUserUsage(c.env.DB, user.id, 'analyses');

    return c.json({
      success: true,
      analysis,
      video_id: id
    });
  } catch (error: any) {
    console.error('Analyze video error:', error);
    return c.json({ success: false, error: 'Ошибка анализа', details: error?.message }, 500);
  }
});

// ==================== READ/DELETE ENDPOINTS ====================

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
    
    const parsedVideos = userVideos.map((v: any) => ({
      ...v,
      recommendations: v.recommendations ? JSON.parse(v.recommendations) : null,
      prediction_current: v.prediction_current ? JSON.parse(v.prediction_current) : null,
      prediction_improved: v.prediction_improved ? JSON.parse(v.prediction_improved) : null
    }));
    
    return c.json({
      success: true,
      videos: parsedVideos,
      total: parsedVideos.length
    });
  } catch (error) {
    console.error('Get videos error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

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
    
    const parsedVideo = {
      ...video,
      scenes_data: video.scenes_data ? JSON.parse(video.scenes_data) : null,
      emotions_data: video.emotions_data ? JSON.parse(video.emotions_data) : null,
      recommendations: video.recommendations ? JSON.parse(video.recommendations) : null,
      prediction_current: video.prediction_current ? JSON.parse(video.prediction_current) : null,
      prediction_improved: video.prediction_improved ? JSON.parse(video.prediction_improved) : null
    };
    
    return c.json({ success: true, video: parsedVideo });
  } catch (error) {
    console.error('Get video error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

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
    
    // Delete from R2 if stored there
    if (video.file_url?.startsWith('videos/')) {
      try {
        await c.env.R2.delete(video.file_url);
      } catch (r2Error) {
        console.error('R2 delete error:', r2Error);
      }
    }
    
    await c.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(id).run();
    
    return c.json({ success: true, message: 'Видео удалено' });
  } catch (error) {
    console.error('Delete video error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

export default videos;
