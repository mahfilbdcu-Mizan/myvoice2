import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getApiKey(): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      return Deno.env.get("AI33_API_KEY") || null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ai33_api_key")
      .single();

    if (error || !data?.value) {
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

  const API_KEY = await getApiKey();
    
  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: "API key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const voiceCloneId = pathParts[pathParts.length - 1];

    // DELETE: Delete voice clone
    if (req.method === "DELETE" && voiceCloneId && voiceCloneId !== "voice-clone") {
      console.log(`Deleting voice clone: ${voiceCloneId}`);
      
      const response = await fetch(`https://api.ai33.pro/v1m/voice/clone/${voiceCloneId}`, {
        method: "DELETE",
        headers: {
          "xi-api-key": API_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Delete voice clone API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to delete voice clone", details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: List voice clones
    if (req.method === "GET") {
      console.log("Fetching voice clones list");
      
      const response = await fetch("https://api.ai33.pro/v1m/voice/clone", {
        method: "GET",
        headers: {
          "xi-api-key": API_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("List voice clones API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ success: true, data: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Create voice clone
    if (req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const voiceName = formData.get("voice_name") as string;
      const previewText = formData.get("preview_text") as string;
      const languageTag = formData.get("language_tag") as string;
      const needNoiseReduction = formData.get("need_noise_reduction") === "true";
      const genderTag = formData.get("gender_tag") as string;

      if (!file) {
        return new Response(
          JSON.stringify({ error: "Audio file is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Creating voice clone: ${voiceName}`);

      const apiFormData = new FormData();
      apiFormData.append("file", file);
      if (voiceName) apiFormData.append("voice_name", voiceName);
      if (previewText) apiFormData.append("preview_text", previewText);
      if (languageTag) apiFormData.append("language_tag", languageTag);
      apiFormData.append("need_noise_reduction", needNoiseReduction.toString());
      if (genderTag) apiFormData.append("gender_tag", genderTag);

      const response = await fetch("https://api.ai33.pro/v1m/voice/clone", {
        method: "POST",
        headers: {
          "xi-api-key": API_KEY,
        },
        body: apiFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Create voice clone API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to create voice clone", details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Voice clone error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
