import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, AlertCircle, CheckCircle, Shield, Key, Eye, EyeOff, Trash2, RefreshCw, MessageCircle, Send, Phone, Facebook, Youtube, Image } from "lucide-react";
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

  // Chatbot states
  const [chatbotEnabled, setChatbotEnabled] = useState(true);

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
          if (setting.value) {
            setCurrentApiKey(setting.value);
            setApiKeyStatus("valid");
          }
        } else if (setting.key === "chatbot_enabled") {
          setChatbotEnabled(setting.value === "true");
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
          .upsert({ key, value }, { onConflict: "key" });

        if (error) throw error;
      }

      // Update chatbot enabled
      await supabase
        .from("platform_settings")
        .upsert({ key: "chatbot_enabled", value: chatbotEnabled ? "true" : "false" }, { onConflict: "key" });

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
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ key: "ai33_api_key", value: apiKey }, { onConflict: "key" });

      if (error) throw error;

      setCurrentApiKey(apiKey);
      setApiKey("");
      setApiKeyStatus("valid");
      
      toast({
        title: "API Key saved",
        description: "Your API key has been saved successfully.",
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
            Configure your platform settings, contact links, and chatbot
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
            </div>
          </CardContent>
        </Card>

        {/* Contact Links Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle>Contact Page Links</CardTitle>
            </div>
            <CardDescription>
              Manage the contact links displayed on the Contact page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Telegram Channel */}
            <div className="grid gap-4 sm:grid-cols-2 p-4 border rounded-lg">
              <div className="flex items-center gap-3 sm:col-span-2">
                <Send className="h-5 w-5 text-[hsl(200,90%,50%)]" />
                <span className="font-medium">Telegram Channel</span>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={settings.contact_telegram_channel_name || ""}
                  onChange={(e) => updateSetting("contact_telegram_channel_name", e.target.value)}
                  placeholder="@BDYTAUTOMATION"
                />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={settings.contact_telegram_channel || ""}
                  onChange={(e) => updateSetting("contact_telegram_channel", e.target.value)}
                  placeholder="https://t.me/BDYTAUTOMATION"
                />
              </div>
            </div>

            {/* Telegram Support */}
            <div className="grid gap-4 sm:grid-cols-2 p-4 border rounded-lg">
              <div className="flex items-center gap-3 sm:col-span-2">
                <MessageCircle className="h-5 w-5 text-[hsl(200,90%,50%)]" />
                <span className="font-medium">Telegram Support</span>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={settings.contact_telegram_support_name || ""}
                  onChange={(e) => updateSetting("contact_telegram_support_name", e.target.value)}
                  placeholder="@BDTYAUTOMATIONSupport"
                />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={settings.contact_telegram_support || ""}
                  onChange={(e) => updateSetting("contact_telegram_support", e.target.value)}
                  placeholder="https://t.me/BDTYAUTOMATIONSupport"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="grid gap-4 sm:grid-cols-2 p-4 border rounded-lg">
              <div className="flex items-center gap-3 sm:col-span-2">
                <Phone className="h-5 w-5 text-[hsl(140,70%,45%)]" />
                <span className="font-medium">WhatsApp</span>
              </div>
              <div className="space-y-2">
                <Label>Display Number</Label>
                <Input
                  value={settings.contact_whatsapp_number || ""}
                  onChange={(e) => updateSetting("contact_whatsapp_number", e.target.value)}
                  placeholder="+8801757433586"
                />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={settings.contact_whatsapp || ""}
                  onChange={(e) => updateSetting("contact_whatsapp", e.target.value)}
                  placeholder="https://wa.me/8801757433586"
                />
              </div>
            </div>

            {/* Facebook */}
            <div className="grid gap-4 sm:grid-cols-2 p-4 border rounded-lg">
              <div className="flex items-center gap-3 sm:col-span-2">
                <Facebook className="h-5 w-5 text-[hsl(220,90%,55%)]" />
                <span className="font-medium">Facebook</span>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={settings.contact_facebook_name || ""}
                  onChange={(e) => updateSetting("contact_facebook_name", e.target.value)}
                  placeholder="Abdus Samad"
                />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={settings.contact_facebook || ""}
                  onChange={(e) => updateSetting("contact_facebook", e.target.value)}
                  placeholder="https://www.facebook.com/AbdusSamad2979/"
                />
              </div>
            </div>

            {/* YouTube */}
            <div className="grid gap-4 sm:grid-cols-2 p-4 border rounded-lg">
              <div className="flex items-center gap-3 sm:col-span-2">
                <Youtube className="h-5 w-5 text-[hsl(0,85%,55%)]" />
                <span className="font-medium">YouTube Channel</span>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={settings.contact_youtube_name || ""}
                  onChange={(e) => updateSetting("contact_youtube_name", e.target.value)}
                  placeholder="@BDTYAUTOMATION"
                />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={settings.contact_youtube || ""}
                  onChange={(e) => updateSetting("contact_youtube", e.target.value)}
                  placeholder="https://www.youtube.com/@BDTYAUTOMATION/videos"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chatbot Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle>Chatbot Widget</CardTitle>
            </div>
            <CardDescription>
              Configure the floating chatbot widget that redirects to Telegram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Enable Chatbot</Label>
                <p className="text-sm text-muted-foreground">
                  Show floating chat button on all pages
                </p>
              </div>
              <Switch
                checked={chatbotEnabled}
                onCheckedChange={setChatbotEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Telegram Redirect Link</Label>
              <Input
                value={settings.chatbot_telegram_link || ""}
                onChange={(e) => updateSetting("chatbot_telegram_link", e.target.value)}
                placeholder="https://t.me/BDTYAUTOMATIONSupport"
              />
              <p className="text-xs text-muted-foreground">
                When users click the chat button, they will be redirected to this Telegram link
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

        {/* Site Logo Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              <CardTitle>Site Logo</CardTitle>
            </div>
            <CardDescription>
              Configure the logo that appears across the website and dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.site_logo_url && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Current Logo</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to remove the custom logo?")) return;
                      updateSetting("site_logo_url", "");
                      const { error } = await supabase
                        .from("platform_settings")
                        .update({ value: "" })
                        .eq("key", "site_logo_url");
                      if (error) {
                        toast({
                          title: "Error",
                          description: "Failed to remove logo",
                          variant: "destructive",
                        });
                      } else {
                        toast({
                          title: "Logo removed",
                          description: "The custom logo has been removed",
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <img 
                    src={settings.site_logo_url} 
                    alt="Current Logo" 
                    className="h-16 w-16 rounded-lg object-cover border"
                  />
                  <p className="text-sm text-muted-foreground break-all">
                    {settings.site_logo_url}
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>{settings.site_logo_url ? "Update Logo URL" : "Logo URL"}</Label>
              <Input
                value={settings.site_logo_url || ""}
                onChange={(e) => updateSetting("site_logo_url", e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Enter the URL of your logo image. Recommended size: 200x200px or similar square ratio.
              </p>
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
                Number of free credits new users get on signup
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
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
