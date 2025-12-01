// Instagram Channel Analysis routes
// Analyze user's Instagram channel and predict video performance

import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { chatCompletion } from '../lib/openai';
import { scrapeInstagramProfile } from '../lib/apify';

const channel = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Types
interface ChannelData {
  username: string;
  followers: number;
  following: number;
  posts_count: number;
  bio?: string;
  avg_likes?: number;
  avg_comments?: number;
  avg_views?: number;
  engagement_rate?: number;
  niche?: string;
  content_frequency?: string; // posts per week
  recent_reels?: ReelData[];
}

interface ReelData {
  views?: number;
  likes?: number;
  comments?: number;
  duration?: number;
  caption?: string;
  hashtags?: string[];
  posted_at?: string;
}

interface ViralityPrediction {
  score: number; // 1-100
  confidence: number; // 0-1
  predicted_views: {
    min: number;
    max: number;
    likely: number;
  };
  predicted_likes: {
    min: number;
    max: number;
    likely: number;
  };
  viral_probability: number; // chance to go viral (>1M views)
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    score: number;
    suggestion?: string;
  }[];
}

interface ChannelAnalysis {
  channel: ChannelData;
  health_score: number;
  growth_potential: number;
  content_quality_score: number;
  engagement_analysis: {
    rate: number;
    trend: 'growing' | 'stable' | 'declining';
    benchmark_comparison: 'above' | 'average' | 'below';
  };
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    expected_impact: string;
  }[];
  best_posting_times: string[];
  content_mix_suggestion: {
    type: string;
    percentage: number;
  }[];
}

// Connect/Add Instagram channel - AUTO SCRAPE with Apify
channel.post('/connect', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const body = await c.req.json<{
      username: string;
      // Optional: skip auto-scrape and use manual stats
      skip_scrape?: boolean;
      manual_stats?: {
        followers?: number;
        avg_views?: number;
        avg_likes?: number;
        avg_comments?: number;
        posts_count?: number;
        niche?: string;
      };
    }>();

    const { username, skip_scrape, manual_stats } = body;

    if (!username) {
      return c.json({ success: false, error: 'Username обязателен' }, 400);
    }

    // Clean username
    const cleanUsername = username.replace('@', '').trim().toLowerCase();
    const channelId = crypto.randomUUID();
    
    // Check if Apify token is available and scraping not skipped
    const apifyToken = c.env.APIFY_API_TOKEN;
    let scrapedData = null;
    let scrapeError = null;

    if (apifyToken && !skip_scrape) {
      try {
        console.log(`[Channel] Auto-scraping @${cleanUsername} via Apify...`);
        scrapedData = await scrapeInstagramProfile(apifyToken, cleanUsername);
        console.log(`[Channel] Scraped: ${scrapedData.followers} followers, ER: ${scrapedData.engagementRate}%`);
      } catch (err: any) {
        console.error('[Channel] Scrape failed:', err.message);
        scrapeError = err.message;
      }
    }

    // Use scraped data or manual stats
    const channelData = scrapedData ? {
      followers: scrapedData.followers,
      following: scrapedData.following,
      posts_count: scrapedData.postsCount,
      avg_views: scrapedData.avgViews || null,
      avg_likes: scrapedData.avgLikes,
      avg_comments: scrapedData.avgComments,
      engagement_rate: scrapedData.engagementRate,
      bio: scrapedData.bio,
      profile_pic_url: scrapedData.profilePicUrl,
      is_verified: scrapedData.isVerified ? 1 : 0,
      is_business: scrapedData.isBusiness ? 1 : 0,
      full_name: scrapedData.fullName,
      external_url: scrapedData.externalUrl,
      recent_posts: JSON.stringify(scrapedData.recentPosts),
      status: 'active',
      connection_type: 'apify',
    } : {
      followers: manual_stats?.followers || null,
      following: null,
      posts_count: manual_stats?.posts_count || null,
      avg_views: manual_stats?.avg_views || null,
      avg_likes: manual_stats?.avg_likes || null,
      avg_comments: manual_stats?.avg_comments || null,
      engagement_rate: null,
      bio: null,
      profile_pic_url: null,
      is_verified: 0,
      is_business: 0,
      full_name: null,
      external_url: null,
      recent_posts: null,
      status: 'pending',
      connection_type: 'manual',
    };

    // Save to database
    await c.env.DB.prepare(`
      INSERT INTO channels (
        id, user_id, username, followers, following, posts_count, 
        avg_views, avg_likes, avg_comments, engagement_rate,
        bio, profile_pic_url, is_verified, is_business,
        niche, status, connection_type, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      channelId,
      user.id,
      cleanUsername,
      channelData.followers,
      channelData.following,
      channelData.posts_count,
      channelData.avg_views,
      channelData.avg_likes,
      channelData.avg_comments,
      channelData.engagement_rate,
      channelData.bio,
      channelData.profile_pic_url,
      channelData.is_verified,
      channelData.is_business,
      manual_stats?.niche || null,
      channelData.status,
      channelData.connection_type
    ).run();

    // Save recent posts to reels table if available
    if (scrapedData?.recentPosts) {
      for (const post of scrapedData.recentPosts.slice(0, 12)) {
        try {
          await c.env.DB.prepare(`
            INSERT INTO reels (id, channel_id, caption, hashtags, views, likes, comments, posted_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            crypto.randomUUID(),
            channelId,
            post.caption?.substring(0, 500) || null,
            JSON.stringify(post.hashtags || []),
            post.views || null,
            post.likes,
            post.comments,
            post.timestamp || null
          ).run();
        } catch (e) {
          // Ignore individual post save errors
        }
      }
    }

    // Build response
    const response: any = {
      success: true,
      channel: {
        id: channelId,
        username: cleanUsername,
        status: channelData.status,
        connection_type: channelData.connection_type,
      }
    };

    if (scrapedData) {
      response.channel = {
        ...response.channel,
        fullName: scrapedData.fullName,
        bio: scrapedData.bio,
        profilePicUrl: scrapedData.profilePicUrl,
        followers: scrapedData.followers,
        following: scrapedData.following,
        postsCount: scrapedData.postsCount,
        avgLikes: scrapedData.avgLikes,
        avgComments: scrapedData.avgComments,
        avgViews: scrapedData.avgViews,
        engagementRate: scrapedData.engagementRate,
        isVerified: scrapedData.isVerified,
        isBusiness: scrapedData.isBusiness,
        recentPostsCount: scrapedData.recentPosts?.length || 0,
      };
      response.message = `Канал @${cleanUsername} подключен! Получено ${scrapedData.followers.toLocaleString()} подписчиков, ${scrapedData.recentPosts?.length || 0} постов.`;
    } else {
      response.message = scrapeError 
        ? `Канал добавлен, но автоматический сбор данных не удался: ${scrapeError}. Заполните статистику вручную.`
        : 'Канал добавлен. Заполните статистику вручную.';
      if (scrapeError) {
        response.scrape_error = scrapeError;
      }
    }

    return c.json(response);
  } catch (error: any) {
    console.error('Connect channel error:', error);
    return c.json({ success: false, error: 'Ошибка подключения канала', details: error?.message }, 500);
  }
});

