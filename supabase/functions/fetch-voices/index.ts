import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeV3Voice(voice: Record<string, any>) {
  const gender = voice.gender ? String(voice.gender).toLowerCase() : undefined;
  const age = voice.age ? String(voice.age).toLowerCase().replace(/\s+/g, "_") : undefined;

  return {
    ...voice,
    voice_id: voice.voice_id || voice.id,
    name: voice.name || voice.voice_name || voice.voice_id || voice.id,
    preview_url: voice.preview_url || voice.previewUrl || voice.sample_url,
    gender,
    age,
    language: voice.language || voice.locale,
    locale: voice.locale || voice.language,
    description: voice.description || voice.descriptive,
    labels: {
      ...(voice.labels || {}),
      gender,
      age,
      accent: voice.accent,
      description: voice.description || voice.descriptive,
      use_case: voice.use_case,
    },
  };
}

// Get API key from environment variable only (secure - not stored in database)
function getApiKey(): string | null {
  const apiKey = Deno.env.get("AI33_API_KEY");
  if (!apiKey) {
    console.error("AI33_API_KEY environment variable not configured");
    return null;
  }
  return apiKey;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = getApiKey();
    
    if (!API_KEY) {
      console.error("API key is not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured. Please set it in Admin Settings." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { 
      page_size = 100,
      page = 0,
      search = "",
      gender = "",
      language = "",
      age = "",
      accent = "",
      category = "",
      use_cases = ""
    } = body;

    // Build query params for AI33 v3 unified voice library.
    // v3 returns prefixed voice IDs like elevenlabs_<id>, which are required by v3 TTS.
    const params = new URLSearchParams();
    params.set("provider", "elevenlabs");
    params.set("page_size", String(Math.min(Number(page_size) || 100, 100)));
    params.set("page", String((Number(page) || 0) + 1));
    if (search) params.set("q", search);
    if (gender) params.set("gender", gender);
    if (language) params.set("language", language);
    if (age) params.set("age", age);
    if (accent) params.set("accent", accent);
    if (category) params.set("category", category);
    if (use_cases) params.set("use_cases", use_cases);

    const apiUrl = `https://api.ai33.pro/v3/voices?${params.toString()}`;

    console.log(`Fetching voices from voice API`);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch voices", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawVoices = Array.isArray(data.data) ? data.data : (Array.isArray(data.voices) ? data.voices : []);
    const voices = rawVoices.map(normalizeV3Voice).filter((voice: Record<string, any>) => voice.voice_id);
    const hasMore = data.pagination?.has_more ?? data.has_more ?? false;
    console.log(`Fetched ${voices.length} voices from AI33 v3, has_more: ${hasMore}`);

    return new Response(JSON.stringify({
      voices,
      has_more: hasMore,
      pagination: data.pagination,
      format_version: data.format_version,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch voices error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
