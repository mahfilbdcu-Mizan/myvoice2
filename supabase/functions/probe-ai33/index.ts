import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const apiKey = Deno.env.get("AI33_API_KEY") || "";
  const out: Record<string, unknown> = {};
  for (const url of [
    "https://api.ai33.pro/openapi.json",
    "https://api.ai33.pro/v3/openapi.json",
  ]) {
    try {
      const r = await fetch(url, { headers: { "xi-api-key": apiKey } });
      const t = await r.text();
      if (r.ok) {
        try {
          const j = JSON.parse(t);
          out[url] = { status: r.status, paths: Object.keys(j.paths || {}) };
          continue;
        } catch { /* not json */ }
      }
      out[url] = { status: r.status, body: t.slice(0, 300) };
    } catch (e) {
      out[url] = { error: String(e) };
    }
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
