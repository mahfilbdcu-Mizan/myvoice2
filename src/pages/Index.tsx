import { useState, useEffect, lazy, Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { supabase } from "@/integrations/supabase/client";

// Lazy load sections for better performance
const VoiceShowcase = lazy(() => import("@/components/home/VoiceShowcase").then(m => ({ default: m.VoiceShowcase })));
const FeaturesSection = lazy(() => import("@/components/home/FeaturesSection").then(m => ({ default: m.FeaturesSection })));
const UseCasesSection = lazy(() => import("@/components/home/UseCasesSection").then(m => ({ default: m.UseCasesSection })));
const TestimonialsSection = lazy(() => import("@/components/home/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const BenefitsSection = lazy(() => import("@/components/home/BenefitsSection").then(m => ({ default: m.BenefitsSection })));
const PricingSection = lazy(() => import("@/components/home/PricingSection").then(m => ({ default: m.PricingSection })));
const CTASection = lazy(() => import("@/components/home/CTASection").then(m => ({ default: m.CTASection })));

interface Voice {
  id: string;
  name: string;
  accent: string | null;
  gender: string | null;
  age: string | null;
  category: string | null;
  preview_url: string | null;
}

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

// Loading skeleton component
function SectionSkeleton() {
  return (
    <div className="py-16 sm:py-20">
      <div className="container px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <div className="h-8 w-48 bg-muted/50 rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-64 bg-muted/30 rounded-lg mx-auto animate-pulse" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-muted/20 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch voices and packages in parallel
      const [voicesResult, packagesResult] = await Promise.all([
        supabase.from("voices").select("*").eq("is_active", true).limit(8),
        supabase.from("packages").select("*").eq("is_active", true).order("sort_order")
      ]);
      
      if (voicesResult.data) setVoices(voicesResult.data);
      if (packagesResult.data) setPackages(packagesResult.data);
    };
    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Critical above-the-fold content - no lazy loading */}
        <HeroSection />
        <StatsSection />
        
        {/* Lazy loaded sections */}
        <Suspense fallback={<SectionSkeleton />}>
          <VoiceShowcase voices={voices} />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <FeaturesSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <UseCasesSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <TestimonialsSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <BenefitsSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <PricingSection packages={packages} />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <CTASection />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
