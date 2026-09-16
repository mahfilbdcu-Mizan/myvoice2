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

  const isExpired = !!profile?.credits_expires_at && new Date(profile.credits_expires_at) <= new Date();
  const availableCredits = isExpired ? 0 : (profile?.credits ?? 0);

  // Free credits (initial 100) can only be used for Text-to-Speech.
  const hasOnlyFreeCredits = profile?.has_received_free_credits && availableCredits <= 100;

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
            <div className="flex justify-center">
              <Button onClick={() => navigate("/dashboard/credits")} className="gap-2">
                <CreditCard className="h-4 w-4" />
                Buy Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
