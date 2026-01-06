import { supabase } from "@/integrations/supabase/client";

export interface Voice {
  voice_id: string;
  public_owner_id?: string;
  name: string;
  category?: string;
  description?: string;
  // Flat fields from shared-voices API
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
  locale?: string;
  use_case?: string;
  descriptive?: string;
  // Nested labels for v2/voices API
  labels?: Record<string, string>;
  preview_url?: string;
  image_url?: string;
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
  verified_languages?: Array<{
    accent: string;
    language: string;
    locale: string;
    model_id: string;
    preview_url: string;
  }>;
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
  status: "pending" | "processing" | "doing" | "done" | "error" | "failed";
  error_message: string | null;
  credit_cost: number;
  progress?: number;
  metadata: {
    audio_url?: string;
    srt_url?: string;
    json_url?: string;
  };
  type: string;
}

export interface FetchVoicesOptions {
  page_size?: number;
  page?: number;
  search?: string;
  gender?: string;
  language?: string;
  age?: string;
  accent?: string;
  category?: string;
}

export interface FetchVoicesResult {
  voices: Voice[];
  has_more: boolean;
  last_sort_id?: string;
}

// Fetch voices from Voice API with pagination
export async function fetchVoicesFromAPI(options: FetchVoicesOptions = {}): Promise<FetchVoicesResult> {
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
        body: JSON.stringify({
          page_size: options.page_size || 100,
          page: options.page || 0,
          search: options.search || "",
          gender: options.gender || "",
          language: options.language || "",
          age: options.age || "",
          accent: options.accent || "",
          category: options.category || "",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Error fetching voices:", error);
      return { voices: [], has_more: false };
    }

    const data = await response.json();
    return {
      voices: data.voices || [],
      has_more: data.has_more || false,
      last_sort_id: data.last_sort_id,
    };
  } catch (err) {
    console.error("Error fetching voices:", err);
    return { voices: [], has_more: false };
  }
}

// Fetch all voices with automatic pagination
export async function fetchAllVoices(): Promise<Voice[]> {
  const allVoices: Voice[] = [];
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const result = await fetchVoicesFromAPI({ page_size: 100, page });
    allVoices.push(...result.voices);
    hasMore = result.has_more;
    page++;
    
    // Safety limit to prevent infinite loops
    if (page > 50) break;
  }
  
  return allVoices;
}

// Fetch models from Voice API
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
  voiceName?: string;
  model?: string;
  stability?: number;
  similarity?: number;
  style?: number;
  userId?: string;
}

export interface GenerateResult {
  audioUrl?: string;
  taskId?: string;
  localTaskId?: string;
  error?: string;
}

// Generate speech using Voice API
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
        body: JSON.stringify({
          text: options.text,
          voiceId: options.voiceId,
          voiceName: options.voiceName,
          model: options.model,
          stability: options.stability,
          similarity: options.similarity,
          style: options.style,
          userId: options.userId,
        }),
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
      console.log("Task response:", taskData);
      
      // API returns 'id' not 'task_id'
      const taskId = taskData.id || taskData.task_id;
      if (taskId) {
        return { taskId, localTaskId: taskData.localTaskId };
      }
      if (taskData.localTaskId) {
        return { localTaskId: taskData.localTaskId };
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
    
    console.log(`Task poll ${i + 1}:`, task);
    
    if (!task) return null;
    
    // API returns "done" for success and "error" for failure
    if (task.status === "done") {
      return task;
    }
    
    if (task.status === "error" || task.status === "failed") {
      return task;
    }
    
    // Task still processing ("doing", "pending", "processing")
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return null;
}

// Helper to parse voice labels into structured data (supports both flat and nested formats)
export function parseVoiceLabels(voice: Voice): {
  accent?: string;
  gender?: string;
  age?: string;
  description?: string;
  useCase?: string;
} {
  // Support both flat fields (shared-voices API) and nested labels (v2/voices API)
  const labels = voice.labels || {};
  return {
    accent: voice.accent || labels.accent,
    gender: voice.gender || labels.gender,
    age: voice.age || labels.age,
    description: voice.description || labels.description,
    useCase: voice.use_case || labels.use_case,
  };
}

// Legacy function for backward compatibility with database voices
export async function getVoices(): Promise<Voice[]> {
  // Fetch from API instead of database
  const result = await fetchVoicesFromAPI({ page_size: 100 });
  return result.voices;
}

export async function getVoiceById(voiceId: string): Promise<Voice | null> {
  // Search for specific voice by ID
  const result = await fetchVoicesFromAPI({ search: voiceId, page_size: 10 });
  return result.voices.find(v => v.voice_id === voiceId) || null;
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
