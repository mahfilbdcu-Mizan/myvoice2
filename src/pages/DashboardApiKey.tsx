import { useState, useEffect } from "react";
import { Key, Loader2, CheckCircle, AlertCircle, Trash2, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";

interface UserApiKeyInfo {
  id: string;
  provider: string;
  is_valid: boolean | null;
  remaining_credits: number | null;
  key_preview: string | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardApiKey() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState<UserApiKeyInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserApiKey();
    }
  }, [user]);

  const fetchUserApiKey = async () => {
    try {
      // Use the secure RPC function to get key metadata (no actual key exposed)
      const { data, error } = await supabase.rpc("get_user_api_key_info");

      if (error) throw error;
      
      // Find the ai33 provider key
      const ai33Key = Array.isArray(data) 
        ? data.find((k: UserApiKeyInfo) => k.provider === "ai33") 
        : null;
      
      setSavedKey(ai33Key || null);
    } catch (error) {
      console.error("Error fetching API key info:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim() || !user) return;

    // Client-side validation
    const trimmedKey = apiKey.trim();
    if (trimmedKey.length < 10) {
      toast({
        title: "Invalid API Key",
        description: "API key must be at least 10 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedKey)) {
      toast({
        title: "Invalid API Key Format",
        description: "API key contains invalid characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Call the secure edge function to save the encrypted key
      const response = await supabase.functions.invoke("save-api-key", {
        body: { apiKey: trimmedKey, provider: "ai33" },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to save API key");
      }

      const result = response.data;

      if (!result.success) {
        toast({
          title: "Save Failed",
          description: result.error || "Could not save API key.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      toast({
        title: "API Key Saved Securely",
        description: result.message || "Your API key has been encrypted and saved.",
      });

      setApiKey("");
      fetchUserApiKey();
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save API key. Please try again.",
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
      // Call the secure edge function - no API key sent from client!
      const response = await supabase.functions.invoke("check-api-balance", {
        body: { provider: "ai33" },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to check balance");
      }

      const data = response.data;
      
      if (data.valid === false) {
        toast({
          title: "Invalid API Key",
          description: data.error || "Your API key is no longer valid.",
          variant: "destructive",
        });
        fetchUserApiKey();
        return;
      }
      
      toast({
        title: "Balance Updated",
        description: `Your API balance: ${data.credits?.toLocaleString() || 'N/A'} credits`,
      });
      
      fetchUserApiKey();
    } catch (error) {
      console.error("Error checking balance:", error);
      toast({
        title: "Check Failed",
        description: error instanceof Error ? error.message : "Could not verify API key",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!savedKey) return;

    setIsDeleting(true);
    try {
      // Use the secure RPC function to delete
      const { error } = await supabase.rpc("delete_user_api_key_secure", {
        p_provider: "ai33",
      });

      if (error) throw error;

      toast({
        title: "API Key Deleted",
        description: "Your API key has been removed securely",
      });
      
      setSavedKey(null);
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
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

        {/* Security Notice */}
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-700 dark:text-green-400">🔒 Secure Storage</p>
              <p className="text-sm text-muted-foreground">
                Your API key is encrypted before storage. We never transmit or display your full key.
              </p>
            </div>
          </CardContent>
        </Card>

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
                  {savedKey.key_preview || "••••••••••••••••"}
                </div>
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
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Check Balance
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDeleteApiKey}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
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
                autoComplete="off"
              />
              <Button onClick={handleSaveApiKey} disabled={!apiKey.trim() || isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {savedKey ? "Update" : "Save"} Key
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              🔐 Your API key is encrypted with AES-256 before storage. We never see or store your plaintext key.
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
