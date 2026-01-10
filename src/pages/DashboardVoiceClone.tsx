import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { VoiceClonePanel } from "@/components/voice/VoiceClonePanel";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function DashboardVoiceClone() {
  const { user, isLoading } = useAuth();

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
      <VoiceClonePanel />
    </DashboardLayout>
  );
}
