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
    const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
    
    if (!AI33_API_KEY) {
      console.error("AI33_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
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

    // Build query params for shared-voices endpoint which has more voices
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

    console.log(`Fetching voices from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "xi-api-key": AI33_API_KEY,
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
