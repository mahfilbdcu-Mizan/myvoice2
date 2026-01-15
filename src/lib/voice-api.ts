import { supabase } from "@/integrations/supabase/client";

// Helper to get authenticated headers for edge function calls
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  return {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: token ? `Bearer ${token}` : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  };
}

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
  audio_url?: string; // Top level audio URL (normalized)
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
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-speech`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: options.text,
          voiceId: options.voiceId,
          voiceName: options.voiceName,
          model: options.model,
          stability: options.stability,
          similarity: options.similarity,
          style: options.style,
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
      
      // Check if it directly has an audio URL
      if (taskData.audioUrl) {
        return { audioUrl: taskData.audioUrl };
      }
      
      // API returns 'taskId' from our edge function (which gets 'task_id' from AI33)
      const taskId = taskData.taskId || taskData.task_id || taskData.id;
      if (taskId) {
        console.log("Got task ID for polling:", taskId);
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
export async function getTaskStatus(taskId: string, userId?: string): Promise<TaskResult | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-task`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ taskId }),
      }
    );

    if (!response.ok) {
      console.error("Error getting task status:", response.status);
      return null;
    }

    const data = await response.json();
    
    console.log("Raw task response from get-task:", JSON.stringify(data));
    
    // Normalize audio_url location - edge function should return it at top level AND in metadata
    // Check ALL possible locations
    const audioUrl = 
      data.audio_url || 
      data.metadata?.audio_url || 
      data.result?.audio_url ||
      data.output?.audio_url ||
      (typeof data.output === 'string' && data.output.startsWith('http') ? data.output : null);
    
    // Ensure metadata exists and audio_url is set correctly
    if (!data.metadata) {
      data.metadata = {};
    }
    if (audioUrl && typeof audioUrl === 'string') {
      data.metadata.audio_url = audioUrl;
      // Also set at top level for easy access
      data.audio_url = audioUrl;
    }
    
    // CRITICAL: Only mark as "processing" if status is "done" but NO audio_url
    // This ensures polling continues until audio is available
    const normalizedStatus = data.status?.toLowerCase() || "processing";
    const isDone = normalizedStatus === "done" || normalizedStatus === "completed" || normalizedStatus === "success";
    const isError = normalizedStatus === "error" || normalizedStatus === "failed";
    
    if (isDone && audioUrl && typeof audioUrl === 'string') {
      // Task is truly complete with audio
      data.status = "done";
      data.progress = 100;
    } else if (isDone && !audioUrl) {
      // API says done but no audio - keep polling (API might be lagging)
      console.log("Status is done but no audio URL yet, continuing to poll...");
      data.status = "processing";
      data.progress = data.progress || 90; // Almost done
    } else if (isError) {
      data.status = "error";
    } else {
      // Still processing
      data.status = "processing";
    }
    
    console.log("Final task status:", data.status, "audio_url:", data.metadata?.audio_url || data.audio_url);
    
    return data;
  } catch (err) {
    console.error("Error getting task status:", err);
    return null;
  }
}

// Poll until task is complete with progress callback
// Unlimited polling - will keep polling until task completes or fails
export async function waitForTask(
  taskId: string, 
  userId?: string, 
  maxAttempts = 18000, // Default: 18000 attempts = 10 hours (at 2s interval) - effectively unlimited
  intervalMs = 2000,
  onProgress?: (progress: number, status: string) => void
): Promise<TaskResult | null> {
  console.log(`Starting unlimited polling for task: ${taskId}`);
  
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5; // Give up after 5 consecutive errors
  
  for (let i = 0; i < maxAttempts; i++) {
    const task = await getTaskStatus(taskId, userId);
    
    console.log(`Task poll attempt ${i + 1}/${maxAttempts}:`, task?.status, task?.progress, "audio:", task?.audio_url || task?.metadata?.audio_url);
    
    if (!task) {
      consecutiveErrors++;
      console.log(`No task returned (error ${consecutiveErrors}/${maxConsecutiveErrors}), continuing poll...`);
      
      // If too many consecutive errors, the task might be expired
      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.log("Too many consecutive errors, task may be expired");
        return { 
          id: taskId, 
          status: "error", 
          error_message: "Task expired or not found",
          progress: 0 
        } as TaskResult;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      continue;
    }
    
    // Reset error counter on successful response
    consecutiveErrors = 0;
    
    // Report progress
    const progress = task.progress ?? 0;
    if (onProgress) {
      onProgress(progress, task.status);
    }
    
    // Check for audio URL in normalized locations
    const audioUrl = task.audio_url || task.metadata?.audio_url;
    
    // Task is complete with audio
    if (task.status === "done" && audioUrl) {
      console.log("Task completed successfully with audio:", audioUrl);
      if (onProgress) onProgress(100, "done");
      return task;
    }
    
    // Task failed
    if (task.status === "error" || task.status === "failed") {
      console.log("Task failed:", task.error_message);
      return task;
    }
    
    // Task still processing - wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  console.log(`Task polling timed out after ${maxAttempts} attempts`);
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
