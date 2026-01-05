import { useState, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TextToSpeechPanel } from "@/components/voice/TextToSpeechPanel";
import { VoiceLibrary } from "@/components/voice/VoiceLibrary";
import { DubbingPanel } from "@/components/voice/DubbingPanel";
import { SpeechToTextPanel } from "@/components/voice/SpeechToTextPanel";
import { VoiceClonePanel } from "@/components/voice/VoiceClonePanel";
import { MusicGenerationPanel } from "@/components/voice/MusicGenerationPanel";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SelectedVoice {
  id: string;
  name: string;
}

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [selectedVoice, setSelectedVoice] = useState<SelectedVoice | null>(null);
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);
  const [activeTab, setActiveTab] = useState("tts");

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="mb-6">
          <TabsTrigger value="tts">Text to Speech</TabsTrigger>
          <TabsTrigger value="dubbing">Dubbing</TabsTrigger>
          <TabsTrigger value="stt">Speech to Text</TabsTrigger>
          <TabsTrigger value="clone">Voice Clone</TabsTrigger>
          <TabsTrigger value="music">Music</TabsTrigger>
        </TabsList>

        <TabsContent value="tts" className="h-full">
          <TextToSpeechPanel 
            selectedVoice={selectedVoice}
            onOpenVoiceLibrary={() => setShowVoiceLibrary(true)}
          />
        </TabsContent>

        <TabsContent value="dubbing">
          <DubbingPanel />
        </TabsContent>

        <TabsContent value="stt">
          <SpeechToTextPanel />
        </TabsContent>

        <TabsContent value="clone">
          <VoiceClonePanel />
        </TabsContent>

        <TabsContent value="music">
          <MusicGenerationPanel />
        </TabsContent>
      </Tabs>
      
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
