// Onboarding routes for Influence Combine

import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { updateUserOnboarding, getUserById } from '../lib/db';

const onboarding = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Save onboarding data
onboarding.post('/complete', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const data = await c.req.json<{
      name?: string;
      niche?: string;
      target_audience?: string;
      content_style?: string;
      expertise?: string;
      goals?: string;
    }>();
    
    await updateUserOnboarding(c.env.DB, user.id, {
      name: data.name,
      niche: data.niche,
      target_audience: data.target_audience,
      content_style: data.content_style,
      expertise: data.expertise,
      goals: data.goals
    });
    
    const updatedUser = await getUserById(c.env.DB, user.id);
    
    return c.json({
      success: true,
      message: 'Онбординг завершён',
      user: updatedUser
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get positioning data (for editing)
onboarding.get('/positioning', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    return c.json({
      success: true,
      positioning: {
        name: user.name,
        niche: user.niche,
        target_audience: user.target_audience,
        content_style: user.content_style,
        expertise: user.expertise,
        goals: user.goals
      }
    });
  } catch (error) {
    console.error('Get positioning error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Update positioning (partial update)
onboarding.patch('/positioning', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const data = await c.req.json<Partial<{
      name: string;
      niche: string;
      target_audience: string;
      content_style: string;
      expertise: string;
      goals: string;
    }>>();
    
    await updateUserOnboarding(c.env.DB, user.id, {
      name: data.name ?? user.name ?? undefined,
      niche: data.niche ?? user.niche ?? undefined,
      target_audience: data.target_audience ?? user.target_audience ?? undefined,
      content_style: data.content_style ?? user.content_style ?? undefined,
      expertise: data.expertise ?? user.expertise ?? undefined,
      goals: data.goals ?? user.goals ?? undefined
    });
    
    const updatedUser = await getUserById(c.env.DB, user.id);
    
    return c.json({
      success: true,
      message: 'Позиционирование обновлено',
      positioning: {
        name: updatedUser?.name,
        niche: updatedUser?.niche,
        target_audience: updatedUser?.target_audience,
        content_style: updatedUser?.content_style,
        expertise: updatedUser?.expertise,
        goals: updatedUser?.goals
      }
    });
  } catch (error) {
    console.error('Update positioning error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Niche suggestions
onboarding.get('/niche-suggestions', async (c) => {
  const suggestions = [
    { id: 'business', name: 'Бизнес и предпринимательство', icon: '💼' },
    { id: 'marketing', name: 'Маркетинг и SMM', icon: '📱' },
    { id: 'finance', name: 'Финансы и инвестиции', icon: '💰' },
    { id: 'tech', name: 'IT и технологии', icon: '💻' },
    { id: 'health', name: 'Здоровье и фитнес', icon: '🏃' },
    { id: 'beauty', name: 'Красота и стиль', icon: '💄' },
    { id: 'education', name: 'Образование', icon: '📚' },
    { id: 'travel', name: 'Путешествия', icon: '✈️' },
    { id: 'food', name: 'Еда и рецепты', icon: '🍳' },
    { id: 'lifestyle', name: 'Лайфстайл', icon: '🌟' },
    { id: 'psychology', name: 'Психология и саморазвитие', icon: '🧠' },
    { id: 'parenting', name: 'Материнство и воспитание', icon: '👶' },
    { id: 'entertainment', name: 'Развлечения и юмор', icon: '😂' },
    { id: 'other', name: 'Другое', icon: '🎯' }
  ];
  
  return c.json({ success: true, suggestions });
});

// Content style suggestions
onboarding.get('/style-suggestions', async (c) => {
  const suggestions = [
    { id: 'educational', name: 'Образовательный', description: 'Обучаю, делюсь знаниями', icon: '📖' },
    { id: 'entertaining', name: 'Развлекательный', description: 'Смешу, развлекаю', icon: '🎭' },
    { id: 'inspirational', name: 'Вдохновляющий', description: 'Мотивирую, вдохновляю', icon: '✨' },
    { id: 'storytelling', name: 'Сторителлинг', description: 'Рассказываю истории', icon: '📝' },
    { id: 'expert', name: 'Экспертный', description: 'Глубокая аналитика, разборы', icon: '🎓' },
    { id: 'personal', name: 'Личный бренд', description: 'Делюсь личным опытом', icon: '💫' },
    { id: 'news', name: 'Новостной', description: 'Актуальные темы, тренды', icon: '📰' },
    { id: 'mixed', name: 'Смешанный', description: 'Комбинирую разные стили', icon: '🎨' }
  ];
  
  return c.json({ success: true, suggestions });
});

export default onboarding;
