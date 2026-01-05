import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { VoiceLibrary } from "@/components/voice/VoiceLibrary";
import { useNavigate } from "react-router-dom";

export default function DashboardVoices() {
  const navigate = useNavigate();

  const handleSelectVoice = (voice: { id: string; name: string }) => {
    // Navigate to TTS with selected voice
    navigate("/dashboard", { state: { selectedVoice: voice } });
  };

  return (
    <DashboardLayout credits={82340}>
      <VoiceLibrary onSelectVoice={handleSelectVoice} />
    </DashboardLayout>
  );
}
