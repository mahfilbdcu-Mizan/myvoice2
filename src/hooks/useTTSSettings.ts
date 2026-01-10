import { useState, useEffect } from "react";

interface TTSSettings {
  // Provider
  provider: "elevenlabs" | "minimax";
  
  // Text
  text: string;
  
  // ElevenLabs settings
  elevenLabsVoice: { id: string; name: string; provider?: string } | null;
  elevenLabsModel: string;
  language: string;
  speed: number;
  stability: number;
  similarity: number;
  style: number;
  speakerBoost: boolean;
  
  // Minimax settings
  minimaxVoice: { voice_id: string; voice_name: string } | null;
  minimaxModel: string;
  minimaxLanguage: string;
  minimaxVol: number;
  minimaxPitch: number;
  minimaxSpeed: number;
}

const STORAGE_KEY = "tts_settings";

const defaultSettings: TTSSettings = {
  provider: "elevenlabs",
  text: "",
  elevenLabsVoice: null,
  elevenLabsModel: "eleven_multilingual_v2",
  language: "auto",
  speed: 1.0,
  stability: 0.5,
  similarity: 0.75,
  style: 0,
  speakerBoost: false,
  minimaxVoice: null,
  minimaxModel: "speech-2.6-hd",
  minimaxLanguage: "Auto",
  minimaxVol: 1.0,
  minimaxPitch: 0,
  minimaxSpeed: 1.0,
};

export function useTTSSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<TTSSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (!userId) return;
    
    try {
      const storageKey = `${STORAGE_KEY}_${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TTSSettings>;
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error("Failed to load TTS settings:", error);
    } finally {
      setIsLoaded(true);
    }
  }, [userId]);

  // Save settings to localStorage
  const saveSettings = (newSettings: Partial<TTSSettings>) => {
    if (!userId) return;
    
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        const storageKey = `${STORAGE_KEY}_${userId}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save TTS settings:", error);
      }
      return updated;
    });
  };

  // Update individual settings
  const updateProvider = (provider: "elevenlabs" | "minimax") => saveSettings({ provider });
  const updateText = (text: string) => saveSettings({ text });
  
  // ElevenLabs
  const updateElevenLabsVoice = (voice: { id: string; name: string; provider?: string } | null) => 
    saveSettings({ elevenLabsVoice: voice });
  const updateElevenLabsModel = (model: string) => saveSettings({ elevenLabsModel: model });
  const updateLanguage = (language: string) => saveSettings({ language });
  const updateSpeed = (speed: number) => saveSettings({ speed });
  const updateStability = (stability: number) => saveSettings({ stability });
  const updateSimilarity = (similarity: number) => saveSettings({ similarity });
  const updateStyle = (style: number) => saveSettings({ style });
  const updateSpeakerBoost = (speakerBoost: boolean) => saveSettings({ speakerBoost });
  
  // Minimax
  const updateMinimaxVoice = (voice: { voice_id: string; voice_name: string } | null) => 
    saveSettings({ minimaxVoice: voice });
  const updateMinimaxModel = (model: string) => saveSettings({ minimaxModel: model });
  const updateMinimaxLanguage = (language: string) => saveSettings({ minimaxLanguage: language });
  const updateMinimaxVol = (vol: number) => saveSettings({ minimaxVol: vol });
  const updateMinimaxPitch = (pitch: number) => saveSettings({ minimaxPitch: pitch });
  const updateMinimaxSpeed = (speed: number) => saveSettings({ minimaxSpeed: speed });

  return {
    settings,
    isLoaded,
    updateProvider,
    updateText,
    updateElevenLabsVoice,
    updateElevenLabsModel,
    updateLanguage,
    updateSpeed,
    updateStability,
    updateSimilarity,
    updateStyle,
    updateSpeakerBoost,
    updateMinimaxVoice,
    updateMinimaxModel,
    updateMinimaxLanguage,
    updateMinimaxVol,
    updateMinimaxPitch,
    updateMinimaxSpeed,
  };
}
