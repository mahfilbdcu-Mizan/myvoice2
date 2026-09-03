import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const apiKey = Deno.env.get("AI33_API_KEY") || "";
  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const targets: Array<{ path: string; method?: string; body?: unknown; headerStyle?: string }> = body.targets || [];
  const styles: Record<string, Record<string, string>> = {
    xi: { "xi-api-key": apiKey },
    bearer: { Authorization: `Bearer ${apiKey}` },
    xapikey: { "x-api-key": apiKey },
    apikey: { "api-key": apiKey },
    both: { "xi-api-key": apiKey, Authorization: `Bearer ${apiKey}` },
  };
  const out: unknown[] = [];
  for (const t of targets) {
    const method = t.method || "GET";
    const hs = styles[t.headerStyle || "xi"] || styles.xi;
    try {
      const r = await fetch("https://api.ai33.pro" + t.path, {
        method,
        headers: { ...hs, "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(t.body ?? {}),
      });
      const text = await r.text();
      out.push({ path: t.path, method, style: t.headerStyle || "xi", status: r.status, body: text.slice(0, 6000) });
    } catch (e) {
      out.push({ path: t.path, method, error: String(e) });
    }
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
