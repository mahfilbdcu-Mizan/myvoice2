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

// Default models to return when API is unavailable
const defaultModels = [
  {
    model_id: "eleven_multilingual_v2",
    name: "Eleven Multilingual v2",
    description: "High quality multilingual model",
    can_be_finetuned: false,
    can_do_text_to_speech: true,
    can_do_voice_conversion: false,
    languages: [{ language_id: "en", name: "English" }]
  },
  {
    model_id: "eleven_turbo_v2_5",
    name: "Eleven Turbo v2.5",
    description: "Fast and efficient model",
    can_be_finetuned: false,
    can_do_text_to_speech: true,
    can_do_voice_conversion: false,
    languages: [{ language_id: "en", name: "English" }]
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = await getApiKey();
    
    if (!API_KEY) {
      console.log("API key is not configured, returning default models");
      return new Response(JSON.stringify(defaultModels), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching models from API");

    const response = await fetchWithRetry("https://api.ai33.pro/v1/models", {
      method: "GET",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", response.status, errorText);
      
      // Return default models on API error instead of failing
      console.log("Returning default models due to API error");
      return new Response(JSON.stringify(defaultModels), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log(`Fetched models successfully`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch models error:", error);
    // Return default models on error instead of failing
    return new Response(JSON.stringify(defaultModels), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
