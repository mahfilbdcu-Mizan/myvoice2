import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CREDITS = 100_000_000;
const MAX_SINGLE_CHANGE = 50_000_000;

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

// Verify admin role using service role key
async function verifyAdminRole(userId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase configuration");
    return false;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: roleData, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    console.error("Error checking admin role:", error);
    return false;
  }

  return roleData !== null;
}

// Log admin action for audit
async function logAdminAction(
  adminUserId: string,
  action: string,
  targetUserId: string | null,
  details: Record<string, unknown>
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) return;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  await supabase.from("admin_audit_log").insert({
    admin_user_id: adminUserId,
    action,
    target_user_id: targetUserId,
    details,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const { userId: adminUserId, error: authError } = await validateAuth(req);

    if (authError || !adminUserId) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin role server-side
    const isAdmin = await verifyAdminRole(adminUserId);
    if (!isAdmin) {
      console.error("Admin verification failed for user:", adminUserId);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    switch (action) {
      case "update_credits": {
        const { targetUserId, credits } = body;

        // Validate inputs
        if (!targetUserId || typeof targetUserId !== "string") {
          return new Response(
            JSON.stringify({ error: "Target user ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!Number.isInteger(credits) || credits < 0 || credits > MAX_CREDITS) {
          return new Response(
            JSON.stringify({ error: `Credits must be an integer between 0 and ${MAX_CREDITS}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current credits
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", targetUserId)
          .single();

        if (fetchError || !profile) {
          return new Response(
            JSON.stringify({ error: "User profile not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const oldCredits = profile.credits || 0;
        const difference = Math.abs(credits - oldCredits);

        if (difference > MAX_SINGLE_CHANGE) {
          return new Response(
            JSON.stringify({ error: `Single change cannot exceed ${MAX_SINGLE_CHANGE} credits` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update credits
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits })
          .eq("id", targetUserId);

        if (updateError) {
          console.error("Error updating credits:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update credits" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log the action
        await logAdminAction(adminUserId, "update_credits", targetUserId, {
          old_credits: oldCredits,
          new_credits: credits,
        });

        return new Response(
          JSON.stringify({ success: true, oldCredits, newCredits: credits }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "approve_order": {
        const { orderId, targetUserId, credits } = body;

        // Validate inputs
        if (!orderId || !targetUserId) {
          return new Response(
            JSON.stringify({ error: "Order ID and target user ID are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!Number.isInteger(credits) || credits < 0 || credits > MAX_CREDITS) {
          return new Response(
            JSON.stringify({ error: "Invalid credit amount" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current profile
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", targetUserId)
          .single();

        if (fetchError || !profile) {
          return new Response(
            JSON.stringify({ error: "User profile not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const oldCredits = profile.credits || 0;
        const newCredits = oldCredits + credits;

        if (newCredits > MAX_CREDITS) {
          return new Response(
            JSON.stringify({ error: `Adding ${credits} credits would exceed maximum balance of ${MAX_CREDITS}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update order status
        const { error: orderError } = await supabase
          .from("credit_orders")
          .update({
            status: "approved",
            processed_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        if (orderError) {
          console.error("Error updating order:", orderError);
          return new Response(
            JSON.stringify({ error: "Failed to update order status" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update credits
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits: newCredits })
          .eq("id", targetUserId);

        if (updateError) {
          console.error("Error updating credits:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update user credits" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log the action
        await logAdminAction(adminUserId, "approve_order", targetUserId, {
          order_id: orderId,
          credits_added: credits,
          old_credits: oldCredits,
          new_credits: newCredits,
        });

        return new Response(
          JSON.stringify({ success: true, oldCredits, newCredits }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reject_order": {
        const { orderId, notes } = body;

        if (!orderId) {
          return new Response(
            JSON.stringify({ error: "Order ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: orderError } = await supabase
          .from("credit_orders")
          .update({
            status: "rejected",
            admin_notes: notes || null,
            processed_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        if (orderError) {
          console.error("Error rejecting order:", orderError);
          return new Response(
            JSON.stringify({ error: "Failed to reject order" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log the action
        await logAdminAction(adminUserId, "reject_order", null, {
          order_id: orderId,
          notes,
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "set_user_api_key": {
        const { targetUserId, apiKey, provider = "ai33" } = body;

        // Validate inputs
        if (!targetUserId || typeof targetUserId !== "string") {
          return new Response(
            JSON.stringify({ error: "Target user ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
          return new Response(
            JSON.stringify({ error: "Valid API key is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validate API key by checking balance
        let isValid = true;
        let remainingCredits = null;
        
        try {
          const response = await fetch("https://api.ai33.pro/v1/credits", {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            remainingCredits = data.credits?.remaining || data.remaining_credits || null;
            isValid = true;
          } else {
            isValid = false;
          }
        } catch (e) {
          console.log("API key validation skipped due to network error:", e);
          // Still save the key even if validation fails
        }

        // Encrypt and save the API key for the user
        const { data: keyId, error: saveError } = await supabase.rpc(
          "save_user_api_key_secure_admin",
          {
            p_user_id: targetUserId,
            p_provider: provider,
            p_api_key: apiKey,
            p_is_valid: isValid,
            p_remaining_credits: remainingCredits,
          }
        );

        if (saveError) {
          console.error("Error saving API key:", saveError);
          return new Response(
            JSON.stringify({ error: "Failed to save API key: " + saveError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log the action
        await logAdminAction(adminUserId, "set_user_api_key", targetUserId, {
          provider,
          is_valid: isValid,
          remaining_credits: remainingCredits,
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            keyId,
            isValid,
            remainingCredits,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user_api_key": {
        const { targetUserId, provider = "ai33" } = body;

        // Validate inputs
        if (!targetUserId || typeof targetUserId !== "string") {
          return new Response(
            JSON.stringify({ error: "Target user ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete the API key
        const { error: deleteError } = await supabase
          .from("user_api_keys")
          .delete()
          .eq("user_id", targetUserId)
          .eq("provider", provider);

        if (deleteError) {
          console.error("Error deleting API key:", deleteError);
          return new Response(
            JSON.stringify({ error: "Failed to delete API key: " + deleteError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log the action
        await logAdminAction(adminUserId, "delete_user_api_key", targetUserId, {
          provider,
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Admin operations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
