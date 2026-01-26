import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute

// Validate JWT and get user ID
async function validateAuth(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, error: "Missing or invalid authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return { userId: null, error: "Server configuration error" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error("Auth validation error:", error?.message);
    return { userId: null, error: "Invalid or expired token" };
  }

  return { userId: data.user.id, error: null };
}

// Check rate limit for user
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    // If we can't check, allow but log
    console.warn("Cannot check rate limit - missing Supabase config");
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Calculate current window start (rounded to minute)
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS);
  
  // Clean up old rate limit entries first
  await supabase.rpc('cleanup_old_rate_limits');
  
  // Count requests in current window
  const { count, error: countError } = await supabase
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", "generate-speech")
    .gte("window_start", windowStart.toISOString());
  
  if (countError) {
    console.error("Error checking rate limit:", countError);
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW };
  }
  
  const currentCount = count || 0;
  
  if (currentCount >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }
  
  // Record this request
  const { error: insertError } = await supabase
    .from("rate_limits")
    .insert({
      user_id: userId,
      endpoint: "generate-speech",
      window_start: windowStart.toISOString(),
    });
  
  if (insertError) {
    console.error("Error recording rate limit:", insertError);
  }
  
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - currentCount - 1 };
}

// Get user's API key (no fallback to platform key - user MUST have their own key)
async function getApiKeyForUser(userId: string | null): Promise<{ apiKey: string | null; isUserKey: boolean }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.log("Supabase credentials not found");
    return { apiKey: null, isUserKey: false };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // User MUST have their own API key - no platform key fallback
  if (userId) {
    const { data: decryptedKey, error: keyError } = await supabase.rpc("get_decrypted_api_key", {
      p_user_id: userId,
      p_provider: "ai33",
    });

    if (!keyError && decryptedKey) {
      console.log("Using user's API key (decrypted from secure storage)");
      return { apiKey: decryptedKey, isUserKey: true };
    }
  }

  // No API key found for user
  console.log("No API key found for user:", userId);
  return { apiKey: null, isUserKey: false };
}

// Get user profile credits
async function getUserCredits(userId: string): Promise<number> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) return 0;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  return data?.credits || 0;
}

// Atomic credit deduction using database function to prevent race conditions
async function deductUserCreditsAtomic(userId: string, amount: number): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) return false;

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Use atomic deduction function to prevent race conditions
  const { data, error } = await supabase
    .rpc('deduct_credits_atomic', {
      _user_id: userId,
      _amount: amount
    });

  if (error) {
    console.error("Error deducting credits:", error);
    return false;
  }

  return data === true;
}

// Create a generation task
async function createTask(
  userId: string,
  voiceId: string,
  voiceName: string | null,
  text: string,
  model: string,
  settings: Record<string, unknown>
): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const wordsCount = text.trim().split(/\s+/).length;

  const { data, error } = await supabase
    .from("generation_tasks")
    .insert({
      user_id: userId,
      voice_id: voiceId,
      voice_name: voiceName,
      input_text: text,
      words_count: wordsCount,
      model,
      settings,
      status: "processing",
      provider: "ai33",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating task:", error);
    return null;
  }

  return data?.id || null;
}