// Update channel stats manually
channel.patch('/:id/stats', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const channelId = c.req.param('id');
    const stats = await c.req.json<{
      followers?: number;
      following?: number;
      posts_count?: number;
      avg_views?: number;
      avg_likes?: number;
      avg_comments?: number;
      engagement_rate?: number;
      niche?: string;
      bio?: string;
    }>();

    // Verify ownership
    const channelResult = await c.env.DB.prepare(
      'SELECT * FROM channels WHERE id = ? AND user_id = ?'
    ).bind(channelId, user.id).first();

    if (!channelResult) {
      return c.json({ success: false, error: 'Канал не найден' }, 404);
    }

    // Calculate engagement rate if not provided
    let engagementRate = stats.engagement_rate;
    if (!engagementRate && stats.followers && (stats.avg_likes || stats.avg_comments)) {
      const avgEngagement = (stats.avg_likes || 0) + (stats.avg_comments || 0);
      engagementRate = (avgEngagement / stats.followers) * 100;
    }

    // Update stats
    await c.env.DB.prepare(`
      UPDATE channels SET
        followers = COALESCE(?, followers),
        following = COALESCE(?, following),
        posts_count = COALESCE(?, posts_count),
        avg_views = COALESCE(?, avg_views),
        avg_likes = COALESCE(?, avg_likes),
        avg_comments = COALESCE(?, avg_comments),
        engagement_rate = COALESCE(?, engagement_rate),
        niche = COALESCE(?, niche),
        bio = COALESCE(?, bio),
        status = 'active',
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      stats.followers || null,
      stats.following || null,
      stats.posts_count || null,
      stats.avg_views || null,
      stats.avg_likes || null,
      stats.avg_comments || null,
      engagementRate || null,
      stats.niche || null,
      stats.bio || null,
      channelId
    ).run();

    const updatedChannel = await c.env.DB.prepare(
      'SELECT * FROM channels WHERE id = ?'
    ).bind(channelId).first();

    return c.json({
      success: true,
      channel: updatedChannel
    });
  } catch (error: any) {
    console.error('Update channel stats error:', error);
    return c.json({ success: false, error: 'Ошибка обновления статистики' }, 500);
  }
});

// Get channel info
channel.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const channels = await c.env.DB.prepare(
      'SELECT * FROM channels WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();

    return c.json({
      success: true,
      channels: channels.results || []
    });
  } catch (error: any) {
    console.error('Get channels error:', error);
    return c.json({ success: false, error: 'Ошибка получения каналов' }, 500);
  }
});

// Analyze channel and get recommendations
channel.post('/:id/analyze', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'OpenAI API не настроен' }, 500);
    }

    const channelId = c.req.param('id');

    // Get channel data
    const channelData = await c.env.DB.prepare(
      'SELECT * FROM channels WHERE id = ? AND user_id = ?'
    ).bind(channelId, user.id).first() as any;

    if (!channelData) {
      return c.json({ success: false, error: 'Канал не найден' }, 404);
    }

    // Check if we have enough data
    if (!channelData.followers) {
      return c.json({ 
        success: false, 
        error: 'Недостаточно данных для анализа. Пожалуйста, заполните статистику канала.' 
      }, 400);
    }

    // GPT-4o Channel Analysis
    const analysisPrompt = `Ты — эксперт-аналитик Instagram Reels с опытом работы с 1000+ аккаунтов.

ДАННЫЕ КАНАЛА @${channelData.username}:
- Подписчики: ${channelData.followers?.toLocaleString() || 'не указано'}
- Подписки: ${channelData.following?.toLocaleString() || 'не указано'}
- Постов: ${channelData.posts_count || 'не указано'}
- Средние просмотры: ${channelData.avg_views?.toLocaleString() || 'не указано'}
- Средние лайки: ${channelData.avg_likes?.toLocaleString() || 'не указано'}
- Средние комментарии: ${channelData.avg_comments?.toLocaleString() || 'не указано'}
- Engagement Rate: ${channelData.engagement_rate?.toFixed(2) || 'не указано'}%
- Ниша: ${channelData.niche || 'не указана'}
- Bio: ${channelData.bio || 'не указано'}

ЗАДАЧА: Провести глубокий анализ канала и дать actionable рекомендации.

ФОРМАТ ОТВЕТА (JSON):
{
  "health_score": 75,
  "growth_potential": "high | medium | low",
  "growth_potential_score": 80,
  "content_quality_score": 70,
  "engagement_analysis": {
    "rate": 3.5,
    "trend": "growing | stable | declining",
    "benchmark_comparison": "above | average | below",
    "benchmark_note": "Средний ER в нише X составляет Y%"
  },
  "strengths": [
    "Сильная сторона 1",
    "Сильная сторона 2"
  ],
  "weaknesses": [
    "Слабая сторона 1",
    "Слабая сторона 2"
  ],
  "opportunities": [
    "Возможность 1",
    "Возможность 2"
  ],
  "threats": [
    "Угроза 1"
  ],
  "recommendations": [
    {
      "priority": "high",
      "category": "content | engagement | growth | monetization",
      "title": "Название рекомендации",
      "description": "Детальное описание что делать",
      "expected_impact": "Ожидаемый результат"
    }
  ],
  "best_posting_times": ["19:00-21:00", "12:00-14:00"],
  "content_mix_suggestion": [
    {"type": "Образовательный", "percentage": 40},
    {"type": "Развлекательный", "percentage": 30},
    {"type": "Личный", "percentage": 20},
    {"type": "Промо", "percentage": 10}
  ],
  "viral_potential_tips": [
    "Совет для увеличения виральности 1",
    "Совет 2"
  ]
}`;

    const response = await chatCompletion(apiKey, [
      { role: 'system', content: analysisPrompt },
      { role: 'user', content: 'Проведи полный анализ этого канала.' }
    ], {
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    let analysis;
    try {
      analysis = JSON.parse(response);
    } catch {
      console.error('Failed to parse analysis:', response);
      return c.json({ success: false, error: 'Ошибка парсинга анализа' }, 500);
    }

    // Save analysis to database
    await c.env.DB.prepare(`
      UPDATE channels SET
        health_score = ?,
        last_analysis = ?,
        last_analyzed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      analysis.health_score,
      JSON.stringify(analysis),
      channelId
    ).run();

    return c.json({
      success: true,
      analysis,
      channel: channelData
    });
  } catch (error: any) {
    console.error('Analyze channel error:', error);
    return c.json({ success: false, error: 'Ошибка анализа канала', details: error?.message }, 500);
  }
});

