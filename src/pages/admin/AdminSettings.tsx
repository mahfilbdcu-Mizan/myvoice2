import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your changes have been saved successfully",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">
            Configure your platform settings and pricing
          </p>
        </div>

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
                <Input placeholder="Enter your TRC20 wallet address" />
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
              <Input defaultValue="Transform Text Into Natural Speech" />
            </div>
            <div className="space-y-2">
              <Label>Hero Subtitle</Label>
              <Input defaultValue="Create lifelike voiceovers, podcasts, and audio content with our state-of-the-art AI voice generation platform." />
            </div>
            <div className="space-y-2">
              <Label>Free Credits on Signup</Label>
              <Input type="number" defaultValue="100" />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save All Changes
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
