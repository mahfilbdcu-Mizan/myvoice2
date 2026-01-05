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

    // Check user info / subscription from ai33.pro API
    const response = await fetch("https://api.ai33.pro/v1/user/subscription", {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      console.error("API error:", response.status);
      // Return zero balance instead of failing - allows UI to show "no credits"
      return new Response(
        JSON.stringify({ 
          character_count: 0, 
          character_limit: 0, 
          credits: 0, 
          tier: "unknown",
          error: "Could not verify API key"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Subscription data:", data);

    return new Response(
      JSON.stringify({
        character_count: data.character_count || 0,
        character_limit: data.character_limit || 0,
        credits: data.character_count || 0,
        tier: data.tier || "free",
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