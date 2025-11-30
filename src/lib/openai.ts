// OpenAI API Integration for Influence Combine

const OPENAI_API_URL = 'https://api.openai.com/v1';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenAI Chat Completion API
 */
export async function chatCompletion(
  apiKey: string,
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: 'text' | 'json_object' };
  } = {}
): Promise<string> {
  // Validate API key format
  if (!apiKey || apiKey.length < 20) {
    throw new Error('OpenAI API key is invalid or not configured');
  }
  
  const requestBody = {
    model: options.model || 'gpt-4o',
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens || 2000,
    response_format: options.response_format
  };

  console.log('OpenAI request:', {
    url: `${OPENAI_API_URL}/chat/completions`,
    model: requestBody.model,
    messagesCount: messages.length,
    apiKeyPrefix: apiKey.substring(0, 15) + '...'
  });

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('OpenAI response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    
    // Parse error for better messages
    let errorMessage = `OpenAI API error (${response.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {
      errorMessage = errorText.substring(0, 200);
    }
    
    throw new Error(errorMessage);
  }

  const data: ChatCompletionResponse = await response.json();
  console.log('OpenAI success, tokens used:', data.usage?.total_tokens);
  return data.choices[0]?.message?.content || '';
}

/**
 * Generate ideas for Instagram Reels
 */
export async function generateIdeas(
  apiKey: string,
  positioning: {
    niche?: string;
    target_audience?: string;
    content_style?: string;
    expertise?: string;
  },
  theme?: string,
  count: number = 3
): Promise<Array<{
  title: string;
  hook: string;
  structure: string;
  key_message: string;
  target_audience: string;
  viral_potential: number;
}>> {
  const systemPrompt = `Ты — AI-ассистент для Instagram-блогеров, эксперт по созданию вирусного контента.

ЗАДАЧА: Генерировать идеи видео на основе позиционирования пользователя.

ПОЗИЦИОНИРОВАНИЕ ПОЛЬЗОВАТЕЛЯ:
- Ниша: ${positioning.niche || 'не указана'}
- Целевая аудитория: ${positioning.target_audience || 'не указана'}
- Стиль контента: ${positioning.content_style || 'не указан'}
- Экспертиза: ${positioning.expertise || 'не указана'}

ПРАВИЛА:
1. Идеи должны быть конкретными и реализуемыми
2. Хук должен останавливать скролл (шок/любопытство/юмор)
3. Используй storytelling структуры: petal, emotion, transformation, loop, contrast
4. Учитывай тренды Instagram Reels 2024
5. viral_potential оценивай честно от 1 до 10

ФОРМАТ ОТВЕТА (JSON):
{
  "ideas": [
    {
      "title": "Заголовок идеи (до 60 символов)",
      "hook": "Первая фраза или сцена для хука (3-7 секунд)",
      "structure": "petal | emotion | transformation | loop | contrast",
      "key_message": "Главный месседж видео",
      "target_audience": "Конкретная аудитория этого видео",
      "viral_potential": 7
    }
  ]
}`;

  const userPrompt = theme 
    ? `Сгенерируй ${count} идей для видео на тему: "${theme}"`
    : `Сгенерируй ${count} идей для видео, которые подходят моему позиционированию`;

  const response = await chatCompletion(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.9,
    response_format: { type: 'json_object' }
  });

  try {
    const parsed = JSON.parse(response);
    return parsed.ideas || [];
  } catch {
    console.error('Failed to parse ideas response:', response);
    return [];
  }
}

/**
 * Generate filming script from idea
 */
export async function generateScript(
  apiKey: string,
  idea: {
    title: string;
    hook: string;
    structure: string;
    key_message: string;
  },
  duration: number = 30
): Promise<{
  scenes: Array<{
    number: number;
    duration_sec: number;
    type: string;
    description: string;
    text_overlay?: string;
    audio?: string;
    camera_movement?: string;
    editing_tip?: string;
  }>;
  total_duration: number;
  music_recommendation?: string;
  hashtags: string[];
}> {
  const systemPrompt = `Ты — профессиональный режиссёр Instagram Reels. Создаёшь детальные планы съёмки.

ЗАДАЧА: Создать filming plan на основе идеи видео.

ИДЕЯ:
- Заголовок: ${idea.title}
- Хук: ${idea.hook}
- Структура: ${idea.structure}
- Ключевой месседж: ${idea.key_message}

ТРЕБОВАНИЯ:
1. Общая длительность: ~${duration} секунд
2. Хук должен быть в первые 3-5 секунд
3. Детальное описание каждой сцены
4. Рекомендации по тексту на экране
5. Советы по монтажу и переходам

ФОРМАТ (JSON):
{
  "scenes": [
    {
      "number": 1,
      "duration_sec": 5,
      "type": "hook",
      "description": "Описание что происходит в кадре",
      "text_overlay": "Текст на экране (опционально)",
      "audio": "Описание звука/музыки",
      "camera_movement": "Статика / Зум / Панорама",
      "editing_tip": "Совет по монтажу"
    }
  ],
  "total_duration": 30,
  "music_recommendation": "Рекомендация по музыке",
  "hashtags": ["#reels", "#viral"]
}`;

  const response = await chatCompletion(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Создай детальный план съёмки для этой идеи.' }
  ], {
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  try {
    return JSON.parse(response);
  } catch {
    console.error('Failed to parse script response:', response);
    return {
      scenes: [],
      total_duration: 0,
      hashtags: []
    };
  }
}

/**
 * AI Assistant chat with RAG context
 */
export async function assistantChat(
  apiKey: string,
  userMessage: string,
  context: {
    knowledge_base?: string[];
    video_analysis?: string;
    user_positioning?: string;
  },
  chatHistory: ChatMessage[] = []
): Promise<string> {
  const systemPrompt = `Ты — AI-ассистент платформы Influence Combine, эксперт по созданию вирусного контента для Instagram Reels.

ТВОИ ВОЗМОЖНОСТИ:
1. Анализировать видео и давать рекомендации по улучшению
2. Генерировать идеи контента
3. Помогать с написанием сценариев
4. Объяснять принципы работы алгоритма Instagram
5. Давать советы по улучшению хуков, retention, CTA

КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:
${context.knowledge_base?.join('\n\n') || 'Нет дополнительного контекста'}

${context.video_analysis ? `АНАЛИЗ ВИДЕО ПОЛЬЗОВАТЕЛЯ:\n${context.video_analysis}` : ''}

${context.user_positioning ? `ПОЗИЦИОНИРОВАНИЕ ПОЛЬЗОВАТЕЛЯ:\n${context.user_positioning}` : ''}

ПРАВИЛА:
1. Отвечай конкретно и по делу
2. Давай actionable советы
3. Приводи примеры когда возможно
4. Если не знаешь — честно скажи
5. Используй профессиональную терминологию, но объясняй её`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-10), // Last 10 messages for context
    { role: 'user', content: userMessage }
  ];

  return chatCompletion(apiKey, messages, {
    temperature: 0.7,
    max_tokens: 1500
  });
}

/**
 * Analyze video transcript and generate insights
 */
export async function analyzeTranscript(
  apiKey: string,
  transcript: string,
  language: string = 'ru'
): Promise<{
  summary: string;
  key_points: string[];
  hook_analysis: {
    detected: boolean;
    quality: 'strong' | 'weak' | 'missing';
    suggestion?: string;
  };
  cta_analysis: {
    detected: boolean;
    type?: string;
    suggestion?: string;
  };
  wpm: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  recommendations: string[];
}> {
  const systemPrompt = `Ты — эксперт по анализу контента Instagram Reels.

ЗАДАЧА: Проанализировать транскрипт видео и дать оценку.

ТРАНСКРИПТ:
${transcript}

ЯЗЫК: ${language}

Оцени:
1. Качество хука (первые 3-7 секунд)
2. Наличие и качество CTA
3. Общий sentiment
4. Темп речи (норма 120-150 WPM)
5. Ключевые моменты

ФОРМАТ ОТВЕТА (JSON):
{
  "summary": "Краткое содержание видео",
  "key_points": ["Ключевой пункт 1", "Ключевой пункт 2"],
  "hook_analysis": {
    "detected": true,
    "quality": "strong | weak | missing",
    "suggestion": "Совет по улучшению хука"
  },
  "cta_analysis": {
    "detected": true,
    "type": "engagement | follow | share | action",
    "suggestion": "Совет по улучшению CTA"
  },
  "wpm": 135,
  "sentiment": "positive | negative | neutral",
  "recommendations": ["Рекомендация 1", "Рекомендация 2"]
}`;

  const response = await chatCompletion(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Проанализируй этот транскрипт.' }
  ], {
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  try {
    return JSON.parse(response);
  } catch {
    console.error('Failed to parse transcript analysis:', response);
    return {
      summary: 'Не удалось проанализировать',
      key_points: [],
      hook_analysis: { detected: false, quality: 'missing' },
      cta_analysis: { detected: false },
      wpm: 0,
      sentiment: 'neutral',
      recommendations: []
    };
  }
}
