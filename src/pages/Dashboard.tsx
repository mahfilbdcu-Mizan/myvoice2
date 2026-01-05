import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TextToSpeechPanel } from "@/components/voice/TextToSpeechPanel";
import { VoiceLibrary } from "@/components/voice/VoiceLibrary";

interface SelectedVoice {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(null);
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);

  const handleSelectVoice = (voice: { id: string; name: string }) => {
    setSelectedVoice(voice);
    setShowVoiceLibrary(false);
  };

  return (
    <DashboardLayout credits={82340}>
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
