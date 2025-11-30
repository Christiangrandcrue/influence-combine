// Storytelling Library routes for Influence Combine

import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { getStorytellingStructures, getStructureById, getAllKnowledgeBase, searchKnowledgeBase } from '../lib/db';

const library = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Get all storytelling structures
library.get('/structures', async (c) => {
  try {
    const structures = await getStorytellingStructures(c.env.DB);
    
    // Parse example_structure JSON
    const parsed = structures.map(s => ({
      ...s,
      example_structure: s.example_structure ? JSON.parse(s.example_structure) : null
    }));
    
    return c.json({
      success: true,
      structures: parsed
    });
  } catch (error) {
    console.error('Get structures error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get single structure
library.get('/structures/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const structure = await getStructureById(c.env.DB, id);
    
    if (!structure) {
      return c.json({ success: false, error: 'Структура не найдена' }, 404);
    }
    
    // Parse example_structure JSON
    const parsed = {
      ...structure,
      example_structure: structure.example_structure ? JSON.parse(structure.example_structure) : null
    };
    
    return c.json({ success: true, structure: parsed });
  } catch (error) {
    console.error('Get structure error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get all knowledge base articles
library.get('/knowledge', async (c) => {
  try {
    const category = c.req.query('category');
    
    let articles = await getAllKnowledgeBase(c.env.DB);
    
    if (category) {
      articles = articles.filter(a => a.category === category);
    }
    
    // Group by category
    const grouped: Record<string, typeof articles> = {};
    for (const article of articles) {
      if (!grouped[article.category]) {
        grouped[article.category] = [];
      }
      grouped[article.category].push(article);
    }
    
    return c.json({
      success: true,
      articles,
      grouped,
      categories: Object.keys(grouped)
    });
  } catch (error) {
    console.error('Get knowledge error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Search knowledge base
library.get('/knowledge/search', async (c) => {
  try {
    const query = c.req.query('q');
    
    if (!query || query.length < 2) {
      return c.json({ success: false, error: 'Запрос слишком короткий' }, 400);
    }
    
    const results = await searchKnowledgeBase(c.env.DB, query, 10);
    
    return c.json({
      success: true,
      query,
      results,
      total: results.length
    });
  } catch (error) {
    console.error('Search knowledge error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get hook examples
library.get('/hooks', async (c) => {
  const hookExamples = [
    {
      type: 'shock',
      name: 'Шок/Неожиданность',
      examples: [
        'Я потерял 100 тысяч подписчиков за одну ночь...',
        'Этот простой трюк удвоил мои продажи',
        'Меня заблокировали в Instagram за это...',
        'Я никогда не расскажу это публично, но...'
      ],
      tips: [
        'Используйте числа для конкретики',
        'Создайте ощущение потери или упущения',
        'Начните с середины истории'
      ]
    },
    {
      type: 'question',
      name: 'Провокационный вопрос',
      examples: [
        'Почему 99% блогеров никогда не выйдут на монетизацию?',
        'Знаете, какую ошибку делают все новички?',
        'Хотите узнать, почему ваши Reels не набирают?',
        'Что если я скажу, что вы всё делаете неправильно?'
      ],
      tips: [
        'Вопрос должен касаться боли аудитории',
        'Используйте числа и статистику',
        'Создайте ощущение эксклюзивности'
      ]
    },
    {
      type: 'value',
      name: 'Обещание ценности',
      examples: [
        'После этого видео вы будете набирать в 3 раза больше просмотров',
        '5 секретов, которые превратят вас в топ-блогера',
        'Формула вирусного Reels, которую скрывают все',
        'За 60 секунд научу вас...'
      ],
      tips: [
        'Обещание должно быть конкретным',
        'Добавьте временные рамки',
        'Используйте числа'
      ]
    },
    {
      type: 'contrast',
      name: 'Контраст/Противопоставление',
      examples: [
        'Все говорят постить каждый день. Это убивает ваш охват.',
        'Раньше я думал, что хештеги важны. Как же я ошибался.',
        'Гуру советуют это, но на практике работает совсем другое',
        'Забудьте всё, что знали о вирусности'
      ],
      tips: [
        'Разрушайте мифы и стереотипы',
        'Противопоставляйте общепринятое мнение',
        'Покажите альтернативный взгляд'
      ]
    },
    {
      type: 'curiosity',
      name: 'Петля любопытства',
      examples: [
        'В конце этого видео вы узнаете то, что изменит всё...',
        'Досмотрите до конца, там самое важное',
        'Секрет в последних 10 секундах',
        'Вот что произошло дальше...'
      ],
      tips: [
        'Не раскрывайте главное сразу',
        'Создайте интригу',
        'Обещайте награду за просмотр'
      ]
    },
    {
      type: 'empathy',
      name: 'Эмпатия/Уязвимость',
      examples: [
        'Знаю, как это больно, когда видео набирает 50 просмотров...',
        'Я тоже через это прошёл...',
        'Помню, как сидел и думал — может, это не моё...',
        'Честно? Я чуть не сдался.'
      ],
      tips: [
        'Покажите свою человечность',
        'Поделитесь личным опытом',
        'Создайте связь с аудиторией'
      ]
    }
  ];
  
  return c.json({
    success: true,
    hooks: hookExamples
  });
});

// Get CTA templates
library.get('/cta-templates', async (c) => {
  const ctaTemplates = [
    {
      type: 'engagement',
      name: 'Вовлечение',
      templates: [
        'Напиши в комментариях, какой совет был самым полезным',
        'Сохрани, чтобы не потерять — пригодится',
        'Поставь 🔥, если узнал себя',
        'Какой из этих способов ты уже используешь? Напиши номер'
      ]
    },
    {
      type: 'follow',
      name: 'Подписка',
      templates: [
        'Подписывайся, если хочешь больше таких разборов',
        'В следующем видео расскажу ещё круче — подписывайся',
        'Подписка = больше полезного контента для тебя',
        'Не пропусти продолжение — подпишись'
      ]
    },
    {
      type: 'share',
      name: 'Репост',
      templates: [
        'Отправь другу, который должен это увидеть',
        'Скинь в сторис, пусть друзья тоже узнают',
        'Репостни тому, кто постоянно жалуется на охваты',
        'Поделись с тем, кто только начинает вести блог'
      ]
    },
    {
      type: 'action',
      name: 'Действие',
      templates: [
        'Попробуй сегодня и напиши, что получилось',
        'Сделай скриншот и выложи результат в сторис',
        'Примени прямо сейчас и вернись с результатом',
        'Первый шаг — открой свой последний Reels и проверь'
      ]
    }
  ];
  
  return c.json({
    success: true,
    templates: ctaTemplates
  });
});

// Get trending topics
library.get('/trends', async (c) => {
  // Mock trending topics (in production, would be updated regularly)
  const trends = [
    {
      topic: 'AI контент',
      description: 'Как использовать нейросети для создания контента',
      popularity: 95,
      rising: true
    },
    {
      topic: 'Storytelling',
      description: 'Сторителлинг в коротких видео',
      popularity: 88,
      rising: true
    },
    {
      topic: 'Personal brand',
      description: 'Построение личного бренда',
      popularity: 82,
      rising: false
    },
    {
      topic: 'Behind the scenes',
      description: 'Закулисье и процесс работы',
      popularity: 78,
      rising: true
    },
    {
      topic: 'Мифы и разоблачения',
      description: 'Разрушение стереотипов в нише',
      popularity: 75,
      rising: true
    }
  ];
  
  return c.json({
    success: true,
    trends,
    updated_at: new Date().toISOString()
  });
});

export default library;
