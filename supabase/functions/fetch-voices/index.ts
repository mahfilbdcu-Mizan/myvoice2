import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Check if search looks like a voice ID (alphanumeric, typically 20+ chars)
    const isVoiceIdSearch = search && /^[a-zA-Z0-9]{10,}$/.test(search.trim());

    if (isVoiceIdSearch) {
      // Try to fetch specific voice by ID
      console.log(`Searching for voice ID: ${search}`);
      try {
        const voiceResponse = await fetch(`https://api.ai33.pro/v1/voices/${search.trim()}`, {
          method: "GET",
          headers: {
            "xi-api-key": API_KEY,
            "Content-Type": "application/json",
          },
        });

        if (voiceResponse.ok) {
          const voice = await voiceResponse.json();
          console.log(`Found voice by ID: ${voice.name}`);
          return new Response(JSON.stringify({
            voices: [voice],
            has_more: false
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.log("Voice ID lookup failed, falling back to search");
      }
    }

    // Build query params for shared-voices endpoint
    const params = new URLSearchParams();
    params.set("page_size", String(page_size));
    if (page > 0) params.set("page", String(page));
    if (search) params.set("search", search);
    if (gender) params.set("gender", gender);
    if (language) params.set("language", language);
    if (age) params.set("age", age);
    if (accent) params.set("accent", accent);
    if (category) params.set("category", category);
    if (use_cases) params.set("use_cases", use_cases);

    const apiUrl = `https://api.ai33.pro/v1/shared-voices?${params.toString()}`;

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
    console.log(`Fetched ${data.voices?.length || 0} voices, has_more: ${data.has_more}`);

    return new Response(JSON.stringify(data), {
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
