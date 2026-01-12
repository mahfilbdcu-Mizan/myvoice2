import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";

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

interface PricingSectionProps {
  packages: Package[];
}

export function PricingSection({ packages }: PricingSectionProps) {
  if (packages.length === 0) return null;

  return (
    <section className="border-t border-border py-16 sm:py-20 lg:py-24">
      <div className="container px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-12 lg:mb-16">
          <Badge variant="secondary" className="mb-3 sm:mb-4">
            Simple Pricing
          </Badge>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
            Choose Your <span className="text-primary">Plan</span>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-muted-foreground">
            No subscriptions, no hidden fees. Buy credits and use them anytime.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className={`mx-auto grid max-w-6xl gap-4 sm:gap-6 ${
          packages.length === 3 ? 'md:grid-cols-3' : 
          packages.length === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
          packages.length >= 5 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3'
        }`}>
          {packages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative transition-all hover:shadow-lg ${pkg.is_popular ? "border-primary shadow-lg shadow-primary/10" : ""}`}
            >
              {pkg.is_popular && (
                <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2">
                  <Badge className="shadow-lg text-[10px] sm:text-xs">Most Popular</Badge>
                </div>
              )}
              {pkg.discount_percentage > 0 && (
                <div className="absolute -top-2.5 sm:-top-3 right-3 sm:right-4">
                  <Badge variant="destructive" className="shadow-lg text-[10px] sm:text-xs">
                    {pkg.discount_percentage}% OFF
                  </Badge>
                </div>
              )}
              <CardHeader className="pt-6 sm:pt-8">
                <p className="text-sm sm:text-base font-medium text-[hsl(262,83%,58%)]">
                  {pkg.name}
                </p>
                <CardTitle className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold">${pkg.offer_price}</span>
                  {pkg.discount_percentage > 0 && (
                    <span className="text-sm sm:text-lg text-muted-foreground line-through">
                      ${pkg.real_price}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-base sm:text-lg">
                  {pkg.credits.toLocaleString()} credits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  {pkg.features?.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs sm:text-sm">
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Link to="/login">
                  <Button 
                    className="w-full" 
                    variant={pkg.is_popular ? "default" : "outline"}
                    size="default"
                  >
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-8 sm:mt-10 lg:mt-12 text-center">
          <Link to="/pricing">
            <Button variant="outline" size="lg" className="group">
              View All Pricing Details
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
