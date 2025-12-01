// ElevenLabs API Integration
// Voice cloning, text-to-speech, and video dubbing

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

interface VoiceCloneResponse {
  voice_id: string;
  name: string;
}

interface TextToSpeechOptions {
  voice_id: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

interface DubbingResponse {
  dubbing_id: string;
  expected_duration_sec: number;
}

interface DubbingStatus {
  dubbing_id: string;
  name: string;
  status: 'dubbing' | 'dubbed' | 'failed';
  target_languages: string[];
  error?: string;
}

// Get available voices
export async function getVoices(apiKey: string): Promise<Voice[]> {
  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: {
      'xi-api-key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const data = await response.json() as { voices: Voice[] };
  return data.voices;
}

// Clone voice from audio samples
export async function cloneVoice(
  apiKey: string,
  name: string,
  audioFiles: { data: ArrayBuffer; filename: string }[],
  description?: string
): Promise<VoiceCloneResponse> {
  const formData = new FormData();
  formData.append('name', name);
  
  if (description) {
    formData.append('description', description);
  }

  // Add audio files
  for (const file of audioFiles) {
    const blob = new Blob([file.data], { type: 'audio/mpeg' });
    formData.append('files', blob, file.filename);
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voice cloning failed: ${error}`);
  }

  return response.json();
}

// Text to Speech
export async function textToSpeech(
  apiKey: string,
  text: string,
  options: TextToSpeechOptions
): Promise<ArrayBuffer> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${options.voice_id}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: options.model_id || 'eleven_multilingual_v2',
        voice_settings: options.voice_settings || {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS failed: ${error}`);
  }

  return response.arrayBuffer();
}

// Start video dubbing (translation with voice cloning)
export async function startDubbing(
  apiKey: string,
  options: {
    file?: { data: ArrayBuffer; filename: string; type: string };
    source_url?: string;
    source_lang?: string;
    target_lang: string;
    num_speakers?: number;
    watermark?: boolean;
    name?: string;
  }
): Promise<DubbingResponse> {
  const formData = new FormData();
  
  if (options.file) {
    const blob = new Blob([options.file.data], { type: options.file.type });
    formData.append('file', blob, options.file.filename);
  } else if (options.source_url) {
    formData.append('source_url', options.source_url);
  } else {
    throw new Error('Either file or source_url is required');
  }

  formData.append('target_lang', options.target_lang);
  
  if (options.source_lang) {
    formData.append('source_lang', options.source_lang);
  }
  if (options.num_speakers) {
    formData.append('num_speakers', options.num_speakers.toString());
  }
  if (options.watermark !== undefined) {
    formData.append('watermark', options.watermark.toString());
  }
  if (options.name) {
    formData.append('name', options.name);
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/dubbing`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Dubbing start failed: ${error}`);
  }

  return response.json();
}

// Check dubbing status
export async function getDubbingStatus(
  apiKey: string,
  dubbingId: string
): Promise<DubbingStatus> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/dubbing/${dubbingId}`,
    {
      headers: {
        'xi-api-key': apiKey
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get dubbing status: ${response.status}`);
  }

  return response.json();
}

// Get dubbed audio/video
export async function getDubbedFile(
  apiKey: string,
  dubbingId: string,
  languageCode: string
): Promise<ArrayBuffer> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/dubbing/${dubbingId}/audio/${languageCode}`,
    {
      headers: {
        'xi-api-key': apiKey
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get dubbed file: ${response.status}`);
  }

  return response.arrayBuffer();
}

// Delete cloned voice
export async function deleteVoice(apiKey: string, voiceId: string): Promise<void> {
  const response = await fetch(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
    method: 'DELETE',
    headers: {
      'xi-api-key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to delete voice: ${response.status}`);
  }
}

// Get user subscription info
export async function getSubscription(apiKey: string): Promise<{
  character_count: number;
  character_limit: number;
  can_use_instant_voice_cloning: boolean;
  available_models: { model_id: string; display_name: string }[];
}> {
  const response = await fetch(`${ELEVENLABS_API_URL}/user/subscription`, {
    headers: {
      'xi-api-key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get subscription: ${response.status}`);
  }

  return response.json();
}
