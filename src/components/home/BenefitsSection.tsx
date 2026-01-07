import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, Shield, Zap, CheckCircle2, ArrowRight } from "lucide-react";

const benefits = [
  {
    icon: Sparkles,
    title: "Studio Quality",
    description: "Generate professional-grade audio indistinguishable from human voice actors.",
  },
  {
    icon: Clock,
    title: "Instant Results",
    description: "Get your audio in seconds, not hours. No more waiting for recordings.",
  },
  {
    icon: Shield,
    title: "Enterprise Ready",
    description: "Secure, scalable infrastructure with dedicated support for enterprise clients.",
  },
];

export function BenefitsSection() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container px-4 sm:px-6">
        <div className="grid gap-10 sm:gap-12 lg:grid-cols-2 items-center">
          {/* Left - Text Content */}
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
              Why Choose <span className="text-primary">VoiceStudio</span>?
            </h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-muted-foreground">
              Join thousands of creators, businesses, and developers who trust our platform for their audio needs.
            </p>
            
            {/* Benefits List */}
            <div className="mt-8 sm:mt-10 space-y-5 sm:space-y-6 lg:space-y-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-3 sm:gap-4 group">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <benefit.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold">{benefit.title}</h3>
                    <p className="mt-1 text-sm sm:text-base text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - CTA Card */}
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm sm:max-w-md">
              <div className="absolute -inset-3 sm:-inset-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 blur-2xl" />
              <div className="relative rounded-2xl sm:rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
                    <Zap className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">100 Credits</p>
                    <p className="text-base sm:text-lg text-muted-foreground">Free to start</p>
                  </div>
                </div>
                
                {/* Feature List */}
                <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                  {[
                    "No credit card required",
                    "Access to all 100+ voices",
                    "Full API access",
                    "Priority support"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 sm:gap-3">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0" />
                      <span className="text-sm sm:text-base">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Link to="/login" className="mt-6 sm:mt-8 block">
                  <Button className="w-full gap-2" size="lg">
                    Start Creating Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