// Predict video virality
channel.post('/:id/predict', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'OpenAI API не настроен' }, 500);
    }

    const channelId = c.req.param('id');
    
    const body = await c.req.json<{
      // Video concept
      title?: string;
      hook: string;
      topic: string;
      structure?: string;
      duration?: number; // seconds
      // Optional: more details
      script?: string;
      hashtags?: string[];
      target_emotion?: string;
      call_to_action?: string;
    }>();

    // Get channel data for context
    const channelData = await c.env.DB.prepare(
      'SELECT * FROM channels WHERE id = ? AND user_id = ?'
    ).bind(channelId, user.id).first() as any;

    if (!channelData) {
      return c.json({ success: false, error: 'Канал не найден' }, 404);
    }

    // Virality prediction with GPT-4o
    const predictionPrompt = `Ты — AI-система прогнозирования виральности Instagram Reels. 
Ты обучен на данных 100,000+ Reels и понимаешь алгоритмы Instagram.

ДАННЫЕ КАНАЛА @${channelData.username}:
- Подписчики: ${channelData.followers?.toLocaleString() || '?'}
- Средние просмотры: ${channelData.avg_views?.toLocaleString() || '?'}
- Средние лайки: ${channelData.avg_likes?.toLocaleString() || '?'}
- Engagement Rate: ${channelData.engagement_rate?.toFixed(2) || '?'}%
- Ниша: ${channelData.niche || 'не указана'}

КОНЦЕПТ ВИДЕО:
- Заголовок: ${body.title || 'не указан'}
- Хук (первые 3 сек): ${body.hook}
- Тема: ${body.topic}
- Структура: ${body.structure || 'не указана'}
- Длительность: ${body.duration || 30} секунд
- Скрипт: ${body.script || 'не указан'}
- Хэштеги: ${body.hashtags?.join(', ') || 'не указаны'}
- Целевая эмоция: ${body.target_emotion || 'не указана'}
- CTA: ${body.call_to_action || 'не указан'}

ЗАДАЧА: Спрогнозировать метрики и дать рекомендации по улучшению.

ФОРМАТ (JSON):
{
  "virality_score": 72,
  "confidence": 0.8,
  "predicted_views": {
    "min": 5000,
    "max": 50000,
    "likely": 15000,
    "vs_average": "+25%"
  },
  "predicted_likes": {
    "min": 200,
    "max": 2000,
    "likely": 600
  },
  "predicted_comments": {
    "min": 10,
    "max": 100,
    "likely": 35
  },
  "predicted_shares": {
    "min": 5,
    "max": 50,
    "likely": 15
  },
  "viral_probability": 0.15,
  "viral_threshold_note": "Виральным считается >100K просмотров для вашего размера канала",
  "factors": [
    {
      "factor": "Название фактора",
      "impact": "positive | negative | neutral",
      "score": 8,
      "weight": 0.15,
      "explanation": "Почему это важно",
      "suggestion": "Как улучшить (если negative)"
    }
  ],
  "hook_analysis": {
    "score": 7,
    "stops_scroll": true,
    "curiosity_gap": true,
    "emotional_trigger": "surprise",
    "improvement": "Совет по улучшению хука"
  },
  "retention_prediction": {
    "watch_through_rate": 45,
    "drop_off_points": ["0-3 сек: хук слабый", "15 сек: провал интереса"],
    "suggestions": ["Добавить визуальный крючок", "Сократить до 20 сек"]
  },
  "algorithm_friendliness": {
    "score": 8,
    "positive": ["Трендовая тема", "Хорошая длительность"],
    "negative": ["Мало хэштегов"],
    "suggestions": ["Добавить 3-5 нишевых хэштегов"]
  },
  "improvements": [
    {
      "area": "hook | content | cta | hashtags | timing",
      "current_score": 6,
      "potential_score": 9,
      "action": "Конкретное действие для улучшения",
      "impact": "high | medium | low",
      "effort": "easy | medium | hard"
    }
  ],
  "best_posting_time": "Вторник 19:00 или Четверг 20:00",
  "overall_verdict": "Краткий вердикт и главная рекомендация"
}`;

    const response = await chatCompletion(apiKey, [
      { role: 'system', content: predictionPrompt },
      { role: 'user', content: 'Спрогнозируй метрики этого видео и дай рекомендации.' }
    ], {
      temperature: 0.6,
      response_format: { type: 'json_object' }
    });

    let prediction;
    try {
      prediction = JSON.parse(response);
    } catch {
      console.error('Failed to parse prediction:', response);
      return c.json({ success: false, error: 'Ошибка парсинга прогноза' }, 500);
    }

    // Save prediction to history
    await c.env.DB.prepare(`
      INSERT INTO predictions (id, user_id, channel_id, video_concept, prediction, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      crypto.randomUUID(),
      user.id,
      channelId,
      JSON.stringify(body),
      JSON.stringify(prediction)
    ).run();

    return c.json({
      success: true,
      prediction,
      video_concept: body
    });
  } catch (error: any) {
    console.error('Predict virality error:', error);
    return c.json({ success: false, error: 'Ошибка прогнозирования', details: error?.message }, 500);
  }
});

// Get prediction history
channel.get('/:id/predictions', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const channelId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '20');

    const predictions = await c.env.DB.prepare(`
      SELECT * FROM predictions 
      WHERE channel_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(channelId, user.id, limit).all();

    // Parse JSON fields
    const parsedPredictions = (predictions.results || []).map((p: any) => ({
      ...p,
      video_concept: JSON.parse(p.video_concept || '{}'),
      prediction: JSON.parse(p.prediction || '{}')
    }));

    return c.json({
      success: true,
      predictions: parsedPredictions
    });
  } catch (error: any) {
    console.error('Get predictions error:', error);
    return c.json({ success: false, error: 'Ошибка получения прогнозов' }, 500);
  }
});

