import { supabase } from "@/integrations/supabase/client";

export interface Voice {
  id: string;
  name: string;
  accent: string | null;
  gender: string | null;
  age: string | null;
  languages: string[] | null;
  category: string | null;
  preview_url: string | null;
  provider: string;
}

export async function getVoices(): Promise<Voice[]> {
  const { data, error } = await supabase
    .from("voices")
    .select("*")
    .eq("is_active", true)
    .order("name");
  
  if (error) {
    console.error("Error fetching voices:", error);
    return [];
  }
  
  return data || [];
}

export async function getVoiceById(voiceId: string): Promise<Voice | null> {
  const { data, error } = await supabase
    .from("voices")
    .select("*")
    .eq("id", voiceId)
    .single();
  
  if (error) {
    console.error("Error fetching voice:", error);
    return null;
  }
  
  return data;
}

export interface GenerateOptions {
  text: string;
  voiceId: string;
  provider?: string;
  model?: string;
  stability?: number;
  similarity?: number;
  speed?: number;
  style?: number;
}

export async function generateSpeech(options: GenerateOptions): Promise<{
  audioUrl?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(options),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || "Failed to generate speech" };
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    return { audioUrl };
  } catch (err) {
    console.error("Error generating speech:", err);
    return { error: "Network error. Please try again." };
  }
}

export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  // Update credits directly in profiles table
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  
  if (fetchError || !profile) {
    console.error("Error fetching profile:", fetchError);
    return false;
  }
  
  const newCredits = (profile.credits || 0) - amount;
  if (newCredits < 0) {
    console.error("Insufficient credits");
    return false;
  }
  
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ credits: newCredits })
    .eq("id", userId);
  
  if (updateError) {
    console.error("Error updating credits:", updateError);
    return false;
  }
  
  return true;
}
