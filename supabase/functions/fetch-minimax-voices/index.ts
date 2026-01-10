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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = getApiKey();
    
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { page = 1, page_size = 30, tag_list = [] } = body;

    console.log("Fetching Minimax voices, page:", page, "page_size:", page_size);

    const response = await fetch("https://api.ai33.pro/v1m/voice/list", {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page,
        page_size,
        tag_list,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Minimax API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch Minimax voices", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log(`Fetched ${data.data?.voice_list?.length || 0} Minimax voices`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch Minimax voices error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
