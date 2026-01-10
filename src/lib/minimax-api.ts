// Minimax Voice API
import { supabase } from "@/integrations/supabase/client";

export interface MinimaxVoice {
  voice_id: string;
  parent_voice_id: string;
  voice_name: string;
  tag_list: string[];
  cover_url: string;
  sample_audio: string;
  description: string;
  collected: boolean;
  voice_status: number;
}

export interface MinimaxConfig {
  models?: Array<{ id: string; name: string }>;
  languages?: string[];
  tags?: string[];
}

export interface VoiceClone {
  voice_id: string;
  voice_name: string;
  tag_list: string[];
  cover_url: string;
  sample_audio: string;
  create_time: number;
  voice_status: number;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  return {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: token 
      ? `Bearer ${token}` 
      : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  };
}

export async function fetchMinimaxVoices(options: {
  page?: number;
  page_size?: number;
  tag_list?: string[];
} = {}): Promise<{ voices: MinimaxVoice[]; has_more: boolean; total: number }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-minimax-voices`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          page: options.page || 1,
          page_size: options.page_size || 30,
          tag_list: options.tag_list || [],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch Minimax voices");
    }

    const data = await response.json();
    return {
      voices: data.data?.voice_list || [],
      has_more: data.data?.has_more || false,
      total: parseInt(data.data?.total || "0"),
    };
  } catch (error) {
    console.error("Error fetching Minimax voices:", error);
    return { voices: [], has_more: false, total: 0 };
  }
}

export async function fetchMinimaxConfig(): Promise<MinimaxConfig> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-minimax-config`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch Minimax config");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Minimax config:", error);
    return {};
  }
}

export async function generateMinimaxSpeech(options: {
  text: string;
  voiceId: string;
  voiceName?: string;
  model?: string;
  vol?: number;
  pitch?: number;
  speed?: number;
  language_boost?: string;
  with_transcript?: boolean;
}): Promise<{ success?: boolean; taskId?: string; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-minimax-speech`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: options.text,
          voiceId: options.voiceId,
          voiceName: options.voiceName,
          model: options.model || "speech-2.6-hd",
          vol: options.vol || 1,
          pitch: options.pitch || 0,
          speed: options.speed || 1,
          language_boost: options.language_boost || "Auto",
          with_transcript: options.with_transcript || false,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.error || "Failed to generate speech" };
    }

    const data = await response.json();
    return {
      success: data.success,
      taskId: data.taskId,
    };
  } catch (error) {
    console.error("Error generating Minimax speech:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function cloneVoice(options: {
  file: File;
  voiceName: string;
  previewText?: string;
  languageTag?: string;
  needNoiseReduction?: boolean;
  genderTag?: "male" | "female";
}): Promise<{ success?: boolean; clonedVoiceId?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const formData = new FormData();
    formData.append("file", options.file);
    formData.append("voice_name", options.voiceName);
    formData.append("preview_text", options.previewText || "Hello world");
    formData.append("language_tag", options.languageTag || "English");
    formData.append("need_noise_reduction", String(options.needNoiseReduction || false));
    formData.append("gender_tag", options.genderTag || "male");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clone-voice`,
      {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: token 
            ? `Bearer ${token}` 
            : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.error || "Failed to clone voice" };
    }

    const data = await response.json();
    return {
      success: data.success,
      clonedVoiceId: data.cloned_voice_id,
    };
  } catch (error) {
    console.error("Error cloning voice:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function listVoiceClones(): Promise<{ clones: VoiceClone[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-voice-clones`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { clones: [], error: error.error || "Failed to list voice clones" };
    }

    const data = await response.json();
    return { clones: data.data || [] };
  } catch (error) {
    console.error("Error listing voice clones:", error);
    return { clones: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteVoiceClone(voiceCloneId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-voice-clone`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ voiceCloneId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.error || "Failed to delete voice clone" };
    }

    const data = await response.json();
    return { success: data.success };
  } catch (error) {
    console.error("Error deleting voice clone:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
