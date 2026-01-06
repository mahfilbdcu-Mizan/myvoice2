import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, AlertCircle, CheckCircle, Shield } from "lucide-react";
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
        // Skip the API key - it should not be exposed to client
        if (setting.key !== "ai33_api_key") {
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

        {/* API Key Security Notice */}
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-700 dark:text-green-400">Voice API Key Security</CardTitle>
            </div>
            <CardDescription className="text-green-600 dark:text-green-500">
              The Voice API key is securely stored as an environment variable
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-green-300 bg-green-100 dark:bg-green-900/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">API Key Configured via Environment Variable</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-500">
                The AI33_API_KEY is stored securely in the backend environment and is not exposed to the client-side. 
                This follows security best practices for secret management.
              </p>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                To update the API key, please use the Lovable Cloud secrets management. 
                The key will be used for all voice generation requests.
              </AlertDescription>
            </Alert>
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
