import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Eye, EyeOff, Key, AlertCircle, Trash2, CheckCircle } from "lucide-react";
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
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [isRemovingKey, setIsRemovingKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

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
        settingsMap[setting.key] = setting.value || "";
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

  const handleSaveApiKey = async () => {
    if (!newApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setIsSavingKey(true);
    try {
      // Check if the setting already exists
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("key", "ai33_api_key")
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("platform_settings")
          .update({ value: newApiKey.trim(), updated_at: new Date().toISOString() })
          .eq("key", "ai33_api_key");

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("platform_settings")
          .insert({
            key: "ai33_api_key",
            value: newApiKey.trim(),
            description: "AI33 Voice API Key",
            is_secret: true,
          });

        if (error) throw error;
      }

      toast({
        title: "API Key Saved",
        description: "Voice API key has been configured successfully",
      });

      setNewApiKey("");
      fetchSettings();
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    }
    setIsSavingKey(false);
  };

  const handleRemoveApiKey = async () => {
    setIsRemovingKey(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({ value: null, updated_at: new Date().toISOString() })
        .eq("key", "ai33_api_key");

      if (error) throw error;

      toast({
        title: "API Key Removed",
        description: "Voice API key has been removed",
      });

      fetchSettings();
    } catch (error) {
      console.error("Error removing API key:", error);
      toast({
        title: "Error",
        description: "Failed to remove API key",
        variant: "destructive",
      });
    }
    setIsRemovingKey(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update each setting (excluding api key which is handled separately)
      for (const [key, value] of Object.entries(settings)) {
        if (key === "ai33_api_key") continue; // Skip API key
        
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
    if (!key || key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••••••" + key.slice(-4);
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
            Configure your platform settings, API keys, and pricing
          </p>
        </div>

        {/* API Key Settings */}
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Voice Generation API Key</CardTitle>
            </div>
            <CardDescription>
              Configure the API key used for all voice generation. This key is shared by all users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This API key will be used for all voice generation requests. Users get <strong>100 free words</strong> on signup, after which they need to purchase credits.
              </AlertDescription>
            </Alert>

            {/* Current API Key Status */}
            {settings.ai33_api_key ? (
              <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">API Key Configured</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-md border bg-background px-4 py-2 font-mono text-sm">
                    {showApiKey ? settings.ai33_api_key : maskApiKey(settings.ai33_api_key)}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveApiKey}
                    disabled={isRemovingKey}
                  >
                    {isRemovingKey ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 p-4">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">No API Key Configured</span>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                  Voice generation will not work until an API key is added
                </p>
              </div>
            )}
            
            {/* Add/Update API Key */}
            <div className="space-y-2">
              <Label>{settings.ai33_api_key ? "Update API Key" : "Add API Key"}</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Enter your Voice API key"
                  className="flex-1"
                />
                <Button onClick={handleSaveApiKey} disabled={isSavingKey || !newApiKey.trim()}>
                  {isSavingKey ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {settings.ai33_api_key ? "Update" : "Save"} Key
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from the voice generation service provider
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>USDT Wallet Address (TRC20)</Label>
                <Input
                  value={settings.usdt_wallet_trc20 || ""}
                  onChange={(e) => updateSetting("usdt_wallet_trc20", e.target.value)}
                  placeholder="Enter your TRC20 wallet address"
                />
              </div>
              <div className="space-y-2">
                <Label>Network</Label>
                <Input value="TRC20" disabled />
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
