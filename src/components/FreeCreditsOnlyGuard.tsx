import { useAuth } from "@/contexts/AuthContext";
import { Lock, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FreeCreditsOnlyGuardProps {
  children: React.ReactNode;
  featureName?: string;
}

export function FreeCreditsOnlyGuard({ children, featureName = "This feature" }: FreeCreditsOnlyGuardProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Free credits = initial 100 credits only
  // Users can only use TTS with free credits
  // Other features require purchased credits (more than initial 100 or having used and recharged)
  
  // If user has only received free credits and has 100 or less, they can't use premium features
  // This is a simplified check - in production you'd track purchased vs free credits separately
  const hasOnlyFreeCredits = profile?.has_received_free_credits && profile.credits <= 100;

  if (hasOnlyFreeCredits) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Lock className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
            <p className="text-muted-foreground mb-4">
              {featureName} requires purchased credits. Free credits can only be used for Text-to-Speech.
            </p>
            <Button onClick={() => navigate("/dashboard/credits")} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Buy Credits
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
