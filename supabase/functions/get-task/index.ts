import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate JWT and get user ID
async function validateAuth(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, error: "Missing or invalid authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return { userId: null, error: "Server configuration error" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error("Auth validation error:", error?.message);
    return { userId: null, error: "Invalid or expired token" };
  }

  return { userId: data.user.id, error: null };
}

// Get API key - try user's key first, then environment variable (secure - not stored in database)
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
    
    // Use environment variable only for platform API key (secure - not stored in database)
    const envApiKey = Deno.env.get("AI33_API_KEY");
    if (envApiKey) {
      return envApiKey;
    }

    console.error("AI33_API_KEY environment variable not configured");
    return null;
  } catch (e) {
    console.error("Error fetching API key:", e);
    return Deno.env.get("AI33_API_KEY") || null;
  }
}

// Update local task with progress, audio URL when done
async function updateLocalTask(externalTaskId: string, updates: { audioUrl?: string; status?: string; progress?: number }) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const updateData: Record<string, unknown> = {};
    
    if (updates.audioUrl) {
      updateData.audio_url = updates.audioUrl;
    }
    if (updates.status) {
      updateData.status = updates.status;
      if (updates.status === "done") {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (updates.progress !== undefined) {
      updateData.progress = updates.progress;
    }
    
    if (Object.keys(updateData).length > 0) {
      await supabase
        .from("generation_tasks")
        .update(updateData)
        .eq("external_task_id", externalTaskId);
        
      console.log(`Updated local task for external ID ${externalTaskId}:`, updateData);
    }
  } catch (e) {
    console.error("Error updating local task:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const { userId, error: authError } = await validateAuth(req);
    
    if (authError || !userId) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { taskId } = await req.json();

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

    console.log(`Fetching task status: ${taskId} for user: ${userId}`);

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

    // Update local database with progress and status
    if (data.status === "done" && data.metadata?.audio_url) {
      await updateLocalTask(taskId, { 
        audioUrl: data.metadata.audio_url, 
        status: "done",
        progress: 100
      });
    } else if (data.status === "error" || data.status === "failed") {
      await updateLocalTask(taskId, { status: "failed", progress: 0 });
    } else if (data.status === "processing" || data.status === "pending") {
      // Update progress during processing
      const progress = data.progress || data.percent_complete || 0;
      await updateLocalTask(taskId, { 
        status: "processing",
        progress: Math.round(progress)
      });
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
