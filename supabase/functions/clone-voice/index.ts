import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fixed cost for one voice clone
const VOICE_CLONE_CREDIT_COST = 333;

function admin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

function getApiKey(): string | null {
  return Deno.env.get("AI33_API_KEY") ?? null;
}

async function validateAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return null;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let chargedUserId: string | null = null;

  try {
    const userId = await validateAuth(req);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = admin();

    // Blocked user check
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, credits_expires_at, is_blocked")
      .eq("id", userId)
      .single();

    if (profile?.is_blocked) {
      return new Response(
        JSON.stringify({ error: "আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে।" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expired = profile?.credits_expires_at
      ? new Date(profile.credits_expires_at) <= new Date()
      : false;
    const available = expired ? 0 : (profile?.credits ?? 0);

    if (available < VOICE_CLONE_CREDIT_COST) {
      return new Response(
        JSON.stringify({
          error: `ভয়েস ক্লোন করতে ${VOICE_CLONE_CREDIT_COST} ক্রেডিট প্রয়োজন। আপনার আছে ${available} ক্রেডিট।`,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_KEY = getApiKey();
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "সার্ভিসটি সাময়িকভাবে রক্ষণাবেক্ষণে আছে। অনুগ্রহ করে কিছুক্ষণ পরে চেষ্টা করুন।" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const voiceName = (formData.get("voice_name") as string) || "My Voice";
    const previewText = (formData.get("preview_text") as string) || "Hello world";
    const languageTag = (formData.get("language_tag") as string) || "English";
    const needNoiseReduction = formData.get("need_noise_reduction") === "true";
    const genderTag = (formData.get("gender_tag") as string) || "male";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "Audio file is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File size must be less than 20MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Charge credits up-front (atomic), refund if the clone fails
    const { data: deducted, error: deductError } = await supabase.rpc("deduct_credits_atomic", {
      _user_id: userId,
      _amount: VOICE_CLONE_CREDIT_COST,
    });

    if (deductError || deducted !== true) {
      return new Response(
        JSON.stringify({ error: "পর্যাপ্ত ক্রেডিট নেই অথবা ক্রেডিটের মেয়াদ শেষ হয়ে গেছে।" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    chargedUserId = userId;

    console.log("Cloning voice:", voiceName, "language:", languageTag, "user:", userId);

    const apiFormData = new FormData();
    apiFormData.append("file", file);
    apiFormData.append("voice_name", voiceName);
    apiFormData.append("preview_text", previewText);
    apiFormData.append("language_tag", languageTag);
    apiFormData.append("need_noise_reduction", needNoiseReduction.toString());
    apiFormData.append("gender_tag", genderTag);

    const response = await fetch("https://api.ai33.pro/v1m/voice/clone", {
      method: "POST",
      headers: { "xi-api-key": API_KEY },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Voice clone API error:", response.status, errorText);

      // Refund
      await supabase.rpc("refund_credits_atomic", {
        _user_id: userId,
        _amount: VOICE_CLONE_CREDIT_COST,
      });
      chargedUserId = null;

      let userMessage = "ভয়েস ক্লোন করা যায়নি। আপনার ক্রেডিট ফেরত দেওয়া হয়েছে।";
      if (response.status === 401 || response.status === 402 || response.status >= 500) {
        userMessage = "সার্ভিসটি সাময়িকভাবে রক্ষণাবেক্ষণে আছে। অনুগ্রহ করে কিছুক্ষণ পরে চেষ্টা করুন। আপনার ক্রেডিট ফেরত দেওয়া হয়েছে।";
      } else {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) userMessage = errorJson.message;
        } catch { /* keep default */ }
      }

      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Voice cloned successfully");

    return new Response(JSON.stringify({ ...data, credits_charged: VOICE_CLONE_CREDIT_COST }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Clone voice error:", error);

    if (chargedUserId) {
      try {
        await admin().rpc("refund_credits_atomic", {
          _user_id: chargedUserId,
          _amount: VOICE_CLONE_CREDIT_COST,
        });
      } catch (refundError) {
        console.error("Refund failed:", refundError);
      }
    }

    return new Response(
      JSON.stringify({ error: "ভয়েস ক্লোন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
