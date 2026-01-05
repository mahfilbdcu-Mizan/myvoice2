import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Zap } from "lucide-react";

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

const features = [
  "100+ premium AI voices",
  "29 supported languages",
  "Text to Speech",
  "Speech to Text",
  "AI Dubbing",
  "API access",
  "Commercial license",
  "Priority support",
];

export default function Pricing() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-surface-subtle py-20">
          <div className="container text-center">
            <Badge variant="secondary" className="mb-4">
              Simple, transparent pricing
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Pay Only for What You Use
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              No subscriptions, no hidden fees. Buy credits and use them anytime.
              Credits never expire.
            </p>
          </div>
        </section>

        {/* Free Tier */}
        <section className="py-12">
          <div className="container">
            <Card className="mx-auto max-w-xl border-primary/20 bg-primary/5">
              <CardContent className="flex items-center justify-between py-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Free Starter</p>
                    <p className="text-sm text-muted-foreground">100 characters on signup</p>
                  </div>
                </div>
                <Link to="/login">
                  <Button>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12">
          <div className="container">
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
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
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-lg text-muted-foreground">USDT</span>
                    </CardTitle>
                    <CardDescription className="text-lg">
                      {plan.credits.toLocaleString()} credits
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
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
                        <span>All features included</span>
                      </div>
                      {plan.savings && (
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-success" />
                          <span className="font-medium text-success">Save {plan.savings}</span>
                        </div>
                      )}
                    </div>
                    
                    <Link to="/login">
                      <Button 
                        className="w-full" 
                        variant={plan.popular ? "default" : "outline"}
                        size="lg"
                      >
                        Get Started
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-surface-subtle py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold">Everything Included</h2>
              <p className="mt-4 text-muted-foreground">
                All plans include full access to our platform features
              </p>
              
              <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-left">
                    <Check className="h-5 w-5 shrink-0 text-success" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-12 text-center text-3xl font-bold">
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold">How do credits work?</h3>
                  <p className="mt-2 text-muted-foreground">
                    1 credit = 1 generated character. Credits are deducted only after successful audio generation.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold">Do credits expire?</h3>
                  <p className="mt-2 text-muted-foreground">
                    No, credits never expire. Use them whenever you need.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold">What payment methods do you accept?</h3>
                  <p className="mt-2 text-muted-foreground">
                    We accept USDT payments via TRC20 network. Credits are added after admin verification.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold">Can I use my own API key?</h3>
                  <p className="mt-2 text-muted-foreground">
                    Yes, you can add your own API key in the dashboard settings to use your own quota.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
