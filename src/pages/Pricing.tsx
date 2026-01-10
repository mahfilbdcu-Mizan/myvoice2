import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Package {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  real_price: number;
  offer_price: number;
  discount_percentage: number;
  is_popular: boolean;
  features: string[];
}

const features = [
  "10000+ premium AI voices",
  "29 supported languages",
  "Text to Speech",
  "Speech to Text",
  "AI Dubbing",
  "API access",
  "Commercial license",
  "Priority support",
];

export default function Pricing() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (data) {
        setPackages(data);
      }
      setIsLoading(false);
    };
    fetchPackages();
  }, []);

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
                    <p className="text-sm text-muted-foreground">100 credits on signup</p>
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
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className={`mx-auto grid max-w-6xl gap-6 ${
                packages.length === 3 ? 'md:grid-cols-3' : 
                packages.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
                packages.length >= 5 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3'
              }`}>
                {packages.map((pkg) => (
                  <Card 
                    key={pkg.id} 
                    className={pkg.is_popular ? "relative border-primary shadow-elevated" : ""}
                  >
                    {pkg.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="shadow-lg">Most Popular</Badge>
                      </div>
                    )}
                    {pkg.discount_percentage > 0 && (
                      <div className="absolute -top-3 right-4">
                        <Badge variant="destructive" className="shadow-lg">
                          {pkg.discount_percentage}% OFF
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pt-8">
                      <CardDescription className="text-base font-medium">
                        {pkg.name}
                      </CardDescription>
                      <CardTitle className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">${pkg.offer_price}</span>
                        {pkg.discount_percentage > 0 && (
                          <span className="text-lg text-muted-foreground line-through">
                            ${pkg.real_price}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-lg">
                        {pkg.credits.toLocaleString()} credits
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-sm text-muted-foreground">
                        {pkg.description}
                      </p>
                      <div className="space-y-3">
                        {pkg.features?.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-success shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-success" />
                          <span>Credits never expire</span>
                        </div>
                      </div>
                      
                      <Link to="/login">
                        <Button 
                          className="w-full" 
                          variant={pkg.is_popular ? "default" : "outline"}
                          size="lg"
                        >
                          Get Started
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
                    1 credit = 1 character. Credits are deducted only after successful audio generation.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold">Will credit limit expire?</h3>
                  <p className="mt-2 text-muted-foreground">
                    Credit expiry depends on your package. Each package has a validity period after which unused credits expire.
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
