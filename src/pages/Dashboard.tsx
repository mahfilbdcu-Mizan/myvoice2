import { useState, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TextToSpeechPanel } from "@/components/voice/TextToSpeechPanel";
import { VoiceLibrary } from "@/components/voice/VoiceLibrary";
import { BlockedUserGuard } from "@/components/BlockedUserGuard";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface SelectedVoice {
  id: string;
  name: string;
}

const VOICE_STORAGE_KEY = "tts_settings";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(null);
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);

  // Load saved voice from localStorage on mount
  useEffect(() => {
    if (user) {
      try {
        const storageKey = `${VOICE_STORAGE_KEY}_${user.id}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.elevenLabsVoice && !location.state?.selectedVoice) {
            setSelectedVoice(parsed.elevenLabsVoice);
          }
        }
      } catch (error) {
        console.error("Failed to load saved voice:", error);
      }
    }
  }, [user]);

  // Check for voice passed from Voice Library page
  useEffect(() => {
    if (location.state?.selectedVoice) {
      setSelectedVoice(location.state.selectedVoice);
    }
  }, [location.state]);

  const handleSelectVoice = (voice: { id: string; name: string }) => {
    setSelectedVoice(voice);
    setShowVoiceLibrary(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <BlockedUserGuard featureName="Text-to-Speech">
        <TextToSpeechPanel 
          selectedVoice={selectedVoice}
          onOpenVoiceLibrary={() => setShowVoiceLibrary(true)}
        />
        
        {showVoiceLibrary && (
          <VoiceLibrary 
            isModal 
            onClose={() => setShowVoiceLibrary(false)}
            onSelectVoice={handleSelectVoice}
          />
        )}
      </BlockedUserGuard>
    </DashboardLayout>
  );
}
