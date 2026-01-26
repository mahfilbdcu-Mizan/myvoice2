import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Get user's API key - REQUIRED for generation
async function getApiKeyForUser(userId: string): Promise<{ apiKey: string | null; isUserKey: boolean }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.log("Supabase credentials not found");
    return { apiKey: null, isUserKey: false };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // User MUST have their own API key - no platform key fallback
  const { data: decryptedKey, error: keyError } = await supabase.rpc("get_decrypted_api_key", {
    p_user_id: userId,
    p_provider: "ai33",
  });

  if (!keyError && decryptedKey) {
    console.log("Using user's API key (decrypted from secure storage)");
    return { apiKey: decryptedKey, isUserKey: true };
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

// Atomic credit deduction using database function
async function deductUserCreditsAtomic(userId: string, amount: number): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) return false;

  const supabase = createClient(supabaseUrl, supabaseKey);
  
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

    // Get user's API key - REQUIRED for generation
    const { apiKey: API_KEY } = await getApiKeyForUser(userId);
    
    if (!API_KEY) {
      console.error("No API key found for user:", userId);
      return new Response(
        JSON.stringify({ 
          error: "API key not configured. Please contact admin to set up your API key before generating speech." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Using API key for user:", userId, "Key length:", API_KEY.length);

    const body = await req.json();
    const {
      text,
      voiceId,
      voiceName,
      model = "speech-2.6-hd",
      vol = 1,
      pitch = 0,
      speed = 1,
      language_boost = "Auto",
      with_transcript = false,
    } = body;

    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: "Text and voiceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wordsCount = text.trim().split(/\s+/).length;

    // Check credits
    const userCredits = await getUserCredits(userId);
    if (userCredits < wordsCount) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient credits. You have ${userCredits} words, but need ${wordsCount}. Please contact admin to add more credits.`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create task in database
    const { data: taskData, error: taskError } = await supabase
      .from("generation_tasks")
      .insert({
        user_id: userId,
        voice_id: voiceId,
        voice_name: voiceName || "Minimax Voice",
        input_text: text,
        words_count: wordsCount,
        model,
        settings: { vol, pitch, speed, language_boost, with_transcript },
        status: "processing",
        provider: "minimax",
      })
      .select("id")
      .single();

    if (taskError) {
      console.error("Error creating task:", taskError);
    }

    const localTaskId = taskData?.id;

    console.log("Calling Minimax TTS API with voice:", voiceId, "model:", model);

    const response = await fetch("https://api.ai33.pro/v1m/task/text-to-speech", {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model,
        voice_setting: {
          voice_id: voiceId,
          vol,
          pitch,
          speed,
        },
        language_boost,
        with_transcript,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Minimax API error:", response.status, errorText);
      
      if (localTaskId) {
        await supabase
          .from("generation_tasks")
          .update({ status: "failed", error_message: errorText })
          .eq("id", localTaskId);
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate speech", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Minimax TTS response:", data);

    // Update task with external task ID
    if (localTaskId && data.task_id) {
      await supabase
        .from("generation_tasks")
        .update({ external_task_id: data.task_id })
        .eq("id", localTaskId);
    }

    // Deduct credits atomically
    await deductUserCreditsAtomic(userId, wordsCount);

    return new Response(
      JSON.stringify({
        success: true,
        taskId: data.task_id,
        localTaskId,
        remainingCredits: data.ec_remain_credits,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate Minimax speech error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
