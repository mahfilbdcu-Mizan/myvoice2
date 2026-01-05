import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ExternalLink, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";

interface UserApiKey {
  id: string;
  provider: string;
  encrypted_key: string;
  is_valid: boolean | null;
  remaining_credits: number | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardApiKey() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedKey, setSavedKey] = useState<UserApiKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserApiKey();
    }
  }, [user]);

  const fetchUserApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from("user_api_keys")
        .select("*")
        .eq("user_id", user?.id)
        .eq("provider", "ai33")
        .maybeSingle();

      if (error) throw error;
      setSavedKey(data);
    } catch (error) {
      console.error("Error fetching API key:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim() || !user) return;

    setIsSaving(true);
    try {
      // Check API key balance first
      const balanceResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-api-balance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
        }
      );

      let remainingCredits: number | null = null;
      let isValid = false;

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        remainingCredits = balanceData.character_count || balanceData.credits || null;
        isValid = true;
      }

      // Save or update the API key
      if (savedKey) {
        const { error } = await supabase
          .from("user_api_keys")
          .update({
            encrypted_key: apiKey.trim(),
            is_valid: isValid,
            remaining_credits: remainingCredits,
            updated_at: new Date().toISOString(),
          })
          .eq("id", savedKey.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_api_keys").insert({
          user_id: user.id,
          provider: "ai33",
          encrypted_key: apiKey.trim(),
          is_valid: isValid,
          remaining_credits: remainingCredits,
        });

        if (error) throw error;
      }

      toast({
        title: "API Key Saved",
        description: isValid 
          ? `Your API key has been saved. Balance: ${remainingCredits?.toLocaleString() || 'Unknown'} credits`
          : "API key saved but could not verify balance",
      });

      setApiKey("");
      fetchUserApiKey();
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: "Failed to save API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckBalance = async () => {
    if (!savedKey) return;

    setIsChecking(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-api-balance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ apiKey: savedKey.encrypted_key }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const credits = data.character_count || data.credits || 0;
        
        await supabase
          .from("user_api_keys")
          .update({
            remaining_credits: credits,
            is_valid: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", savedKey.id);

        toast({
          title: "Balance Updated",
          description: `Your API balance: ${credits.toLocaleString()} credits`,
        });
        
        fetchUserApiKey();
      } else {
        toast({
          title: "Check Failed",
          description: "Could not verify API key balance",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking balance:", error);
      toast({
        title: "Error",
        description: "Failed to check balance",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!savedKey) return;

    try {
      const { error } = await supabase
        .from("user_api_keys")
        .delete()
        .eq("id", savedKey.id);

      if (error) throw error;

      toast({
        title: "API Key Deleted",
        description: "Your API key has been removed",
      });
      
      setSavedKey(null);
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  };

  if (authLoading) {
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">API Key</h1>
          <p className="text-muted-foreground">
            Add your own API key for unlimited text generation
          </p>
        </div>

        {/* Free Credits Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Free Credits: {profile?.credits?.toLocaleString() || 0} words</p>
              <p className="text-sm text-muted-foreground">
                100 free words for new users. Add your own API key for unlimited generation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current API Key */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          </Card>
        ) : savedKey ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Your API Key
                    {savedKey.is_valid ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Invalid
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    This key will be used for all your voice generations
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg border bg-muted/50 px-4 py-3 font-mono text-sm">
                  {showApiKey ? savedKey.encrypted_key : maskApiKey(savedKey.encrypted_key)}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              {savedKey.remaining_credits !== null && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">API Balance</p>
                  <p className="text-2xl font-bold">{savedKey.remaining_credits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Last checked: {new Date(savedKey.updated_at).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCheckBalance}
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Check Balance
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDeleteApiKey}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Key
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Add New API Key */}
        <Card>
          <CardHeader>
            <CardTitle>{savedKey ? "Update API Key" : "Add API Key"}</CardTitle>
            <CardDescription>
              Enter your Voice API key to enable unlimited generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSaveApiKey} disabled={!apiKey.trim() || isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {savedKey ? "Update" : "Save"} Key
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key is stored securely. With your own key, there's no text length limit.
            </p>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
                <span>New users get <strong>100 free words</strong> using platform credits</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
                <span>Add your own API key for <strong>unlimited text length</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
                <span>Your API balance is deducted directly from your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">4</span>
                <span>Generated audio is available for <strong>72 hours</strong> for download</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}