// Update task status
async function updateTask(
  taskId: string,
  updates: { 
    status?: string; 
    audio_url?: string; 
    error_message?: string; 
    completed_at?: string;
    external_task_id?: string;
    progress?: number;
  }
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) return;

  const supabase = createClient(supabaseUrl, supabaseKey);
  await supabase.from("generation_tasks").update(updates).eq("id", taskId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const { userId, error: authError } = await validateAuth(req);
    
    if (authError || !userId) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit to prevent abuse
    const { allowed, remaining } = await checkRateLimit(userId);
    if (!allowed) {
      console.warn("Rate limit exceeded for user:", userId);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a minute before trying again." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60"
          } 
        }
      );
    }
    console.log("Rate limit check passed. Remaining requests:", remaining);

    const body = await req.json();
    console.log("Received request from user:", userId);
    
    const { text, voiceId, voiceName, model, stability, similarity, style } = body;

    if (!text || !voiceId) {
      console.error("Missing required fields - text:", !!text, "voiceId:", !!voiceId);
      return new Response(
        JSON.stringify({ error: "Text and voiceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wordCount = text.trim().split(/\s+/).length;
    console.log("Word count:", wordCount, "Voice ID:", voiceId);

    // Get user's API key - REQUIRED for generation
    const { apiKey, isUserKey } = await getApiKeyForUser(userId);
    
    // API key is REQUIRED - users can only generate if they have an API key set by admin
    if (!apiKey) {
      console.error("No API key found for user:", userId);
      return new Response(
        JSON.stringify({ 
          error: "API key not configured. Please contact admin to set up your API key before generating speech." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Using API key for user:", userId, "Key length:", apiKey.length);

    // Users with API keys have UNLIMITED generation - no credit check needed
    // Credits are only tracked for usage statistics, not as a limit

    console.log(`Generating speech for voice ${voiceId}, text length: ${text.length}, using ${isUserKey ? 'user' : 'platform'} key`);

    // Create task for tracking
    const taskId = await createTask(
      userId,
      voiceId,
      voiceName || null,
      text,
      model || "eleven_multilingual_v2",
      { stability, similarity, style }
    );

    // Build voice settings
    const voiceSettings: Record<string, number | boolean> = {};
    if (stability !== undefined) voiceSettings.stability = stability;
    if (similarity !== undefined) voiceSettings.similarity_boost = similarity;
    if (style !== undefined) voiceSettings.style = style;
    voiceSettings.use_speaker_boost = true;

    // Build request body
    const requestBody: Record<string, unknown> = {
      text,
      model_id: model || "eleven_multilingual_v2",
    };

    if (Object.keys(voiceSettings).length > 0) {
      requestBody.voice_settings = voiceSettings;
    }

    // Call Voice API
    console.log("Calling AI33 API with voice:", voiceId, "model:", model || "eleven_multilingual_v2");
    const apiUrl = `https://api.ai33.pro/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    console.log("API URL:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log("API Response status:", response.status, "Content-Type:", response.headers.get("content-type"));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Voice API error:", response.status, errorText);
      
      let errorMessage = "Failed to generate speech";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail?.message || errorJson.message || errorJson.error || errorMessage;
      } catch {
        // Use default error message
      }

      if (taskId) {
        await updateTask(taskId, { status: "failed", error_message: errorMessage });
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if response is JSON (task-based) or audio
    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      // Task-based response - return task info
      const taskData = await response.json();
      console.log("Task created:", JSON.stringify(taskData));
      
      // API returns task_id per documentation
      const externalTaskId = taskData.task_id || taskData.id || taskData.taskId;
      
      // Check if it immediately has audio URL (metadata.audio_url per API docs)
      const audioUrl = taskData.metadata?.audio_url || taskData.audio_url || taskData.audioUrl;
      
      if (audioUrl) {
        console.log("Direct audio URL returned:", audioUrl);
        
        // Deduct credits atomically
        await deductUserCreditsAtomic(userId, wordCount);
        
        if (taskId) {
          await updateTask(taskId, { 
            status: "done",
            audio_url: audioUrl,
            completed_at: new Date().toISOString(),
          });
        }
        
        return new Response(JSON.stringify({ 
          audioUrl,
          localTaskId: taskId,
          status: "done",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (!externalTaskId) {
        console.error("No task ID in response:", taskData);
        if (taskId) {
          await updateTask(taskId, { status: "failed", error_message: "No task ID returned from API" });
        }
        return new Response(JSON.stringify({ error: "No task ID returned from API" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.log("Task ID received:", externalTaskId);
      
      if (taskId) {
        await updateTask(taskId, { 
          status: "processing",
          external_task_id: externalTaskId,
        });
      }

      // Deduct credits atomically
      await deductUserCreditsAtomic(userId, wordCount);

      // Return the external task ID for polling
      return new Response(JSON.stringify({ 
        taskId: externalTaskId,
        localTaskId: taskId,
        status: "processing",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct audio response
    const audioBuffer = await response.arrayBuffer();
    console.log(`Generated audio: ${audioBuffer.byteLength} bytes`);

    // Deduct credits atomically
    await deductUserCreditsAtomic(userId, wordCount);

    // Update task with audio (we'd need to upload to storage for persistence, but for now just mark done)
    if (taskId) {
      await updateTask(taskId, { 
        status: "done",
        completed_at: new Date().toISOString(),
      });
    }

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Generate speech error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
