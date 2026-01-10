import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, AlertCircle, CheckCircle, Shield, Key, Eye, EyeOff, Trash2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlatformSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  is_secret: boolean;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // API Key states
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeySaving, setIsApiKeySaving] = useState(false);
  const [isApiKeyChecking, setIsApiKeyChecking] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<"unknown" | "valid" | "invalid">("unknown");
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*");

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      (data as PlatformSetting[])?.forEach((setting) => {
        if (setting.key === "ai33_api_key") {
          // Store masked version of API key if exists
          if (setting.value) {
            setCurrentApiKey(setting.value);
            setApiKeyStatus("valid");
          }
        } else {
          settingsMap[setting.key] = setting.value || "";
        }
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update each setting (excluding api key)
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ value })
          .eq("key", key);

        if (error) throw error;
      }

      toast({
        title: "Settings saved",
        description: "Your changes have been saved successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return "••••••••";
    return key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setIsApiKeySaving(true);
    try {
      // Save to platform_settings table
      const { error } = await supabase
        .from("platform_settings")
        .update({ value: apiKey })
        .eq("key", "ai33_api_key");

      if (error) throw error;

      setCurrentApiKey(apiKey);
      setApiKey("");
      setApiKeyStatus("valid");
      
      toast({
        title: "API Key saved",
        description: "Your API key has been saved successfully. Note: For production use, also update the Cloud secret.",
      });
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    }
    setIsApiKeySaving(false);
  };

  const handleCheckApiKey = async () => {
    if (!currentApiKey) return;
    
    setIsApiKeyChecking(true);
    try {
      // Call check-api-balance function to verify key
      const { data, error } = await supabase.functions.invoke("check-api-balance", {
        body: { apiKey: currentApiKey },
      });

      if (error) throw error;

      if (data?.balance !== undefined) {
        setApiKeyStatus("valid");
        toast({
          title: "API Key Valid",
          description: `Balance: ${data.balance?.toLocaleString() || 0} credits`,
        });
      } else {
        setApiKeyStatus("invalid");
        toast({
          title: "API Key Invalid",
          description: "The API key could not be verified",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking API key:", error);
      setApiKeyStatus("invalid");
      toast({
        title: "Error",
        description: "Failed to verify API key",
        variant: "destructive",
      });
    }
    setIsApiKeyChecking(false);
  };

  const handleDeleteApiKey = async () => {
    if (!confirm("Are you sure you want to delete the API key?")) return;

    setIsApiKeySaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({ value: null })
        .eq("key", "ai33_api_key");

      if (error) throw error;

      setCurrentApiKey(null);
      setApiKeyStatus("unknown");
      
      toast({
        title: "API Key deleted",
        description: "The API key has been removed",
      });
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
    setIsApiKeySaving(false);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">
            Configure your platform settings and pricing
          </p>
        </div>

        {/* API Key Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>API Key Configuration</CardTitle>
            </div>
            <CardDescription>
              Manage your AI33 Voice API key for voice generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current API Key Status */}
            {currentApiKey ? (
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {apiKeyStatus === "valid" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : apiKeyStatus === "invalid" ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      {apiKeyStatus === "valid" ? "Active" : apiKeyStatus === "invalid" ? "Invalid" : "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckApiKey}
                      disabled={isApiKeyChecking}
                    >
                      {isApiKeyChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="ml-2">Check</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteApiKey}
                      disabled={isApiKeySaving}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-2">Delete</span>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                    {showApiKey ? currentApiKey : maskApiKey(currentApiKey)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No API key configured. Add your AI33 API key below.
                </AlertDescription>
              </Alert>
            )}

            {/* Add/Update API Key */}
            <div className="space-y-2">
              <Label>{currentApiKey ? "Update API Key" : "Add API Key"}</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your AI33 API key"
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveApiKey}
                  disabled={isApiKeySaving || !apiKey.trim()}
                >
                  {isApiKeySaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {currentApiKey ? "Update" : "Save"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from AI33.pro dashboard
              </p>
            </div>

            {/* Cloud Secret Notice */}
            <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Cloud Secret</span>
              </div>
              <p className="mt-2 text-sm text-blue-600 dark:text-blue-500">
                For production, the AI33_API_KEY is also stored in Cloud secrets for secure backend usage.
                This database setting is used as a fallback.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* USDT Wallet Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>
              Configure your USDT wallet address for receiving payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Wallet Display */}
            {settings.usdt_wallet_trc20 && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Active Wallet</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to delete this wallet address?")) return;
                      updateSetting("usdt_wallet_trc20", "");
                      const { error } = await supabase
                        .from("platform_settings")
                        .update({ value: "" })
                        .eq("key", "usdt_wallet_trc20");
                      if (error) {
                        toast({
                          title: "Error",
                          description: "Failed to delete wallet",
                          variant: "destructive",
                        });
                      } else {
                        toast({
                          title: "Wallet deleted",
                          description: "USDT wallet has been removed",
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
                <div className="rounded bg-muted px-3 py-2 font-mono text-sm break-all">
                  {settings.usdt_wallet_trc20}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Network:</span>
                  <Badge variant="outline">TRC20</Badge>
                </div>
              </div>
            )}
            
            {/* Add/Update Wallet */}
            <div className="space-y-3">
              <Label>{settings.usdt_wallet_trc20 ? "Update Wallet Address" : "Add Wallet Address"}</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Input
                    value={settings.usdt_wallet_trc20 || ""}
                    onChange={(e) => updateSetting("usdt_wallet_trc20", e.target.value)}
                    placeholder="Enter your TRC20 wallet address"
                  />
                  <p className="text-xs text-muted-foreground">
                    This address will be shown to users for USDT payments
                  </p>
                </div>
                <div className="space-y-2">
                  <Input value="TRC20" disabled />
                  <p className="text-xs text-muted-foreground">
                    Only TRC20 network is supported
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Pricing</CardTitle>
            <CardDescription>
              Set the pricing for credit packages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-semibold">Starter Package</h4>
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input type="number" defaultValue="1000000" />
                </div>
                <div className="space-y-2">
                  <Label>Price (USDT)</Label>
                  <Input type="number" defaultValue="25" />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-primary p-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Popular Package</h4>
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    Popular
                  </span>
                </div>
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input type="number" defaultValue="5000000" />
                </div>
                <div className="space-y-2">
                  <Label>Price (USDT)</Label>
                  <Input type="number" defaultValue="110" />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-semibold">Pro Package</h4>
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input type="number" defaultValue="10000000" />
                </div>
                <div className="space-y-2">
                  <Label>Price (USDT)</Label>
                  <Input type="number" defaultValue="200" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Homepage Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Homepage Content</CardTitle>
            <CardDescription>
              Customize the landing page hero section
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Hero Title</Label>
              <Input
                value={settings.hero_title || ""}
                onChange={(e) => updateSetting("hero_title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hero Subtitle</Label>
              <Input
                value={settings.hero_subtitle || ""}
                onChange={(e) => updateSetting("hero_subtitle", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Free Credits on Signup</Label>
              <Input
                type="number"
                value={settings.free_credits_signup || "100"}
                onChange={(e) => updateSetting("free_credits_signup", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Number of free words new users get on signup
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All Changes
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
