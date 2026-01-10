import { useAuth } from "@/contexts/AuthContext";
import { Lock, CreditCard, Key } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FreeCreditsOnlyGuardProps {
  children: React.ReactNode;
  featureName?: string;
}

export function FreeCreditsOnlyGuard({ children, featureName = "This feature" }: FreeCreditsOnlyGuardProps) {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has their own API key
  useEffect(() => {
    async function checkApiKey() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_user_api_key_info');
        
        if (error) {
          console.error('Error checking API key:', error);
          setHasApiKey(false);
        } else {
          // User has an API key if there's data with a valid key
          const validKey = data?.find((key: any) => key.provider === 'ai33' && key.is_valid);
          setHasApiKey(!!validKey);
        }
      } catch (err) {
        console.error('Error checking API key:', err);
        setHasApiKey(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkApiKey();
  }, [user]);

  // Show loading while checking API key
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Free credits = initial 100 credits only
  // Users can only use TTS with free credits
  // If user has their own API key, they can use ALL features
  // Otherwise, they need purchased credits (more than initial 100)
  
  // If user has their own API key, allow access to all features
  if (hasApiKey) {
    return <>{children}</>;
  }

  // If user has only received free credits and has 100 or less, they can't use premium features
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
              {featureName} requires your own API key or purchased credits. Free credits can only be used for Text-to-Speech.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/dashboard/api-key")} variant="outline" className="gap-2">
                <Key className="h-4 w-4" />
                Add API Key
              </Button>
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
