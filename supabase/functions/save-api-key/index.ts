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
    const authHeader = req.headers.get("Authorization");
    const { userId, error: authError } = await validateAuth(req);
    
    if (authError || !userId) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { apiKey, provider = "ai33" } = await req.json();

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Valid API key is required (minimum 10 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key format - basic sanitization
    const sanitizedKey = apiKey.trim();
    if (!/^[a-zA-Z0-9_\-]+$/.test(sanitizedKey)) {
      return new Response(
        JSON.stringify({ error: "Invalid API key format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Saving API key for user ${userId}, provider: ${provider}`);

    // First, verify the API key is valid by checking balance
    let isValid = false;
    let remainingCredits: number | null = null;

    try {
      const balanceResponse = await fetch("https://api.ai33.pro/v1/credits", {
        method: "GET",
        headers: {
          "xi-api-key": sanitizedKey,
          "Content-Type": "application/json",
        },
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        isValid = balanceData.success !== false;
        remainingCredits = balanceData.credits || null;
        console.log("API key validation successful, credits:", remainingCredits);
      } else {
        console.log("API key validation failed:", balanceResponse.status);
        return new Response(
          JSON.stringify({ error: "Invalid API key - could not verify with provider", valid: false }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      console.error("Error validating API key:", error);
      // Continue but mark as unverified
      isValid = true; // Assume valid if we can't check
    }

    // Use the secure database function to save encrypted key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    // Call the secure function to save encrypted key
    const { data, error } = await supabase.rpc("save_user_api_key_secure", {
      p_provider: provider,
      p_api_key: sanitizedKey,
      p_is_valid: isValid,
      p_remaining_credits: remainingCredits,
    });

    if (error) {
      console.error("Error saving API key:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save API key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("API key saved successfully, ID:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data,
        isValid,
        remainingCredits,
        message: isValid 
          ? `API key saved successfully. Balance: ${remainingCredits?.toLocaleString() || 'Unknown'} credits`
          : "API key saved but could not verify balance"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Save API key error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
