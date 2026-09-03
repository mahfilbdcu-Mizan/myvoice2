import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_IMAGE_URL = "https://api.ai33.pro/v1i/task/generate-image";
const AI33_MODELS_URL = "https://api.ai33.pro/v1i/models";

const MAINTENANCE_MESSAGE =
  "সাইটে সাময়িক সমস্যা চলছে। আমরা ঠিক করছি — কিছুক্ষণ পরে আবার চেষ্টা করুন। আপনার কোনো ক্রেডিট কাটা হয়নি।";

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function validateAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !data?.user) return null;
  return data.user.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await validateAuth(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const modelId = typeof body.model_id === "string" ? body.model_id : "";
    const aspectRatio = typeof body.aspect_ratio === "string" ? body.aspect_ratio : undefined;
    const resolution = typeof body.resolution === "string" ? body.resolution : undefined;
    const quality = typeof body.quality === "string" ? body.quality : undefined;
    const generations = Math.min(4, Math.max(1, Number(body.generations) || 1));

    if (!prompt || !modelId) {
      return new Response(JSON.stringify({ error: "prompt and model_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (prompt.length > 10000) {
      return new Response(JSON.stringify({ error: "Prompt is too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = serviceClient();

    // User's own AI33 key is required (same rule as speech generation)
    const { data: apiKey } = await admin.rpc("get_decrypted_api_key", {
      p_user_id: userId,
      p_provider: "ai33",
    });

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "API key not configured. Please contact admin to set up your API key before generating images.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Credits + validity
    const { data: profile } = await admin
      .from("profiles")
      .select("credits, credits_expires_at")
      .eq("id", userId)
      .single();

    const availableCredits = profile?.credits ?? 0;
    const expiresAt = profile?.credits_expires_at ?? null;

    if (expiresAt && new Date(expiresAt) <= new Date()) {
      return new Response(
        JSON.stringify({
          error: "আপনার ক্রেডিটের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pre-check using the provider's own published price for this model
    let estimate = 0;
    try {
      const modelsRes = await fetch(AI33_MODELS_URL, { headers: { "xi-api-key": apiKey } });
      if (modelsRes.ok) {
        const modelsJson = await modelsRes.json();
        const model = (modelsJson.models || []).find((m: any) => m.model_id === modelId);
        estimate = Number(model?.presented_credits || 0) * generations;
      }
    } catch (_e) {
      // Non-fatal: fall back to post-start check
    }

    if (estimate > 0 && availableCredits < estimate) {
      return new Response(
        JSON.stringify({
          error: `পর্যাপ্ত ক্রেডিট নেই। প্রয়োজন প্রায় ${estimate}, আপনার আছে ${availableCredits}।`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload: Record<string, unknown> = {
      model_id: modelId,
      prompt,
      generations,
    };
    if (aspectRatio) payload.aspect_ratio = aspectRatio;
    if (resolution) payload.resolution = resolution;
    if (quality) payload.quality = quality;

    const response = await fetch(AI33_IMAGE_URL, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      data = {};
    }

    if (!response.ok || !data?.task_id) {
      console.error("Image API error:", response.status, rawText);
      const lower = rawText.toLowerCase();
      const isMaintenance =
        response.status >= 500 ||
        response.status === 402 ||
        lower.includes("maintenance") ||
        lower.includes("unavailable") ||
        lower.includes("insufficient") ||
        lower.includes("balance") ||
        lower.includes("quota");

      return new Response(
        JSON.stringify({
          error: isMaintenance ? MAINTENANCE_MESSAGE : data?.message || "Failed to generate image",
          maintenance: isMaintenance,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Charge exactly what the provider charges
    const charged = Math.ceil(Number(data.estimated_credits || estimate || 0));

    if (charged > 0) {
      const { data: deducted } = await admin.rpc("deduct_credits_atomic", {
        _user_id: userId,
        _amount: charged,
      });
      if (deducted !== true) {
        console.warn("Credit deduction failed after task start for user:", userId);
      }
    }

    const { data: row, error: insertError } = await admin
      .from("image_generations")
      .insert({
        user_id: userId,
        external_task_id: data.task_id,
        model_id: modelId,
        prompt,
        aspect_ratio: aspectRatio ?? null,
        resolution: resolution ?? null,
        generations_count: generations,
        credits_charged: charged,
        status: "processing",
        progress: 5,
      })
      .select("id")
      .single();

    if (insertError) console.error("Insert image_generations error:", insertError);

    return new Response(
      JSON.stringify({
        success: true,
        id: row?.id ?? null,
        task_id: data.task_id,
        credits_charged: charged,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-image error:", error);
    return new Response(JSON.stringify({ error: MAINTENANCE_MESSAGE }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
