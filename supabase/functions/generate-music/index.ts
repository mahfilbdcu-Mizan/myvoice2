import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_MUSIC_URL = "https://api.ai33.pro/v1s/task/music-generation";
const AI33_CREDITS_URL = "https://api.ai33.pro/v1/credits";

const MAINTENANCE_MESSAGE =
  "The service is temporarily unavailable. We are working on it — please try again shortly. No credits were used.";

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

async function apiBalance(apiKey: string): Promise<number | null> {
  try {
    const res = await fetch(AI33_CREDITS_URL, { headers: { "xi-api-key": apiKey } });
    if (!res.ok) return null;
    const json = await res.json();
    const value = Number(json?.credits);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
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
    const createMode = body.create_mode === "custom" ? "custom" : "simple";
    const idea = typeof body.idea === "string" ? body.idea.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const lyrics = typeof body.lyrics === "string" ? body.lyrics.trim() : "";
    const tags = typeof body.tags === "string" ? body.tags.trim() : "";
    const vocalGender = body.vocal_gender === "m" || body.vocal_gender === "f" ? body.vocal_gender : "";
    const instrumental = body.make_instrumental === true;

    if (createMode === "simple") {
      if (!idea || idea.length > 500) {
        return new Response(
          JSON.stringify({ error: "Please describe your song (1-500 characters)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      if (!lyrics && !tags) {
        return new Response(
          JSON.stringify({ error: "Please provide lyrics or style tags." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (lyrics.length > 5000 || tags.length > 1000 || title.length > 80) {
        return new Response(
          JSON.stringify({ error: "Title, lyrics or style tags are too long." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const admin = serviceClient();

    const { data: apiKey } = await admin.rpc("get_decrypted_api_key", {
      p_user_id: userId,
      p_provider: "ai33",
    });

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "API key not configured. Please contact admin to set up your API key before generating music.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("credits, credits_expires_at")
      .eq("id", userId)
      .single();

    const availableCredits = profile?.credits ?? 0;
    const expiresAt = profile?.credits_expires_at ?? null;

    if (expiresAt && new Date(expiresAt) <= new Date()) {
      return new Response(
        JSON.stringify({ error: "Your credits have expired. Please contact the administrator." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (availableCredits <= 0) {
      return new Response(
        JSON.stringify({ error: "Not enough credits. Please contact the administrator." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Balance before the task, so we can charge exactly what the provider charges
    const balanceBefore = await apiBalance(apiKey);

    const payload: Record<string, unknown> = { create_mode: createMode };
    if (createMode === "simple") {
      payload.gpt_description_prompt = idea;
      payload.make_instrumental = instrumental;
    } else {
      if (title) payload.title = title;
      if (lyrics) payload.lyrics = lyrics;
      if (tags) payload.tags = tags;
      if (vocalGender) payload.vocal_gender = vocalGender;
    }

    const response = await fetch(AI33_MUSIC_URL, {
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

    const taskId = data?.task_id || data?.id || data?.data?.task_id;

    if (!response.ok || !taskId) {
      console.error("Music API error:", response.status, rawText);
      const lower = rawText.toLowerCase();
      const isMaintenance =
        response.status >= 500 ||
        response.status === 401 ||
        response.status === 402 ||
        lower.includes("maintenance") ||
        lower.includes("unavailable") ||
        lower.includes("not enough credits") ||
        lower.includes("insufficient") ||
        lower.includes("balance") ||
        lower.includes("quota");

      return new Response(
        JSON.stringify({
          error: isMaintenance ? MAINTENANCE_MESSAGE : data?.message || "Failed to generate music",
          maintenance: isMaintenance,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Exact provider cost = balance delta on the master API key
    let charged = 0;
    const remainRaw = Number(data?.ec_remain_credits);
    const balanceAfter = Number.isFinite(remainRaw) ? remainRaw : await apiBalance(apiKey);
    if (balanceBefore !== null && balanceAfter !== null && balanceBefore > balanceAfter) {
      charged = Math.ceil(balanceBefore - balanceAfter);
    }

    if (charged > 0) {
      const { data: deducted } = await admin.rpc("deduct_credits_atomic", {
        _user_id: userId,
        _amount: charged,
      });
      if (deducted !== true) {
        console.warn("Credit deduction failed after music task start for user:", userId);
      }
    }

    const { data: row, error: insertError } = await admin
      .from("music_generations")
      .insert({
        user_id: userId,
        external_task_id: String(taskId),
        provider: "suno",
        model: "v4.5-all",
        create_mode: createMode,
        title: title || null,
        idea: idea || null,
        lyrics: lyrics || null,
        tags: tags || null,
        vocal_gender: vocalGender || null,
        instrumental,
        credits_charged: charged,
        status: "processing",
        progress: 5,
      })
      .select("id")
      .single();

    if (insertError) console.error("Insert music_generations error:", insertError);

    return new Response(
      JSON.stringify({ success: true, id: row?.id ?? null, task_id: taskId, credits_charged: charged }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-music error:", error);
    return new Response(JSON.stringify({ error: MAINTENANCE_MESSAGE }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
