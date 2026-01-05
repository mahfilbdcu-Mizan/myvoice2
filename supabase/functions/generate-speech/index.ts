import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get user's API key or fallback to platform key
async function getApiKeyForUser(userId: string | null): Promise<{ apiKey: string | null; isUserKey: boolean }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.log("Supabase credentials not found");
    return { apiKey: Deno.env.get("AI33_API_KEY") || null, isUserKey: false };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Try user's own API key first
  if (userId) {
    const { data: userKey, error: userKeyError } = await supabase
      .from("user_api_keys")
      .select("encrypted_key, is_valid")
      .eq("user_id", userId)
      .eq("provider", "ai33")
      .eq("is_valid", true)
      .maybeSingle();

    if (!userKeyError && userKey?.encrypted_key) {
      console.log("Using user's own API key");
      return { apiKey: userKey.encrypted_key, isUserKey: true };
    }
  }

  // Fallback to platform API key
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "ai33_api_key")
    .single();

  if (error || !data?.value) {
    console.log("API key not found in database, using env variable");
    return { apiKey: Deno.env.get("AI33_API_KEY") || null, isUserKey: false };
  }

  return { apiKey: data.value, isUserKey: false };
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

// Deduct credits from user profile
async function deductUserCredits(userId: string, amount: number): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) return false;

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  if (!profile || profile.credits < amount) return false;

  const { error } = await supabase
    .from("profiles")
    .update({ credits: profile.credits - amount })
    .eq("id", userId);

  return !error;
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
  updates: { status?: string; audio_url?: string; error_message?: string; completed_at?: string }
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
    const { text, voiceId, voiceName, model, stability, similarity, style, userId } = await req.json();

    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: "Text and voiceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wordCount = text.trim().split(/\s+/).length;

    // Get API key (user's own or platform's)
    const { apiKey, isUserKey } = await getApiKeyForUser(userId);
    
    if (!apiKey) {
      console.error("API key is not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured. Please contact admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If using platform key, check and deduct credits
    if (!isUserKey && userId) {
      const userCredits = await getUserCredits(userId);
      if (userCredits < wordCount) {
        return new Response(
          JSON.stringify({ 
            error: `Insufficient credits. You have ${userCredits} words, but need ${wordCount}. Add your own API key for unlimited generation.`
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Generating speech for voice ${voiceId}, text length: ${text.length}, using ${isUserKey ? 'user' : 'platform'} key`);

    // Create task for tracking
    const taskId = userId ? await createTask(
      userId,
      voiceId,
      voiceName || null,
      text,
      model || "eleven_multilingual_v2",
      { stability, similarity, style }
    ) : null;

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
    const response = await fetch(
      `https://api.ai33.pro/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

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
      console.log("Task created:", taskData);
      
      if (taskId) {
        await updateTask(taskId, { 
          status: "processing",
        });
      }

      // Deduct credits if using platform key
      if (!isUserKey && userId) {
        await deductUserCredits(userId, wordCount);
      }

      return new Response(JSON.stringify({ ...taskData, localTaskId: taskId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct audio response
    const audioBuffer = await response.arrayBuffer();
    console.log(`Generated audio: ${audioBuffer.byteLength} bytes`);

    // Deduct credits if using platform key
    if (!isUserKey && userId) {
      await deductUserCredits(userId, wordCount);
    }

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