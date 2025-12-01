// HeyGen API Integration
// AI Avatar video generation

const HEYGEN_API_URL = 'https://api.heygen.com/v2';
const HEYGEN_API_URL_V1 = 'https://api.heygen.com/v1';

interface Avatar {
  avatar_id: string;
  avatar_name: string;
  gender: string;
  preview_image_url: string;
  preview_video_url: string;
}

interface Voice {
  voice_id: string;
  language: string;
  gender: string;
  name: string;
  preview_audio: string;
  support_pause: boolean;
  emotion_support: boolean;
}

interface VideoGenerateRequest {
  video_inputs: {
    character: {
      type: 'avatar' | 'talking_photo';
      avatar_id?: string;
      avatar_style?: 'normal' | 'circle' | 'closeUp';
      talking_photo_id?: string;
      talking_photo_style?: 'normal' | 'circle' | 'closeUp';
      talking_style?: 'stable' | 'expressive';
      expression?: 'default' | 'happy' | 'serious' | 'friendly';
    };
    voice: {
      type: 'text' | 'audio';
      input_text?: string;
      voice_id?: string;
      speed?: number;
      pitch?: number;
      input_audio?: string;
    };
    background?: {
      type: 'color' | 'image' | 'video';
      value: string;
    };
  }[];
  dimension?: {
    width: number;
    height: number;
  };
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  test?: boolean;
  caption?: boolean;
}

interface VideoGenerateResponse {
  error: null | string;
  data: {
    video_id: string;
  };
}

interface VideoStatusResponse {
  error: null | string;
  data: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    caption_url?: string;
    gif_url?: string;
    error?: string;
  };
}

interface TalkingPhotoUploadResponse {
  error: null | string;
  data: {
    talking_photo_id: string;
    talking_photo_name: string;
  };
}

// Get available avatars
export async function getAvatars(apiKey: string): Promise<Avatar[]> {
  const response = await fetch(`${HEYGEN_API_URL}/avatars`, {
    headers: {
      'X-Api-Key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`HeyGen API error: ${response.status}`);
  }

  const data = await response.json() as { error: null; data: { avatars: Avatar[] } };
  return data.data.avatars;
}

// Get available voices
export async function getVoices(apiKey: string): Promise<Voice[]> {
  const response = await fetch(`${HEYGEN_API_URL}/voices`, {
    headers: {
      'X-Api-Key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`HeyGen API error: ${response.status}`);
  }

  const data = await response.json() as { error: null; data: { voices: Voice[] } };
  return data.data.voices;
}

// Upload talking photo (for custom avatar)
export async function uploadTalkingPhoto(
  apiKey: string,
  imageData: ArrayBuffer,
  filename: string
): Promise<TalkingPhotoUploadResponse['data']> {
  const formData = new FormData();
  const blob = new Blob([imageData], { type: 'image/jpeg' });
  formData.append('file', blob, filename);

  const response = await fetch(`${HEYGEN_API_URL_V1}/talking_photo`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload talking photo failed: ${error}`);
  }

  const data = await response.json() as TalkingPhotoUploadResponse;
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data.data;
}

// Generate video with avatar
export async function generateVideo(
  apiKey: string,
  request: VideoGenerateRequest
): Promise<string> {
  console.log('HeyGen request:', JSON.stringify(request, null, 2));
  
  const response = await fetch(`${HEYGEN_API_URL}/video/generate`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  const responseText = await response.text();
  console.log('HeyGen response status:', response.status);
  console.log('HeyGen response:', responseText);

  if (!response.ok) {
    throw new Error(`Video generation failed (${response.status}): ${responseText}`);
  }

  let data: VideoGenerateResponse;
  try {
    data = JSON.parse(responseText) as VideoGenerateResponse;
  } catch (e) {
    throw new Error(`Invalid HeyGen response: ${responseText}`);
  }
  
  if (data.error) {
    throw new Error(`HeyGen error: ${data.error}`);
  }

  return data.data.video_id;
}

// Check video generation status
export async function getVideoStatus(
  apiKey: string,
  videoId: string
): Promise<VideoStatusResponse['data']> {
  const response = await fetch(`${HEYGEN_API_URL}/video_status.get?video_id=${videoId}`, {
    headers: {
      'X-Api-Key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get video status: ${response.status}`);
  }

  const data = await response.json() as VideoStatusResponse;
  if (data.error) {
    throw new Error(data.error);
  }

  return data.data;
}

// Simple video generation helper
export async function createAvatarVideo(
  apiKey: string,
  options: {
    text: string;
    avatarId?: string;
    talkingPhotoId?: string;
    voiceId: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    background?: { type: 'color' | 'image'; value: string };
    test?: boolean;
  }
): Promise<string> {
  const character: VideoGenerateRequest['video_inputs'][0]['character'] = options.talkingPhotoId
    ? {
        type: 'talking_photo',
        talking_photo_id: options.talkingPhotoId,
        talking_style: 'expressive'
      }
    : {
        type: 'avatar',
        avatar_id: options.avatarId || 'Daisy-inskirt-20220818',
        avatar_style: 'normal',
        talking_style: 'expressive'
      };

  const request: VideoGenerateRequest = {
    video_inputs: [
      {
        character,
        voice: {
          type: 'text',
          input_text: options.text,
          voice_id: options.voiceId,
          speed: 1.0
        },
        background: options.background || {
          type: 'color',
          value: '#1a1a2e'
        }
      }
    ],
    aspect_ratio: options.aspectRatio || '9:16',
    test: options.test ?? false
  };

  return generateVideo(apiKey, request);
}

// Get remaining quota
export async function getQuota(apiKey: string): Promise<{
  remaining_quota: number;
  used_quota: number;
}> {
  const response = await fetch(`${HEYGEN_API_URL_V1}/user/remaining_quota`, {
    headers: {
      'X-Api-Key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get quota: ${response.status}`);
  }

  const data = await response.json() as { 
    error: null; 
    data: { remaining_quota: number; used_quota: number } 
  };
  return data.data;
}

// List user's talking photos
export async function listTalkingPhotos(apiKey: string): Promise<{
  talking_photo_id: string;
  talking_photo_name: string;
  preview_image_url: string;
}[]> {
  const response = await fetch(`${HEYGEN_API_URL_V1}/talking_photo.list`, {
    headers: {
      'X-Api-Key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to list talking photos: ${response.status}`);
  }

  const data = await response.json() as { 
    error: null; 
    data: { talking_photos: { talking_photo_id: string; talking_photo_name: string; preview_image_url: string }[] } 
  };
  return data.data.talking_photos;
}
