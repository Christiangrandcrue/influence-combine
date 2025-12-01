// Video Studio Routes
// AI-powered video creation: dubbing, avatars, editing

import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import * as elevenlabs from '../lib/elevenlabs';
import * as heygen from '../lib/heygen';

const studio = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ==================== VOICE CLONING & DUBBING ====================

// Get ElevenLabs voices
studio.get('/voices', async (c) => {
  try {
    const apiKey = c.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'ElevenLabs API не настроен' }, 500);
    }

    const voices = await elevenlabs.getVoices(apiKey);
    
    return c.json({
      success: true,
      voices: voices.map(v => ({
        id: v.voice_id,
        name: v.name,
        category: v.category,
        labels: v.labels
      }))
    });
  } catch (error: any) {
    console.error('Get voices error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Clone user's voice from audio sample
studio.post('/voice/clone', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'ElevenLabs API не настроен' }, 500);
    }

    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    const voiceName = formData.get('name') as string || `${user.email}_voice`;

    if (!audioFile) {
      return c.json({ success: false, error: 'Аудио файл обязателен' }, 400);
    }

    // Validate file size (max 10MB)
    if (audioFile.size > 10 * 1024 * 1024) {
      return c.json({ success: false, error: 'Файл слишком большой. Максимум 10MB' }, 400);
    }

    const audioBuffer = await audioFile.arrayBuffer();
    
    const result = await elevenlabs.cloneVoice(
      apiKey,
      voiceName,
      [{ data: audioBuffer, filename: audioFile.name }],
      `Cloned voice for user ${user.id}`
    );

    // Save voice ID to user record
    await c.env.DB.prepare(`
      UPDATE users SET 
        cloned_voice_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(result.voice_id, user.id).run();

    return c.json({
      success: true,
      voice_id: result.voice_id,
      voice_name: result.name,
      message: 'Голос успешно клонирован'
    });
  } catch (error: any) {
    console.error('Voice clone error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Start video dubbing (translation)
studio.post('/dub', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'ElevenLabs API не настроен' }, 500);
    }

    const formData = await c.req.formData();
    const videoFile = formData.get('video') as File | null;
    const sourceUrl = formData.get('source_url') as string | null;
    const targetLang = formData.get('target_lang') as string || 'en';
    const sourceLang = formData.get('source_lang') as string || 'ru';

    if (!videoFile && !sourceUrl) {
      return c.json({ success: false, error: 'Видео файл или URL обязателен' }, 400);
    }

    let dubbingOptions: Parameters<typeof elevenlabs.startDubbing>[1];

    if (videoFile) {
      // Validate file size (max 100MB)
      if (videoFile.size > 100 * 1024 * 1024) {
        return c.json({ success: false, error: 'Файл слишком большой. Максимум 100MB' }, 400);
      }

      const videoBuffer = await videoFile.arrayBuffer();
      dubbingOptions = {
        file: { 
          data: videoBuffer, 
          filename: videoFile.name,
          type: videoFile.type 
        },
        source_lang: sourceLang,
        target_lang: targetLang,
        watermark: false,
        name: `Dub_${user.id}_${Date.now()}`
      };
    } else {
      dubbingOptions = {
        source_url: sourceUrl!,
        source_lang: sourceLang,
        target_lang: targetLang,
        watermark: false,
        name: `Dub_${user.id}_${Date.now()}`
      };
    }

    const result = await elevenlabs.startDubbing(apiKey, dubbingOptions);

    // Save dubbing job to database
    const jobId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO studio_jobs (id, user_id, type, external_id, status, params, created_at)
      VALUES (?, ?, 'dubbing', ?, 'processing', ?, datetime('now'))
    `).bind(
      jobId,
      user.id,
      result.dubbing_id,
      JSON.stringify({ source_lang: sourceLang, target_lang: targetLang })
    ).run();

    return c.json({
      success: true,
      job_id: jobId,
      dubbing_id: result.dubbing_id,
      expected_duration_sec: result.expected_duration_sec,
      message: 'Дублирование запущено'
    });
  } catch (error: any) {
    console.error('Dubbing error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Check dubbing status
studio.get('/dub/:dubbingId/status', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'ElevenLabs API не настроен' }, 500);
    }

    const dubbingId = c.req.param('dubbingId');
    const status = await elevenlabs.getDubbingStatus(apiKey, dubbingId);

    // Update job status in database
    if (status.status === 'dubbed' || status.status === 'failed') {
      await c.env.DB.prepare(`
        UPDATE studio_jobs SET 
          status = ?,
          error_message = ?,
          updated_at = datetime('now')
        WHERE external_id = ? AND user_id = ?
      `).bind(
        status.status === 'dubbed' ? 'completed' : 'failed',
        status.error || null,
        dubbingId,
        user.id
      ).run();
    }

    return c.json({
      success: true,
      status: status.status,
      target_languages: status.target_languages,
      error: status.error
    });
  } catch (error: any) {
    console.error('Dubbing status error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Download dubbed video
studio.get('/dub/:dubbingId/download/:lang', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'ElevenLabs API не настроен' }, 500);
    }

    const dubbingId = c.req.param('dubbingId');
    const lang = c.req.param('lang');

    const audioData = await elevenlabs.getDubbedFile(apiKey, dubbingId, lang);

    return new Response(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="dubbed_${lang}.mp3"`
      }
    });
  } catch (error: any) {
    console.error('Download dubbed error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Text to Speech with cloned voice
studio.post('/tts', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'ElevenLabs API не настроен' }, 500);
    }

    const body = await c.req.json<{
      text: string;
      voice_id?: string;
    }>();

    if (!body.text) {
      return c.json({ success: false, error: 'Текст обязателен' }, 400);
    }

    // Use cloned voice if available, otherwise use default
    const voiceId = body.voice_id || (user as any).cloned_voice_id || 'EXAVITQu4vr4xnSDxMaL'; // Default: Sarah

    const audioData = await elevenlabs.textToSpeech(apiKey, body.text, {
      voice_id: voiceId
    });

    return new Response(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="speech.mp3"'
      }
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== AI AVATAR ====================

// Get available avatars
studio.get('/avatars', async (c) => {
  try {
    const apiKey = c.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'HeyGen API не настроен' }, 500);
    }

    const avatars = await heygen.getAvatars(apiKey);
    
    return c.json({
      success: true,
      avatars: avatars.slice(0, 50).map(a => ({
        id: a.avatar_id,
        name: a.avatar_name,
        gender: a.gender,
        preview_image: a.preview_image_url,
        preview_video: a.preview_video_url
      }))
    });
  } catch (error: any) {
    console.error('Get avatars error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get HeyGen voices
studio.get('/avatar-voices', async (c) => {
  try {
    const apiKey = c.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'HeyGen API не настроен' }, 500);
    }

    const voices = await heygen.getVoices(apiKey);
    
    // Filter Russian and English voices
    const filteredVoices = voices.filter(v => 
      v.language === 'Russian' || v.language === 'English'
    );

    return c.json({
      success: true,
      voices: filteredVoices.map(v => ({
        id: v.voice_id,
        name: v.name,
        language: v.language,
        gender: v.gender,
        preview_audio: v.preview_audio
      }))
    });
  } catch (error: any) {
    console.error('Get avatar voices error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Upload custom talking photo
studio.post('/avatar/upload-photo', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'HeyGen API не настроен' }, 500);
    }

    const formData = await c.req.formData();
    const photoFile = formData.get('photo') as File | null;

    if (!photoFile) {
      return c.json({ success: false, error: 'Фото обязательно' }, 400);
    }

    // Validate file size (max 5MB)
    if (photoFile.size > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'Файл слишком большой. Максимум 5MB' }, 400);
    }

    const photoBuffer = await photoFile.arrayBuffer();
    const result = await heygen.uploadTalkingPhoto(apiKey, photoBuffer, photoFile.name);

    // Save talking photo ID to user record
    await c.env.DB.prepare(`
      UPDATE users SET 
        talking_photo_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(result.talking_photo_id, user.id).run();

    return c.json({
      success: true,
      talking_photo_id: result.talking_photo_id,
      talking_photo_name: result.talking_photo_name,
      message: 'Фото для аватара загружено'
    });
  } catch (error: any) {
    console.error('Upload talking photo error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Generate avatar video
studio.post('/avatar/generate', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'HeyGen API не настроен' }, 500);
    }

    const body = await c.req.json<{
      text: string;
      avatar_id?: string;
      voice_id?: string;
      aspect_ratio?: '16:9' | '9:16' | '1:1';
      background_color?: string;
      use_custom_avatar?: boolean;
      test?: boolean;
    }>();

    if (!body.text) {
      return c.json({ success: false, error: 'Текст обязателен' }, 400);
    }

    // Check if user has custom talking photo
    const userData = await c.env.DB.prepare(`
      SELECT talking_photo_id FROM users WHERE id = ?
    `).bind(user.id).first<{ talking_photo_id: string | null }>();

    const videoId = await heygen.createAvatarVideo(apiKey, {
      text: body.text,
      avatarId: body.use_custom_avatar ? undefined : (body.avatar_id || 'Daisy-inskirt-20220818'),
      talkingPhotoId: body.use_custom_avatar ? userData?.talking_photo_id || undefined : undefined,
      voiceId: body.voice_id || 'en-US-JennyNeural', // Default English voice
      aspectRatio: body.aspect_ratio || '9:16',
      background: body.background_color ? { type: 'color', value: body.background_color } : undefined,
      test: body.test ?? false
    });

    // Save job to database
    const jobId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO studio_jobs (id, user_id, type, external_id, status, params, created_at)
      VALUES (?, ?, 'avatar_video', ?, 'processing', ?, datetime('now'))
    `).bind(
      jobId,
      user.id,
      videoId,
      JSON.stringify({ text: body.text.substring(0, 100) })
    ).run();

    return c.json({
      success: true,
      job_id: jobId,
      video_id: videoId,
      message: 'Генерация видео запущена'
    });
  } catch (error: any) {
    console.error('Generate avatar video error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Check avatar video status
studio.get('/avatar/video/:videoId/status', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const apiKey = c.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'HeyGen API не настроен' }, 500);
    }

    const videoId = c.req.param('videoId');
    const status = await heygen.getVideoStatus(apiKey, videoId);

    // Update job status in database
    if (status.status === 'completed' || status.status === 'failed') {
      await c.env.DB.prepare(`
        UPDATE studio_jobs SET 
          status = ?,
          result_url = ?,
          error_message = ?,
          updated_at = datetime('now')
        WHERE external_id = ? AND user_id = ?
      `).bind(
        status.status,
        status.video_url || null,
        status.error || null,
        videoId,
        user.id
      ).run();
    }

    return c.json({
      success: true,
      status: status.status,
      video_url: status.video_url,
      thumbnail_url: status.thumbnail_url,
      duration: status.duration,
      error: status.error
    });
  } catch (error: any) {
    console.error('Avatar video status error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== USER JOBS ====================

// Get user's studio jobs
studio.get('/jobs', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const jobs = await c.env.DB.prepare(`
      SELECT * FROM studio_jobs 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).bind(user.id).all();

    return c.json({
      success: true,
      jobs: jobs.results?.map((j: any) => ({
        id: j.id,
        type: j.type,
        status: j.status,
        result_url: j.result_url,
        error_message: j.error_message,
        params: j.params ? JSON.parse(j.params) : null,
        created_at: j.created_at,
        updated_at: j.updated_at
      })) || []
    });
  } catch (error: any) {
    console.error('Get jobs error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get API quotas
studio.get('/quota', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }

    const results: any = {
      elevenlabs: null,
      heygen: null
    };

    // ElevenLabs quota
    const elevenLabsKey = c.env.ELEVENLABS_API_KEY;
    if (elevenLabsKey) {
      try {
        const sub = await elevenlabs.getSubscription(elevenLabsKey);
        results.elevenlabs = {
          character_count: sub.character_count,
          character_limit: sub.character_limit,
          can_clone_voice: sub.can_use_instant_voice_cloning
        };
      } catch (e) {
        console.error('ElevenLabs quota error:', e);
      }
    }

    // HeyGen quota
    const heygenKey = c.env.HEYGEN_API_KEY;
    if (heygenKey) {
      try {
        const quota = await heygen.getQuota(heygenKey);
        results.heygen = {
          remaining_credits: quota.remaining_quota,
          used_credits: quota.used_quota
        };
      } catch (e) {
        console.error('HeyGen quota error:', e);
      }
    }

    return c.json({
      success: true,
      quota: results
    });
  } catch (error: any) {
    console.error('Get quota error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default studio;
