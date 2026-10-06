import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ExternalLink, Globe2, Infinity, Rocket } from "lucide-react";

const TELEGRAM_MESSAGE = encodeURIComponent(
  "Hello, I am interested in the Lifetime API Business package. I would like to discuss a custom USD package for my website and business needs."
);

const TELEGRAM_URL = `https://t.me/BDTYAUTOMATIONSupport?text=${TELEGRAM_MESSAGE}`;

const benefits = [
  "Lifetime API access validity",
  "A complete AI voice website built for you",
  "Professional API integration and setup",
  "Custom USD package based on your requirements",
  "Commercial use for your own brand and customers",
  "Launch assistance and direct support",
];

export function ApiBusinessPlanCard() {
  return (
    <Card className="relative overflow-hidden border-primary bg-primary/5 shadow-lg shadow-primary/10">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <CardContent className="p-6 sm:p-8 lg:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge>Active Plan</Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Infinity className="h-3.5 w-3.5" />
                Lifetime Validity
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Globe2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">BUILD. LAUNCH. GROW.</p>
                <h3 className="text-2xl font-bold sm:text-3xl">Lifetime API Business</h3>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Start your own AI voice platform and turn it into a real business. We will build your
              professional website, connect the API, and prepare everything you need to launch under
              your own brand.
            </p>

            <div className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-3xl font-bold sm:text-4xl">Custom USD Package</span>
              <span className="pb-1 text-sm text-muted-foreground">Tailored to your business needs</span>
            </div>
          </div>

          <div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <Button asChild size="lg" className="mt-7 w-full gap-2">
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                <Rocket className="h-4 w-4" />
                Buy Now on Telegram
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Message @BDTYAUTOMATIONSupport to discuss your custom package.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}