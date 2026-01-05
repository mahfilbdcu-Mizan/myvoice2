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

// Fetch with retry logic for transient errors
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3,
  delayMs = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Retry on 502, 503, 504 errors
      if (response.status >= 502 && response.status <= 504) {
        console.log(`Attempt ${attempt + 1}: Got ${response.status}, retrying...`);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
          continue;
        }
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error("Failed after retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = await getApiKey();
    
    if (!API_KEY) {
      console.log("API key is not configured, returning empty voices");
      return new Response(
        JSON.stringify({ voices: [], has_more: false, error: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const response = await fetchWithRetry(apiUrl, {
      method: "GET",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", response.status, errorText);
      
      // Return empty voices on any API error to prevent blank screen
      console.log("Returning empty voices due to API error");
      return new Response(
        JSON.stringify({ 
          voices: [], 
          has_more: false, 
          error: response.status === 401 
            ? "API key invalid or out of credits. Please update in Admin Settings." 
            : "API temporarily unavailable" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log(`Fetched ${data.voices?.length || 0} voices, has_more: ${data.has_more}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch voices error:", error);
    // Return empty voices on error instead of failing
    return new Response(
      JSON.stringify({ voices: [], has_more: false, error: "Service temporarily unavailable" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});