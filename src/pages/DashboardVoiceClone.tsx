import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { VoiceClonePanel } from "@/components/voice/VoiceClonePanel";
import { BlockedUserGuard } from "@/components/BlockedUserGuard";
import { FreeCreditsOnlyGuard } from "@/components/FreeCreditsOnlyGuard";
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
      <BlockedUserGuard featureName="Voice Clone">
        <FreeCreditsOnlyGuard featureName="Voice Clone">
          <VoiceClonePanel />
        </FreeCreditsOnlyGuard>
      </BlockedUserGuard>
    </DashboardLayout>
  );
}
