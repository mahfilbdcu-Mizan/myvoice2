import { useState, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TextToSpeechPanel } from "@/components/voice/TextToSpeechPanel";
import { VoiceLibrary } from "@/components/voice/VoiceLibrary";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface SelectedVoice {
  id: string;
  name: string;
}

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(null);
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);

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
    </DashboardLayout>
  );
}
