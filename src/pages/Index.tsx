import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  Mic, 
  Zap, 
  Globe, 
  Languages, 
  FileAudio, 
  ArrowRight,
  Play,
  Sparkles,
  Shield,
  Clock
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Text to Speech",
    description: "Convert any text into natural, expressive speech with our advanced AI voices.",
  },
  {
    icon: Languages,
    title: "AI Dubbing",
    description: "Automatically translate and dub your content into 29+ languages.",
  },
  {
    icon: FileAudio,
    title: "Speech to Text",
    description: "Transcribe audio and video files with high accuracy and speaker detection.",
  },
  {
    icon: Globe,
    title: "29+ Languages",
    description: "Create content in multiple languages with native-sounding voices.",
  },
];

const stats = [
  { value: "1M+", label: "Audio Minutes Generated" },
  { value: "100+", label: "Premium Voices" },
  { value: "29", label: "Supported Languages" },
  { value: "99.9%", label: "Uptime SLA" },
];

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

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface-subtle to-background pb-20 pt-16">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
          </div>

          <div className="container relative">
            <div className="mx-auto max-w-4xl text-center">
              <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Powered by cutting-edge AI technology</span>
              </div>
              
              <h1 className="animate-slide-up text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Transform Text Into
                <span className="gradient-text"> Natural Speech</span>
              </h1>
              
              <p className="animate-slide-up delay-100 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Create lifelike voiceovers, podcasts, and audio content with our 
                state-of-the-art AI voice generation platform. 100+ voices in 29 languages.
              </p>
              
              <div className="animate-slide-up delay-200 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/login">
                  <Button variant="hero" size="xl">
                    Get Started Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/voices">
                  <Button variant="heroOutline" size="xl">
                    <Play className="h-5 w-5" />
                    Explore Voices
                  </Button>
                </Link>
              </div>

              <p className="animate-fade-in delay-300 mt-6 text-sm text-muted-foreground">
                Start with 100 free characters • No credit card required
              </p>
            </div>

            {/* Demo Preview */}
            <div className="animate-slide-up delay-400 mx-auto mt-16 max-w-4xl">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
                <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-destructive/50" />
                  <div className="h-3 w-3 rounded-full bg-warning/50" />
                  <div className="h-3 w-3 rounded-full bg-success/50" />
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Mic className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
                      <div className="mt-4 flex items-center gap-3">
                        <Button size="sm" variant="secondary">
                          <Play className="h-4 w-4" />
                          Preview
                        </Button>
                        <div className="flex-1">
                          <div className="flex h-8 items-center gap-0.5">
                            {Array.from({ length: 50 }).map((_, i) => (
                              <div
                                key={i}
                                className="w-1 rounded-full bg-primary/30"
                                style={{
                                  height: `${20 + Math.random() * 60}%`,
                                }}
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
        </section>

        {/* Stats Section */}
        <section className="border-b border-border bg-background py-12">
          <div className="container">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-primary sm:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything You Need for Audio Content
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful AI tools to create, translate, and transcribe audio at scale
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-elevated"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="border-y border-border bg-surface-subtle py-20">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Why Choose VoiceStudio?
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Join thousands of creators, businesses, and developers who trust our platform for their audio needs.
                </p>
                
                <div className="mt-10 space-y-8">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <benefit.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{benefit.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/20 to-primary/5 blur-3xl" />
                  <div className="relative rounded-3xl border border-border bg-card p-8 shadow-elevated">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
                        <Zap className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">100 Characters</p>
                        <p className="text-muted-foreground">Free to start</p>
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-success" />
                        <span>No credit card required</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-success" />
                        <span>Access to all voices</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-success" />
                        <span>Full API access</span>
                      </div>
                    </div>
                    <Link to="/login" className="mt-6 block">
                      <Button className="w-full" size="lg">
                        Start Creating
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to Transform Your Audio?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join thousands of creators and start generating professional audio content today.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/login">
                  <Button variant="hero" size="xl">
                    Get Started Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" size="xl">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
