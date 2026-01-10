import { useAuth } from "@/contexts/AuthContext";
import { Ban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BlockedUserGuardProps {
  children: React.ReactNode;
  featureName?: string;
}

export function BlockedUserGuard({ children, featureName = "This feature" }: BlockedUserGuardProps) {
  const { profile } = useAuth();

  if (profile?.is_blocked) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Card className="max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <Ban className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-destructive mb-2">Account Blocked</h2>
            <p className="text-muted-foreground">
              {featureName} is not available because your account has been blocked.
              Please contact support for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
