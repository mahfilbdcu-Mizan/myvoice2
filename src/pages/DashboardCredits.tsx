import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Zap, CreditCard, Loader2, Copy, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Package {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  real_price: number;
  offer_price: number;
  discount_percentage: number | null;
  is_popular: boolean | null;
  features: string[] | null;
}

const PAYMENT_NETWORK = "TRC20 (USDT)";

export default function DashboardCredits() {
  const { user, profile, isLoading } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [paymentStep, setPaymentStep] = useState<"select" | "payment" | "submit" | "success">("select");
  const [txid, setTxid] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch packages
      const { data: pkgData } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (pkgData) setPackages(pkgData);

      // Fetch wallet address from platform_settings
      const { data: settingsData } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "usdt_wallet_trc20")
        .single();
      
      if (settingsData?.value) {
        setWalletAddress(settingsData.value);
      }

      setLoadingPackages(false);
    };
    fetchData();
  }, []);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast({ title: "Address copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitPayment = async () => {
    if (!txid.trim()) {
      toast({
        title: "TXID required",
        description: "Please enter your payment transaction ID",
        variant: "destructive",
      });
      return;
    }

    if (!user || !selectedPackage) return;

    setIsSubmitting(true);
    
    const { error } = await supabase.from("credit_orders").insert({
      user_id: user.id,
      credits: selectedPackage.credits,
      amount_usdt: selectedPackage.offer_price,
      txid: txid.trim(),
      network: PAYMENT_NETWORK,
      wallet_address: walletAddress,
      status: "pending",
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit order. Please try again.",
        variant: "destructive",
      });
    } else {
      setPaymentStep("success");
    }
  };

  if (isLoading || loadingPackages) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Success view
  if (paymentStep === "success") {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="max-w-md text-center">
            <CardContent className="py-12">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Your payment is being verified by admin. Credits will be added to your account after verification.
              </p>
              <Button onClick={() => {
                setPaymentStep("select");
                setSelectedPackage(null);
                setTxid("");
              }}>
                Back to Packages
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Payment view
  if (paymentStep === "payment" && selectedPackage) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <button
            onClick={() => setPaymentStep("select")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to packages
          </button>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-medium">{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credits</span>
                  <span className="font-medium">{selectedPackage.credits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-bold text-lg">${selectedPackage.offer_price} USDT</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Instructions */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Payment Instructions</CardTitle>
                <CardDescription>Send USDT to the following address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Network</Label>
                  <div className="rounded-lg bg-muted p-3 font-mono text-sm">
                    {PAYMENT_NETWORK}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Wallet Address</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg bg-muted p-3 font-mono text-xs break-all">
                      {walletAddress || "Wallet address not configured"}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyAddress}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    ⚠️ Please send exactly <strong>${selectedPackage.offer_price} USDT</strong> to the above address using <strong>{PAYMENT_NETWORK}</strong> network.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="txid">Transaction ID (TXID)</Label>
                  <Input
                    id="txid"
                    placeholder="Enter your payment TXID"
                    value={txid}
                    onChange={(e) => setTxid(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    After payment, copy your transaction ID and paste it here.
                  </p>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmitPayment}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Submit Payment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Package selection view
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Buy Credits</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Purchase credits to generate more speech. 1 credit = 1 character.
          </p>
        </div>

        {/* Current Balance */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 sm:py-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl sm:text-3xl font-bold">{(profile?.credits ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs sm:text-sm">
              Credits never expire
            </Badge>
          </CardContent>
        </Card>

        {/* Pricing Cards */}
        <div className={`grid gap-4 sm:gap-6 ${
          packages.length === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 
          packages.length === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
          packages.length >= 5 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {packages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative transition-all hover:shadow-lg cursor-pointer ${
                pkg.is_popular ? "border-primary shadow-lg shadow-primary/10" : ""
              }`}
              onClick={() => {
                setSelectedPackage(pkg);
                setPaymentStep("payment");
              }}
            >
              {pkg.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="shadow-lg">Most Popular</Badge>
                </div>
              )}
              {(pkg.discount_percentage ?? 0) > 0 && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="destructive" className="shadow-lg">
                    {pkg.discount_percentage}% OFF
                  </Badge>
                </div>
              )}
              <CardHeader className="pt-8">
                <CardDescription className="font-medium">{pkg.name}</CardDescription>
                <CardTitle className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">${pkg.offer_price}</span>
                  {(pkg.discount_percentage ?? 0) > 0 && (
                    <span className="text-lg text-muted-foreground line-through">
                      ${pkg.real_price}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">USDT</span>
                </CardTitle>
                <CardDescription className="text-lg">
                  {pkg.credits.toLocaleString()} credits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {pkg.features?.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  className="w-full" 
                  variant={pkg.is_popular ? "default" : "outline"}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Purchase
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Accepted Payment:</span>
                <Badge variant="outline">USDT (TRC20)</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                After payment, submit your TXID and credits will be added upon admin verification.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>• Processing time: Usually within 24 hours</p>
              <p>• Credits are added to your existing balance</p>
              <p>• Contact support for enterprise pricing</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}