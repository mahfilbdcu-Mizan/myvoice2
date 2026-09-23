import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const key = Deno.env.get("AI33_API_KEY") ?? "";
  const paths: string[] = (await req.json().catch(() => ({}))).paths ?? [
    "v3/voice/clone",
    "v3/voices/clone",
    "v3/voice-clone",
    "v3/voices",
    "v1m/voice/clone",
  ];
  const out: Record<string, unknown> = {};
  for (const p of paths) {
    for (const method of ["GET", "POST"]) {
      try {
        const r = await fetch(`https://api.ai33.pro/${p}`, {
          method,
          headers: { "xi-api-key": key },
        });
        const t = await r.text();
        out[`${method} ${p}`] = { status: r.status, body: t.slice(0, 400) };
      } catch (e) {
        out[`${method} ${p}`] = { error: String(e) };
      }
    }
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
