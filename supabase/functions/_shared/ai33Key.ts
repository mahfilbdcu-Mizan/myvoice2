import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

/**
 * Returns the shared AI33 platform key.
 * Priority: platform_settings "ai33_api_key" (set from Admin Settings) → AI33_API_KEY env secret.
 */
export async function getPlatformAi33Key(): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "ai33_api_key")
        .maybeSingle();

      if (!error && data?.value && data.value.trim()) {
        return data.value.trim();
      }
    } catch (e) {
      console.error("Error reading platform ai33_api_key setting:", e);
    }
  }

  return Deno.env.get("AI33_API_KEY") || null;
}
