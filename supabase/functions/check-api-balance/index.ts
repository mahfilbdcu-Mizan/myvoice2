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

    // Try multiple endpoints to check if API key is valid
    const endpoints = [
      "https://api.ai33.pro/v1/user/subscription",
      "https://api.ai33.pro/v1/user",
      "https://api.ai33.pro/v1/user/info",
    ];

    let data = null;
    let success = false;

    for (const endpoint of endpoints) {
      console.log(`Trying endpoint: ${endpoint}`);
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
          },
        });

        if (response.ok) {
          data = await response.json();
          console.log("Success! Data:", JSON.stringify(data).substring(0, 300));
          success = true;
          break;
        } else {
          console.log(`Endpoint ${endpoint} returned ${response.status}`);
        }
      } catch (e) {
        console.log(`Endpoint ${endpoint} failed:`, e);
      }
    }

    // If all subscription endpoints failed, validate key by trying to fetch models
    if (!success) {
      console.log("Subscription endpoints failed, validating key with models endpoint...");
      try {
        const modelsResponse = await fetch("https://api.ai33.pro/v1/models", {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
          },
        });

        if (modelsResponse.ok) {
          // Key is valid but subscription endpoint not available
          console.log("API key is valid (models endpoint worked)");
          return new Response(
            JSON.stringify({
              character_count: null,
              character_limit: null,
              credits: null,
              tier: "unknown",
              valid: true,
              message: "API key is valid. Balance info not available for this provider.",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.error("Models endpoint also failed:", modelsResponse.status);
          return new Response(
            JSON.stringify({ error: "Invalid API key", valid: false }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.error("Models endpoint error:", e);
        return new Response(
          JSON.stringify({ error: "Could not validate API key", valid: false }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Extract subscription info - it may be nested or flat
    const subscription = data?.subscription || data;
    
    return new Response(
      JSON.stringify({
        character_count: subscription?.character_count || data?.character_count || 0,
        character_limit: subscription?.character_limit || data?.character_limit || 0,
        credits: subscription?.character_count || data?.character_count || 0,
        tier: subscription?.tier || data?.tier || "free",
        valid: true,
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
