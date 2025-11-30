// AI Assistant routes for Influence Combine (RAG-based)

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Bindings, Variables } from '../types';
import { saveChatMessage, getChatHistory, searchKnowledgeBase, getVideoById } from '../lib/db';
import { assistantChat } from '../lib/openai';

const assistant = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Send message to AI assistant
assistant.post('/chat', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'OpenAI API не настроен' }, 500);
    }
    
    const { message, context_type, context_id } = await c.req.json<{
      message: string;
      context_type?: 'video_analysis' | 'idea' | 'general';
      context_id?: string;
    }>();
    
    if (!message || message.trim().length === 0) {
      return c.json({ success: false, error: 'Сообщение не может быть пустым' }, 400);
    }
    
    // Save user message
    await saveChatMessage(c.env.DB, user.id, 'user', message, context_type, context_id);
    
    // Get chat history
    const history = await getChatHistory(c.env.DB, user.id, 10);
    const formattedHistory = history.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));
    
    // Search knowledge base for relevant context
    const kbArticles = await searchKnowledgeBase(c.env.DB, message, 3);
    const kbContext = kbArticles.map(article => `${article.title}:\n${article.content}`);
    
    // Get video analysis context if provided
    let videoContext: string | undefined;
    if (context_type === 'video_analysis' && context_id) {
      const video = await getVideoById(c.env.DB, context_id);
      if (video) {
        videoContext = `
Видео: ${video.filename}
Статус: ${video.status}
${video.overall_score ? `Общий балл: ${video.overall_score}/100` : ''}
${video.hook_score ? `Хук: ${video.hook_score}/100` : ''}
${video.retention_score ? `Удержание: ${video.retention_score}/100` : ''}
${video.transcript ? `Транскрипт: ${video.transcript.slice(0, 500)}...` : ''}
${video.recommendations ? `Рекомендации: ${video.recommendations}` : ''}`;
      }
    }
    
    // User positioning context
    const userPositioning = user.niche || user.target_audience ? `
Ниша: ${user.niche || 'не указана'}
Целевая аудитория: ${user.target_audience || 'не указана'}
Стиль контента: ${user.content_style || 'не указан'}
Экспертиза: ${user.expertise || 'не указана'}` : undefined;
    
    // Call OpenAI with RAG context
    const response = await assistantChat(
      apiKey,
      message,
      {
        knowledge_base: kbContext,
        video_analysis: videoContext,
        user_positioning: userPositioning
      },
      formattedHistory.slice(0, -1) // Exclude the message we just added
    );
    
    // Save assistant response
    await saveChatMessage(c.env.DB, user.id, 'assistant', response, context_type, context_id);
    
    return c.json({
      success: true,
      message: response,
      sources: kbArticles.map(a => ({ id: a.id, title: a.title }))
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ success: false, error: 'Ошибка AI ассистента' }, 500);
  }
});

// Get chat history
assistant.get('/history', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const limit = parseInt(c.req.query('limit') || '50');
    const history = await getChatHistory(c.env.DB, user.id, limit);
    
    return c.json({
      success: true,
      messages: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Clear chat history
assistant.delete('/history', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    await c.env.DB.prepare('DELETE FROM chat_messages WHERE user_id = ?').bind(user.id).run();
    
    return c.json({ success: true, message: 'История очищена' });
  } catch (error) {
    console.error('Clear history error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Quick prompts/suggestions
assistant.get('/suggestions', async (c) => {
  const suggestions = [
    {
      category: 'Хуки',
      prompts: [
        'Как создать цепляющий хук для моего видео?',
        'Дай 5 примеров хуков для образовательного контента',
        'Почему мои хуки не работают?'
      ]
    },
    {
      category: 'Удержание',
      prompts: [
        'Как удержать зрителя до конца видео?',
        'Какие техники pattern interrupt использовать?',
        'Оптимальная длина Reels для максимального удержания'
      ]
    },
    {
      category: 'Алгоритм',
      prompts: [
        'Как работает алгоритм Instagram Reels?',
        'Что влияет на попадание в рекомендации?',
        'Оптимальное время публикации'
      ]
    },
    {
      category: 'Контент',
      prompts: [
        'Помоги придумать идею для видео',
        'Какой контент сейчас в тренде?',
        'Как выбрать нишу для блога?'
      ]
    }
  ];
  
  return c.json({ success: true, suggestions });
});

// Streaming chat (SSE) - for real-time responses
assistant.get('/chat/stream', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ success: false, error: 'Не авторизован' }, 401);
  }
  
  const message = c.req.query('message');
  if (!message) {
    return c.json({ success: false, error: 'Сообщение обязательно' }, 400);
  }
  
  return streamSSE(c, async (stream) => {
    try {
      const apiKey = c.env.OPENAI_API_KEY;
      if (!apiKey) {
        await stream.writeSSE({ data: JSON.stringify({ error: 'OpenAI API не настроен' }) });
        return;
      }
      
      // For streaming, we'd need to use OpenAI's streaming API
      // For now, send the complete response
      const kbArticles = await searchKnowledgeBase(c.env.DB, message, 3);
      const kbContext = kbArticles.map(article => `${article.title}:\n${article.content}`);
      
      const response = await assistantChat(
        apiKey,
        message,
        { knowledge_base: kbContext },
        []
      );
      
      // Simulate streaming by sending chunks
      const words = response.split(' ');
      let accumulated = '';
      
      for (let i = 0; i < words.length; i++) {
        accumulated += (i > 0 ? ' ' : '') + words[i];
        await stream.writeSSE({
          data: JSON.stringify({ 
            content: accumulated,
            done: i === words.length - 1
          })
        });
        await stream.sleep(30); // Small delay for streaming effect
      }
      
      // Save messages
      await saveChatMessage(c.env.DB, user.id, 'user', message);
      await saveChatMessage(c.env.DB, user.id, 'assistant', response);
      
    } catch (error) {
      console.error('Stream error:', error);
      await stream.writeSSE({ data: JSON.stringify({ error: 'Ошибка стриминга' }) });
    }
  });
});

export default assistant;
