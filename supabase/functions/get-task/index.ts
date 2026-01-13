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

// Get API key - try user's decrypted key first, then environment variable
async function getApiKey(userId?: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.log("Supabase credentials not found, using env API key");
      return Deno.env.get("AI33_API_KEY") || null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try user's own API key first - MUST decrypt it!
    if (userId) {
      const { data: decryptedKey, error: decryptError } = await supabase.rpc(
        "get_decrypted_api_key",
        { p_user_id: userId, p_provider: "ai33" }
      );

      if (!decryptError && decryptedKey) {
        console.log("Using user's decrypted API key for task polling");
        return decryptedKey;
      }
      
      if (decryptError) {
        console.log("Error decrypting user API key:", decryptError.message);
      }
    }
    
    // Use environment variable only for platform API key
    const envApiKey = Deno.env.get("AI33_API_KEY");
    if (envApiKey) {
      console.log("Using platform API key");
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
    
    console.log("Raw API response:", JSON.stringify(data));
    
    // Get progress - handle null/undefined values
    const rawProgress = data.progress ?? data.percent_complete ?? null;
    const progress = rawProgress !== null ? Math.round(rawProgress) : null;
    
    // Handle "done" status - API may return audio URL in many different places
    // Check ALL possible locations for audio_url
    const audioUrl = 
      data.audio_url || 
      data.metadata?.audio_url || 
      data.result?.audio_url || 
      data.output?.audio_url ||
      data.output ||  // Sometimes output is the URL directly
      data.url ||
      data.file_url ||
      null;
    
    // Check if output is a string URL (not an object)
    const finalAudioUrl = typeof audioUrl === 'string' && audioUrl.startsWith('http') ? audioUrl : 
                          (typeof audioUrl === 'object' && audioUrl !== null ? null : null);
    
    console.log("Task status:", data.status, "Progress:", progress, "Audio URL found:", finalAudioUrl);

    // Determine the real status
    const apiStatus = data.status?.toLowerCase() || "pending";
    const isDone = apiStatus === "done" || apiStatus === "completed" || apiStatus === "success";
    const isError = apiStatus === "error" || apiStatus === "failed";
    const isProcessing = apiStatus === "doing" || apiStatus === "processing" || apiStatus === "pending";

    // Update local database with progress and status
    if (isDone && finalAudioUrl) {
      await updateLocalTask(taskId, { 
        audioUrl: finalAudioUrl, 
        status: "done",
        progress: 100
      });
    } else if (isError) {
      await updateLocalTask(taskId, { status: "failed", progress: 0 });
    } else if (isProcessing) {
      await updateLocalTask(taskId, { 
        status: "processing",
        progress: progress ?? 50
      });
    }

    // Build normalized response
    const normalizedStatus = isDone ? "done" : (isError ? "error" : "processing");
    const normalizedProgress = isDone ? 100 : (isError ? 0 : (progress ?? 50));
    
    const normalizedResponse = {
      id: data.id || taskId,
      created_at: data.created_at,
      status: normalizedStatus,
      credit_cost: data.credit_cost || 0,
      progress: normalizedProgress,
      type: data.type || "tts",
      error_message: data.error_message || data.error || null,
      audio_url: finalAudioUrl,
      metadata: {
        ...(data.metadata || {}),
        audio_url: finalAudioUrl
      }
    };

    console.log("Returning normalized response:", JSON.stringify(normalizedResponse));

    return new Response(JSON.stringify(normalizedResponse), {
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
