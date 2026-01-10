import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getApiKey(): string | null {
  const apiKey = Deno.env.get("AI33_API_KEY");
  if (!apiKey) {
    console.error("AI33_API_KEY environment variable not configured");
    return null;
  }
  return apiKey;
}

function validateAuth(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = validateAuth(req);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_KEY = getApiKey();
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
