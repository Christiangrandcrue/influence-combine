// Dashboard routes for Influence Combine

import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { getUserStats, getUserVideos, getUserIdeas } from '../lib/db';

const dashboard = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Get dashboard overview
dashboard.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    // Get user stats
    const stats = await getUserStats(c.env.DB, user.id);
    
    // Get recent videos
    const recentVideos = await getUserVideos(c.env.DB, user.id, 5);
    
    // Get recent ideas
    const recentIdeas = await getUserIdeas(c.env.DB, user.id, 5);
    
    // Calculate improvement trend (mock for now)
    const improvementTrend = stats.total_videos > 1 ? '+12%' : 'N/A';
    
    return c.json({
      success: true,
      dashboard: {
        stats: {
          total_videos: stats.total_videos,
          total_ideas: stats.total_ideas,
          avg_score: Math.round(stats.avg_score * 10) / 10,
          videos_this_month: stats.videos_this_month,
          improvement_trend: improvementTrend
        },
        usage: {
          analyses: {
            used: user.analyses_used,
            limit: user.analyses_limit,
            percentage: Math.round((user.analyses_used / user.analyses_limit) * 100)
          },
          ideas: {
            used: user.ideas_used,
            limit: user.ideas_limit,
            percentage: Math.round((user.ideas_used / user.ideas_limit) * 100)
          }
        },
        recent_videos: recentVideos.map(v => ({
          id: v.id,
          filename: v.filename,
          status: v.status,
          overall_score: v.overall_score,
          created_at: v.created_at
        })),
        recent_ideas: recentIdeas.map(i => ({
          id: i.id,
          title: i.title,
          status: i.status,
          viral_potential: i.viral_potential,
          created_at: i.created_at
        })),
        plan: user.plan,
        plan_expires_at: user.plan_expires_at
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get analytics (mock Instagram data for now)
dashboard.get('/analytics', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    // Mock Instagram analytics
    // In production, this would come from Instagram Graph API
    const mockAnalytics = {
      connected: false, // Instagram not connected
      metrics: {
        followers: null,
        engagement_rate: null,
        reach_7d: null,
        reach_30d: null,
        median_views_7d: null,
        median_views_30d: null,
        connected_share: null,
        unconnected_share: null,
        top_content_type: null
      },
      // Historical data for charts (mock)
      history: {
        views: [
          { date: '2024-11-01', value: 1200 },
          { date: '2024-11-08', value: 1500 },
          { date: '2024-11-15', value: 1800 },
          { date: '2024-11-22', value: 2100 },
          { date: '2024-11-29', value: 2400 }
        ],
        engagement: [
          { date: '2024-11-01', value: 4.2 },
          { date: '2024-11-08', value: 4.5 },
          { date: '2024-11-15', value: 4.8 },
          { date: '2024-11-22', value: 5.1 },
          { date: '2024-11-29', value: 5.4 }
        ]
      },
      message: 'Подключите Instagram для получения реальной аналитики'
    };
    
    return c.json({
      success: true,
      analytics: mockAnalytics
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get score breakdown
dashboard.get('/scores', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    // Get all completed videos with scores
    const videos = await getUserVideos(c.env.DB, user.id, 100);
    const completedVideos = videos.filter(v => v.status === 'completed' && v.overall_score);
    
    if (completedVideos.length === 0) {
      return c.json({
        success: true,
        scores: {
          overall: 0,
          hook: 0,
          retention: 0,
          clarity: 0,
          cta: 0,
          video_count: 0,
          history: []
        }
      });
    }
    
    // Calculate averages
    const avgScores = {
      overall: completedVideos.reduce((sum, v) => sum + (v.overall_score || 0), 0) / completedVideos.length,
      hook: completedVideos.reduce((sum, v) => sum + (v.hook_score || 0), 0) / completedVideos.length,
      retention: completedVideos.reduce((sum, v) => sum + (v.retention_score || 0), 0) / completedVideos.length,
      clarity: completedVideos.reduce((sum, v) => sum + (v.clarity_score || 0), 0) / completedVideos.length,
      cta: completedVideos.reduce((sum, v) => sum + (v.cta_score || 0), 0) / completedVideos.length
    };
    
    // Score history
    const history = completedVideos
      .slice(0, 10)
      .map(v => ({
        id: v.id,
        filename: v.filename,
        date: v.analyzed_at || v.created_at,
        overall: v.overall_score,
        hook: v.hook_score,
        retention: v.retention_score
      }))
      .reverse();
    
    return c.json({
      success: true,
      scores: {
        overall: Math.round(avgScores.overall),
        hook: Math.round(avgScores.hook),
        retention: Math.round(avgScores.retention),
        clarity: Math.round(avgScores.clarity),
        cta: Math.round(avgScores.cta),
        video_count: completedVideos.length,
        history
      }
    });
  } catch (error) {
    console.error('Scores error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get recommendations summary
dashboard.get('/recommendations', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    // Get recent videos with recommendations
    const videos = await getUserVideos(c.env.DB, user.id, 10);
    const completedVideos = videos.filter(v => v.status === 'completed' && v.recommendations);
    
    // Aggregate recommendations by type
    const recommendationMap: Record<string, { count: number; examples: string[] }> = {};
    
    for (const video of completedVideos) {
      try {
        const recs = JSON.parse(video.recommendations || '[]');
        for (const rec of recs) {
          if (!recommendationMap[rec.type]) {
            recommendationMap[rec.type] = { count: 0, examples: [] };
          }
          recommendationMap[rec.type].count++;
          if (recommendationMap[rec.type].examples.length < 3) {
            recommendationMap[rec.type].examples.push(rec.title);
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
    
    // Convert to array and sort by frequency
    const aggregated = Object.entries(recommendationMap)
      .map(([type, data]) => ({
        type,
        count: data.count,
        examples: data.examples
      }))
      .sort((a, b) => b.count - a.count);
    
    // Get top focus area
    const topFocus = aggregated[0] || null;
    
    return c.json({
      success: true,
      recommendations: {
        aggregated,
        top_focus: topFocus,
        total_videos_analyzed: completedVideos.length,
        actionable_tips: [
          'Усильте хуки — это самая важная часть для алгоритма',
          'Добавляйте текст на экран для лучшего удержания',
          'Всегда заканчивайте видео чётким призывом к действию'
        ]
      }
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

export default dashboard;
