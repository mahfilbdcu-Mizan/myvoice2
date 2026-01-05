import { supabase } from "@/integrations/supabase/client";

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string;
  high_quality_base_model_ids?: string[];
  fine_tuning?: {
    is_allowed_to_fine_tune: boolean;
    state?: Record<string, string>;
  };
  samples?: Array<{
    sample_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    hash: string;
  }>;
  settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface VoiceModel {
  model_id: string;
  name: string;
  can_be_finetuned: boolean;
  can_do_text_to_speech: boolean;
  can_do_voice_conversion: boolean;
  can_use_style: boolean;
  can_use_speaker_boost: boolean;
  serves_pro_voices: boolean;
  token_cost_factor: number;
  description: string;
  requires_alpha_access: boolean;
  max_characters_request_free_user: number;
  max_characters_request_subscribed_user: number;
  maximum_text_length_per_request: number;
  languages: Array<{
    language_id: string;
    name: string;
  }>;
}

export interface TaskResult {
  id: string;
  created_at: string;
  status: "pending" | "processing" | "done" | "failed";
  error_message: string | null;
  credit_cost: number;
  metadata: {
    audio_url?: string;
    srt_url?: string;
    json_url?: string;
  };
  type: string;
}

// Fetch voices from ai33.pro API
export async function fetchVoicesFromAPI(type: "recommended" | "shared" = "recommended"): Promise<Voice[]> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-voices`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Error fetching voices:", error);
      return [];
    }

    const data = await response.json();
    return data.voices || [];
  } catch (err) {
    console.error("Error fetching voices:", err);
    return [];
  }
}

// Fetch models from ai33.pro API
export async function fetchModelsFromAPI(): Promise<VoiceModel[]> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-models`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Error fetching models:", error);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (err) {
    console.error("Error fetching models:", err);
    return [];
  }
}

export interface GenerateOptions {
  text: string;
  voiceId: string;
  model?: string;
  stability?: number;
  similarity?: number;
  style?: number;
}

export interface GenerateResult {
  audioUrl?: string;
  taskId?: string;
  error?: string;
}

// Generate speech using ai33.pro API
export async function generateSpeech(options: GenerateOptions): Promise<GenerateResult> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-speech`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(options),
      }
    );

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || "Failed to generate speech" };
    }

    // Check if response is audio or task JSON
    if (contentType.includes("audio/")) {
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      return { audioUrl };
    } else {
      // Task-based response
      const taskData = await response.json();
      if (taskData.success && taskData.task_id) {
        return { taskId: taskData.task_id };
      }
      return { error: taskData.error || "Unknown response format" };
    }
  } catch (err) {
    console.error("Error generating speech:", err);
    return { error: "Network error. Please try again." };
  }
}

// Poll task status
export async function getTaskStatus(taskId: string): Promise<TaskResult | null> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-task`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ taskId }),
      }
    );

    if (!response.ok) {
      console.error("Error getting task status");
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("Error getting task status:", err);
    return null;
  }
}

// Poll until task is complete
export async function waitForTask(taskId: string, maxAttempts = 60, intervalMs = 2000): Promise<TaskResult | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const task = await getTaskStatus(taskId);
    
    if (!task) return null;
    
    if (task.status === "done") {
      return task;
    }
    
    if (task.status === "failed") {
      return task;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return null;
}

// Helper to parse voice labels into structured data
export function parseVoiceLabels(voice: Voice): {
  accent?: string;
  gender?: string;
  age?: string;
  description?: string;
  useCase?: string;
} {
  const labels = voice.labels || {};
  return {
    accent: labels.accent,
    gender: labels.gender,
    age: labels.age,
    description: labels.description || voice.description,
    useCase: labels.use_case,
  };
}

// Legacy function for backward compatibility with database voices
export async function getVoices(): Promise<Voice[]> {
  // Fetch from API instead of database
  return fetchVoicesFromAPI("recommended");
}

export async function getVoiceById(voiceId: string): Promise<Voice | null> {
  // Try to find in recommended voices first
  const voices = await fetchVoicesFromAPI("recommended");
  const found = voices.find(v => v.voice_id === voiceId);
  if (found) return found;
  
  // Try shared voices
  const sharedVoices = await fetchVoicesFromAPI("shared");
  return sharedVoices.find(v => v.voice_id === voiceId) || null;
}

export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  
  if (fetchError || !profile) {
    console.error("Error fetching profile:", fetchError);
    return false;
  }
  
  const newCredits = (profile.credits || 0) - amount;
  if (newCredits < 0) {
    console.error("Insufficient credits");
    return false;
  }
  
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ credits: newCredits })
    .eq("id", userId);
  
  if (updateError) {
    console.error("Error updating credits:", updateError);
    return false;
  }
  
  return true;
}
