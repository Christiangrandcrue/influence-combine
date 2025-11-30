// Idea Generation routes for Influence Combine

import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { getUserById, createIdea, getUserIdeas, getIdeaById, updateIdea, incrementUserUsage } from '../lib/db';
import { generateIdeas, generateScript } from '../lib/openai';

const ideas = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Generate new ideas
ideas.post('/generate', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    // Check limits
    if (user.ideas_used >= user.ideas_limit) {
      return c.json({ 
        success: false, 
        error: 'Лимит генерации идей исчерпан',
        upgrade_required: true
      }, 403);
    }
    
    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'OpenAI API не настроен' }, 500);
    }
    
    const { theme, count = 3 } = await c.req.json<{ theme?: string; count?: number }>();
    
    // Generate ideas using OpenAI
    const generatedIdeas = await generateIdeas(
      apiKey,
      {
        niche: user.niche ?? undefined,
        target_audience: user.target_audience ?? undefined,
        content_style: user.content_style ?? undefined,
        expertise: user.expertise ?? undefined
      },
      theme,
      Math.min(count, 5) // Max 5 ideas per request
    );
    
    if (generatedIdeas.length === 0) {
      return c.json({ success: false, error: 'Не удалось сгенерировать идеи' }, 500);
    }
    
    // Save ideas to database
    const savedIdeas = await Promise.all(
      generatedIdeas.map(idea => 
        createIdea(c.env.DB, user.id, {
          title: idea.title,
          hook: idea.hook,
          structure: idea.structure,
          key_message: idea.key_message,
          target_audience: idea.target_audience,
          viral_potential: idea.viral_potential
        })
      )
    );
    
    // Increment usage
    await incrementUserUsage(c.env.DB, user.id, 'ideas');
    
    // Fetch saved ideas with full data
    const fullIdeas = await Promise.all(
      savedIdeas.map(id => getIdeaById(c.env.DB, id))
    );
    
    return c.json({
      success: true,
      ideas: fullIdeas.filter(Boolean),
      usage: {
        used: user.ideas_used + 1,
        limit: user.ideas_limit
      }
    });
  } catch (error) {
    console.error('Generate ideas error:', error);
    return c.json({ success: false, error: 'Ошибка генерации идей' }, 500);
  }
});

// Get all user's ideas
ideas.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    
    let userIdeas = await getUserIdeas(c.env.DB, user.id, limit);
    
    // Filter by status if provided
    if (status) {
      userIdeas = userIdeas.filter(idea => idea.status === status);
    }
    
    return c.json({
      success: true,
      ideas: userIdeas,
      total: userIdeas.length
    });
  } catch (error) {
    console.error('Get ideas error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get single idea
ideas.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const id = c.req.param('id');
    const idea = await getIdeaById(c.env.DB, id);
    
    if (!idea) {
      return c.json({ success: false, error: 'Идея не найдена' }, 404);
    }
    
    if (idea.user_id !== user.id) {
      return c.json({ success: false, error: 'Нет доступа' }, 403);
    }
    
    return c.json({ success: true, idea });
  } catch (error) {
    console.error('Get idea error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Update idea status
ideas.patch('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const id = c.req.param('id');
    const idea = await getIdeaById(c.env.DB, id);
    
    if (!idea) {
      return c.json({ success: false, error: 'Идея не найдена' }, 404);
    }
    
    if (idea.user_id !== user.id) {
      return c.json({ success: false, error: 'Нет доступа' }, 403);
    }
    
    const updates = await c.req.json<{ status?: string; title?: string }>();
    
    await updateIdea(c.env.DB, id, updates);
    
    const updatedIdea = await getIdeaById(c.env.DB, id);
    
    return c.json({ success: true, idea: updatedIdea });
  } catch (error) {
    console.error('Update idea error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Generate script for idea
ideas.post('/:id/script', async (c) => {
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
    const idea = await getIdeaById(c.env.DB, id);
    
    if (!idea) {
      return c.json({ success: false, error: 'Идея не найдена' }, 404);
    }
    
    if (idea.user_id !== user.id) {
      return c.json({ success: false, error: 'Нет доступа' }, 403);
    }
    
    const { duration = 30 } = await c.req.json<{ duration?: number }>();
    
    // Generate script using OpenAI
    const script = await generateScript(
      apiKey,
      {
        title: idea.title,
        hook: idea.hook || '',
        structure: idea.structure || 'emotion',
        key_message: idea.key_message || ''
      },
      duration
    );
    
    // Save script to idea
    await updateIdea(c.env.DB, id, {
      script: JSON.stringify(script),
      status: 'in_progress'
    });
    
    return c.json({
      success: true,
      script,
      idea_id: id
    });
  } catch (error) {
    console.error('Generate script error:', error);
    return c.json({ success: false, error: 'Ошибка генерации сценария' }, 500);
  }
});

// Delete idea
ideas.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const id = c.req.param('id');
    const idea = await getIdeaById(c.env.DB, id);
    
    if (!idea) {
      return c.json({ success: false, error: 'Идея не найдена' }, 404);
    }
    
    if (idea.user_id !== user.id) {
      return c.json({ success: false, error: 'Нет доступа' }, 403);
    }
    
    await c.env.DB.prepare('DELETE FROM ideas WHERE id = ?').bind(id).run();
    
    return c.json({ success: true, message: 'Идея удалена' });
  } catch (error) {
    console.error('Delete idea error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

export default ideas;
