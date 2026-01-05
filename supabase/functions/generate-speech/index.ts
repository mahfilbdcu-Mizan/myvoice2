import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
    
    if (!AI33_API_KEY) {
      console.error("AI33_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
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
          "xi-api-key": AI33_API_KEY,
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
