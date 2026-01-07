import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, CheckCircle2, Mic } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border/50 pb-16 pt-16 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
      {/* Optimized Background - using CSS gradients instead of heavy blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -right-1/4 -top-1/4 h-[50vw] max-h-[600px] w-[50vw] max-w-[600px] rounded-full bg-gradient-to-br from-primary/25 via-accent/15 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[50vw] max-h-[600px] w-[50vw] max-w-[600px] rounded-full bg-gradient-to-tr from-accent/20 via-primary/10 to-transparent blur-3xl" />
      </div>
      
      {/* Grid pattern - optimized */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:2rem_2rem] sm:bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_50%,transparent_100%)]" />

      <div className="container relative px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="animate-fade-in mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Powered by BD YT Automation</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="animate-slide-up text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="text-foreground">Transform Text Into</span>
            <span className="block mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"> Natural Speech</span>
          </h1>
          
          {/* Description */}
          <p className="animate-slide-up delay-100 mx-auto mt-6 sm:mt-8 max-w-2xl text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed px-4">
            Create lifelike voiceovers, podcasts, and audio content with our 
            state-of-the-art AI voice generation platform. <span className="font-semibold text-primary">100+ premium voices</span> in <span className="font-semibold text-accent">29 languages</span>.
          </p>
          
          {/* CTA Buttons */}
          <div className="animate-slide-up delay-200 mt-8 sm:mt-12 flex flex-col items-center justify-center gap-3 sm:gap-4 sm:flex-row px-4">
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="hero" size="lg" className="w-full sm:w-auto group shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 transition-all duration-300">
                Get Started Free
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="heroOutline" size="lg" className="w-full sm:w-auto group border-2 hover:bg-primary/5 transition-all duration-300">
                <Play className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110" />
                Explore Voices
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="animate-fade-in delay-300 mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground px-4">
            <div className="flex items-center gap-2 bg-success/10 rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-medium">100 free credits</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-medium">No credit card</span>
            </div>
            <div className="flex items-center gap-2 bg-accent/10 rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span className="font-medium">Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Demo Preview - simplified for performance */}
        <div className="animate-slide-up delay-400 mx-auto mt-12 sm:mt-16 lg:mt-20 max-w-4xl px-4">
          <div className="relative">
            <div className="absolute -inset-2 sm:-inset-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary/15 via-primary/5 to-primary/15 blur-xl opacity-60" />
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm shadow-2xl">
              <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border bg-muted/30 px-3 sm:px-4 py-2 sm:py-3">
                <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-destructive/70" />
                <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-warning/70" />
                <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-success/70" />
                <span className="ml-2 sm:ml-4 text-[10px] sm:text-xs text-muted-foreground">VoiceStudio — Text to Speech</span>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                    <Mic className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1 space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <div className="h-3 sm:h-4 w-full rounded-full bg-muted/50" />
                      <div className="h-3 sm:h-4 w-4/5 rounded-full bg-muted/50" />
                      <div className="h-3 sm:h-4 w-3/5 rounded-full bg-muted/50 hidden sm:block" />
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 pt-2">
                      <Button size="sm" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                        Generate
                      </Button>
                      <div className="flex-1">
                        <div className="flex h-8 sm:h-10 items-center gap-[2px] rounded-lg bg-muted/30 px-2 sm:px-3 overflow-hidden">
                          {Array.from({ length: 40 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-0.5 sm:w-1 rounded-full bg-primary/40"
                              style={{ height: `${20 + Math.sin(i * 0.4) * 30 + Math.random() * 15}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
