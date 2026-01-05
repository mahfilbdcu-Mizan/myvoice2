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
    const { taskId } = await req.json();

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "taskId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
    
    if (!AI33_API_KEY) {
      console.error("AI33_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching task status: ${taskId}`);

    const response = await fetch(`https://api.ai33.pro/v1/task/${taskId}`, {
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
        JSON.stringify({ error: "Failed to get task status" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Task status:", data.status);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get task error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
