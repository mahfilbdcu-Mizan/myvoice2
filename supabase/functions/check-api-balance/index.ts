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

    const body = await req.json().catch(() => ({}));
    const provider = body.provider || "ai33";

    console.log(`Checking API balance for user: ${userId}, provider: ${provider}`);

    // Get the decrypted API key from server-side (using service role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get decrypted API key using the secure function
    const { data: apiKey, error: keyError } = await supabase.rpc("get_decrypted_api_key", {
      p_user_id: userId,
      p_provider: provider,
    });

    if (keyError || !apiKey) {
      console.log("No valid API key found for user");
      return new Response(
        JSON.stringify({ error: "No valid API key found", hasKey: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check the API key balance with external provider
    console.log(`Fetching credits from /v1/credits for user: ${userId}`);
    const response = await fetch("https://api.ai33.pro/v1/credits", {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("API error:", response.status);
      
      let errorMessage = "Invalid API key or could not fetch balance";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Ignore parse errors
      }
      
      // Mark the key as invalid
      await supabase
        .from("user_api_keys")
        .update({ is_valid: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("provider", provider);

      return new Response(
        JSON.stringify({ error: errorMessage, valid: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Credits data:", JSON.stringify(data));

    // Update the stored balance
    const credits = data.credits || 0;
    await supabase
      .from("user_api_keys")
      .update({ 
        is_valid: true, 
        remaining_credits: credits,
        updated_at: new Date().toISOString() 
      })
      .eq("user_id", userId)
      .eq("provider", provider);

    // Response format: { "success": true, "credits": 123 }
    if (data.success !== false) {
      return new Response(
        JSON.stringify({
          credits: credits,
          character_count: credits,
          valid: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          error: data.message || "Could not fetch credits",
          valid: false 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Check balance error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
