import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function extractTracks(task: any): Array<Record<string, unknown>> {
  const meta = task?.metadata ?? {};
  const urls: string[] = [];
  if (Array.isArray(meta.all_audio_urls)) {
    for (const u of meta.all_audio_urls) if (typeof u === "string" && u.trim()) urls.push(u);
  }
  if (urls.length === 0 && typeof meta.audio_url === "string" && meta.audio_url.trim()) {
    urls.push(meta.audio_url);
  }
  return urls.map((url, index) => ({
    audio_url: url,
    cover_url: meta.image_url || null,
    title: meta.title || "Untitled Song",
    index,
  }));
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
    const rowId = typeof body.id === "string" ? body.id : "";
    if (!rowId) {
      return new Response(JSON.stringify({ error: "id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = serviceClient();
    await admin.rpc("cleanup_expired_music_generations");

    const { data: row } = await admin
      .from("music_generations")
      .select("*")
      .eq("id", rowId)
      .eq("user_id", userId)
      .single();

    if (!row) {
      return new Response(JSON.stringify({ error: "Task not found or expired" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.status === "completed" || row.status === "failed" || !row.external_task_id) {
      return new Response(JSON.stringify({ success: true, task: row }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: apiKey } = await admin.rpc("get_decrypted_api_key", {
      p_user_id: userId,
      p_provider: "ai33",
    });

    if (!apiKey) {
      return new Response(JSON.stringify({ success: true, task: row }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(`https://api.ai33.pro/v1/task/${row.external_task_id}`, {
      headers: { "xi-api-key": apiKey },
    });

    if (!upstream.ok) {
      console.error("Music task poll failed:", upstream.status, await upstream.text());
      return new Response(JSON.stringify({ success: true, task: row }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await upstream.json();
    const task = payload?.data ?? payload;
    const status = String(task?.status || "").toLowerCase();
    const tracks = extractTracks(task);

    const updates: Record<string, unknown> = {
      progress: Number(task?.progress || row.progress || 0),
    };

    if ((status === "done" || status === "success" || status === "completed") && tracks.length > 0) {
      updates.status = "completed";
      updates.progress = 100;
      updates.tracks = tracks;
      updates.completed_at = new Date().toISOString();
      if (task?.metadata?.title && !row.title) updates.title = task.metadata.title;
      if (task?.credit_cost) updates.credits_charged = Math.ceil(Number(task.credit_cost));
    } else if (status === "error" || status === "failed") {
      updates.status = "failed";
      updates.error_message = "Could not generate the song. Please try again shortly.";

      // Refund what we charged when the provider fails
      const refund = Number(row.credits_charged || 0);
      if (refund > 0) {
        await admin.rpc("refund_credits_atomic", { _user_id: userId, _amount: refund });
        updates.credits_charged = 0;
      }
    }

    const { data: updated } = await admin
      .from("music_generations")
      .update(updates)
      .eq("id", rowId)
      .select("*")
      .single();

    return new Response(JSON.stringify({ success: true, task: updated ?? { ...row, ...updates } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-music-task error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
