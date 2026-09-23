import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

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

    const body = await req.json();
    const { voiceCloneId } = body;

    if (!voiceCloneId) {
      return new Response(
        JSON.stringify({ error: "Voice clone ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ownership check: users can only delete their own clones (staff allowed)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: owned } = await supabase
      .from("voice_clones")
      .select("id")
      .eq("user_id", userId)
      .eq("voice_id", voiceCloneId)
      .maybeSingle();

    if (!owned) {
      const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
      if (!isStaff) {
        return new Response(
          JSON.stringify({ error: "You can only delete your own voice clones" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Deleting voice clone:", voiceCloneId);

    const response = await fetch(`https://api.ai33.pro/v1m/voice/clone/${voiceCloneId}`, {
      method: "DELETE",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
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
    console.log("Voice clone deleted successfully");

    // Remove ownership record
    await supabase.from("voice_clones").delete().eq("voice_id", voiceCloneId);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete voice clone error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
