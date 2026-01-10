import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const voiceName = formData.get("voice_name") as string || "My Voice";
    const previewText = formData.get("preview_text") as string || "Hello world";
    const languageTag = formData.get("language_tag") as string || "English";
    const needNoiseReduction = formData.get("need_noise_reduction") === "true";
    const genderTag = formData.get("gender_tag") as string || "male";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "Audio file is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File size must be less than 20MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Cloning voice with name:", voiceName, "language:", languageTag);

    // Create new FormData for the API request
    const apiFormData = new FormData();
    apiFormData.append("file", file);
    apiFormData.append("voice_name", voiceName);
    apiFormData.append("preview_text", previewText);
    apiFormData.append("language_tag", languageTag);
    apiFormData.append("need_noise_reduction", needNoiseReduction.toString());
    apiFormData.append("gender_tag", genderTag);

    const response = await fetch("https://api.ai33.pro/v1m/voice/clone", {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Voice clone API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to clone voice", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Voice cloned successfully:", data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Clone voice error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
