import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get API key - try user's key first, then platform key
async function getApiKey(userId?: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.log("Supabase credentials not found, using env API key");
      return Deno.env.get("AI33_API_KEY") || null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try user's own API key first
    if (userId) {
      const { data: userKey } = await supabase
        .from("user_api_keys")
        .select("encrypted_key")
        .eq("user_id", userId)
        .eq("provider", "ai33")
        .eq("is_valid", true)
        .maybeSingle();

      if (userKey?.encrypted_key) {
        console.log("Using user's API key for task polling");
        return userKey.encrypted_key;
      }
    }
    
    // Fallback to platform key
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

// Update local task with audio URL when done
async function updateLocalTask(externalTaskId: string, audioUrl: string, status: string) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase
      .from("generation_tasks")
      .update({ 
        audio_url: audioUrl,
        status: status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("external_task_id", externalTaskId);
      
    console.log(`Updated local task for external ID ${externalTaskId}`);
  } catch (e) {
    console.error("Error updating local task:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, userId } = await req.json();

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "taskId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_KEY = await getApiKey(userId);
    
    if (!API_KEY) {
      console.error("API key is not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching task status: ${taskId}`);

    const response = await fetch(`https://api.ai33.pro/v1/task/${taskId}`, {
      method: "GET",
      headers: {
        "xi-api-key": API_KEY,
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
    console.log("Task status:", data.status, "Progress:", data.progress);

    // If task is done, update local database with audio URL
    if (data.status === "done" && data.metadata?.audio_url) {
      await updateLocalTask(taskId, data.metadata.audio_url, "done");
    } else if (data.status === "error") {
      await updateLocalTask(taskId, "", "failed");
    }

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
