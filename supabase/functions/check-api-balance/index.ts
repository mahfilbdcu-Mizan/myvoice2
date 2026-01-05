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
    const { apiKey } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try /v1/user endpoint first (returns subscription data)
    let response = await fetch("https://api.ai33.pro/v1/user", {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    // If /v1/user fails, the key is likely invalid
    if (!response.ok) {
      console.error("API error:", response.status);
      return new Response(
        JSON.stringify({ error: "Invalid API key or could not fetch balance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("User data:", JSON.stringify(data).substring(0, 200));

    // Extract subscription info - it may be nested or flat
    const subscription = data.subscription || data;
    
    return new Response(
      JSON.stringify({
        character_count: subscription.character_count || data.character_count || 0,
        character_limit: subscription.character_limit || data.character_limit || 0,
        credits: subscription.character_count || data.character_count || 0,
        tier: subscription.tier || data.tier || "free",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check balance error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});