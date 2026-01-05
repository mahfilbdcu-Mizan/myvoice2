import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Eye, EyeOff, Key, AlertCircle, Activity, RefreshCw, Coins } from "lucide-react";
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

interface HealthStatus {
  elevenlabs: string;
  minimax: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [apiCredits, setApiCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
    fetchHealthStatus();
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
      
      // Fetch credits if API key is set
      if (settingsMap.ai33_api_key) {
        fetchApiCredits(settingsMap.ai33_api_key);
      }
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

  const fetchHealthStatus = async () => {
    setIsLoadingHealth(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setHealthStatus(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching health status:", error);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const fetchApiCredits = async (apiKey: string) => {
    setIsLoadingCredits(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-credits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ apiKey }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setApiCredits(data.credits);
        }
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update each setting
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
      
      // Refresh credits if API key changed
      if (settings.ai33_api_key) {
        fetchApiCredits(settings.ai33_api_key);
      }
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

  const getHealthBadge = (status: string) => {
    switch (status) {
      case "good":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Good</Badge>;
      case "degraded":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Degraded</Badge>;
      case "overloaded":
        return <Badge variant="destructive">Overloaded</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
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

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* API Credits */}
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <Coins className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Platform API Credits</p>
                {isLoadingCredits ? (
                  <Loader2 className="h-4 w-4 animate-spin mt-1" />
                ) : (
                  <p className="text-2xl font-bold">
                    {apiCredits !== null ? apiCredits.toLocaleString() : "—"}
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => settings.ai33_api_key && fetchApiCredits(settings.ai33_api_key)}
                disabled={isLoadingCredits || !settings.ai33_api_key}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingCredits ? 'animate-spin' : ''}`} />
              </Button>
            </CardContent>
          </Card>

          {/* ElevenLabs Status */}
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">ElevenLabs Service</p>
                {isLoadingHealth ? (
                  <Loader2 className="h-4 w-4 animate-spin mt-1" />
                ) : healthStatus ? (
                  <div className="mt-1">{getHealthBadge(healthStatus.elevenlabs)}</div>
                ) : (
                  <Badge variant="secondary" className="mt-1">Unknown</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Minimax Status */}
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Minimax Service</p>
                {isLoadingHealth ? (
                  <Loader2 className="h-4 w-4 animate-spin mt-1" />
                ) : healthStatus ? (
                  <div className="mt-1">{getHealthBadge(healthStatus.minimax)}</div>
                ) : (
                  <Badge variant="secondary" className="mt-1">Unknown</Badge>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={fetchHealthStatus}
                disabled={isLoadingHealth}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingHealth ? 'animate-spin' : ''}`} />
              </Button>
            </CardContent>
          </Card>
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
            
            <div className="space-y-2">
              <Label>Platform API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={settings.ai33_api_key || ""}
                    onChange={(e) => updateSetting("ai33_api_key", e.target.value)}
                    placeholder="Enter your platform API key"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the API key for voice generation service
              </p>
            </div>

            {settings.ai33_api_key ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                API key configured
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                No API key configured - voice generation will not work
              </div>
            )}
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