// Quick suggestions based on channel
channel.get('/:id/suggestions', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'OpenAI API не настроен' }, 500);
    }

    const channelId = c.req.param('id');

    const channelData = await c.env.DB.prepare(
      'SELECT * FROM channels WHERE id = ? AND user_id = ?'
    ).bind(channelId, user.id).first() as any;

    if (!channelData) {
      return c.json({ success: false, error: 'Канал не найден' }, 404);
    }

    const suggestionsPrompt = `Ты — креативный директор Instagram Reels.

КАНАЛ: @${channelData.username}
НИША: ${channelData.niche || 'общая'}
ПОДПИСЧИКИ: ${channelData.followers?.toLocaleString() || '?'}
ER: ${channelData.engagement_rate?.toFixed(2) || '?'}%

Сгенерируй 5 конкретных идей для Reels, которые имеют высокий потенциал виральности для этого канала.

ФОРМАТ (JSON):
{
  "suggestions": [
    {
      "title": "Название идеи",
      "hook": "Первая фраза/сцена для остановки скролла",
      "why_viral": "Почему это сработает",
      "difficulty": "easy | medium | hard",
      "estimated_virality": 75,
      "trending_relevance": "high | medium | low",
      "quick_tips": ["Совет 1", "Совет 2"]
    }
  ],
  "trending_topics": ["Тренд 1", "Тренд 2", "Тренд 3"],
  "avoid_topics": ["Избегать 1"],
  "content_calendar_tip": "Совет по контент-плану"
}`;

    const response = await chatCompletion(apiKey, [
      { role: 'system', content: suggestionsPrompt },
      { role: 'user', content: 'Дай идеи для Reels.' }
    ], {
      temperature: 0.9,
      response_format: { type: 'json_object' }
    });

    const suggestions = JSON.parse(response);

    return c.json({
      success: true,
      ...suggestions
    });
  } catch (error: any) {
    console.error('Get suggestions error:', error);
    return c.json({ success: false, error: 'Ошибка получения рекомендаций' }, 500);
  }
});

// Delete channel
channel.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const channelId = c.req.param('id');

    // Verify ownership
    const channelData = await c.env.DB.prepare(
      'SELECT * FROM channels WHERE id = ? AND user_id = ?'
    ).bind(channelId, user.id).first();

    if (!channelData) {
      return c.json({ success: false, error: 'Канал не найден' }, 404);
    }

    // Delete related data
    await c.env.DB.prepare('DELETE FROM predictions WHERE channel_id = ?').bind(channelId).run();
    await c.env.DB.prepare('DELETE FROM reels WHERE channel_id = ?').bind(channelId).run();
    await c.env.DB.prepare('DELETE FROM channels WHERE id = ?').bind(channelId).run();

    return c.json({ success: true, message: 'Канал удалён' });
  } catch (error: any) {
    console.error('Delete channel error:', error);
    return c.json({ success: false, error: 'Ошибка удаления канала' }, 500);
  }
});

export default channel;
