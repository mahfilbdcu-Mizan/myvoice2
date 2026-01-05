import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get API key from database or fallback to env
async function getApiKey(): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.log("Supabase credentials not found, using env API key");
      return Deno.env.get("AI33_API_KEY") || null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ai33_api_key")
      .single();

    if (error || !data?.value) {
      console.log("API key not found in database, using env variable");
      return Deno.env.get("AI33_API_KEY") || null;
    }

    return data.value;
  } catch (e) {
    console.error("Error fetching API key:", e);
    return Deno.env.get("AI33_API_KEY") || null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, model, stability, similarity, style } = await req.json();

    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: "Text and voiceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_KEY = await getApiKey();
    
    if (!API_KEY) {
      console.error("API key is not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured. Please contact admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating speech for voice ${voiceId}, text length: ${text.length}`);

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

    // Call ai33.pro API (ElevenLabs proxy)
    const response = await fetch(
      `https://api.ai33.pro/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ai33.pro API error:", response.status, errorText);
      
      let errorMessage = "Failed to generate speech";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail?.message || errorJson.message || errorJson.error || errorMessage;
      } catch {
        // Use default error message
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
      return new Response(JSON.stringify(taskData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct audio response
    const audioBuffer = await response.arrayBuffer();
    console.log(`Generated audio: ${audioBuffer.byteLength} bytes`);

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
