import { Navigate, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { VoiceLibrary } from "@/components/voice/VoiceLibrary";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function DashboardVoices() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSelectVoice = (voice: { id: string; name: string }) => {
    // Navigate to TTS with selected voice
    navigate("/dashboard", { state: { selectedVoice: voice } });
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
      <VoiceLibrary onSelectVoice={handleSelectVoice} />
    </DashboardLayout>
  );
}
