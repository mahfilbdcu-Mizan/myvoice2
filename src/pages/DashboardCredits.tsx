import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const pricingPlans = [
  {
    credits: 1000000,
    price: 25,
    popular: false,
    perCredit: "0.000025",
  },
  {
    credits: 5000000,
    price: 110,
    popular: true,
    perCredit: "0.000022",
    savings: "12%",
  },
  {
    credits: 10000000,
    price: 200,
    popular: false,
    perCredit: "0.00002",
    savings: "20%",
  },
];

export default function DashboardCredits() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Buy Credits</h1>
          <p className="text-muted-foreground">
            Purchase credits to generate more speech. 1 credit = 1 word.
          </p>
        </div>

        {/* Current Balance */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-3xl font-bold">{(profile?.credits ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              Credits never expire
            </Badge>
          </CardContent>
        </Card>

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card 
              key={plan.credits} 
              className={plan.popular ? "relative border-primary shadow-elevated" : ""}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="shadow-lg">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-lg text-muted-foreground">USDT</span>
                </CardTitle>
                <CardDescription>
                  {plan.credits.toLocaleString()} credits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>${plan.perCredit} per credit</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>Credits never expire</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>All voices included</span>
                  </div>
                  {plan.savings && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span className="font-medium text-success">Save {plan.savings}</span>
                    </div>
                  )}
                </div>
                
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
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
