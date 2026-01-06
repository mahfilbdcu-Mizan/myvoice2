import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  Pause,
  Volume2,
  Users,
  Headphones,
  Star,
  CheckCircle2,
  Wand2,
  MessageSquare,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  { value: "1M+", label: "Audio Minutes Generated", icon: Headphones },
  { value: "100+", label: "Premium Voices", icon: Mic },
  { value: "29", label: "Supported Languages", icon: Globe },
  { value: "99.9%", label: "Uptime SLA", icon: Shield },
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

const useCases = [
  {
    icon: MessageSquare,
    title: "Content Creators",
    description: "Create engaging voiceovers for YouTube, TikTok, podcasts, and more.",
  },
  {
    icon: Users,
    title: "E-Learning",
    description: "Generate narration for courses, tutorials, and educational content.",
  },
  {
    icon: Wand2,
    title: "Marketing",
    description: "Produce professional ads, explainer videos, and promotional content.",
  },
  {
    icon: Globe,
    title: "Localization",
    description: "Translate and dub content to reach global audiences in their language.",
  },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Content Creator",
    avatar: "SC",
    content: "VoiceStudio has completely transformed my workflow. I can create professional voiceovers in minutes!",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Marketing Director",
    avatar: "MJ",
    content: "The quality of AI voices is incredible. Our clients can't tell the difference from human recordings.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Course Instructor",
    avatar: "ER",
    content: "I've created over 50 hours of course content with VoiceStudio. It's a game-changer for educators.",
    rating: 5,
  },
];

export default function Index() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch voices
      const { data: voicesData } = await supabase
        .from("voices")
        .select("*")
        .eq("is_active", true)
        .limit(8);
      
      if (voicesData) {
        setVoices(voicesData);
      }

      // Fetch packages
      const { data: packagesData } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (packagesData) {
        setPackages(packagesData);
      }
    };
    fetchData();
  }, []);

  const handlePlayVoice = (voice: Voice) => {
    if (playingVoice === voice.id) {
      audio?.pause();
      setPlayingVoice(null);
      setAudio(null);
      return;
    }

    if (audio) {
      audio.pause();
    }

    if (voice.preview_url) {
      const newAudio = new Audio(voice.preview_url);
      newAudio.onended = () => {
        setPlayingVoice(null);
        setAudio(null);
      };
      newAudio.play();
      setAudio(newAudio);
      setPlayingVoice(voice.id);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border pb-24 pt-20">
          {/* Animated Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl animate-pulse" />
            <div className="absolute -bottom-1/4 -left-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
          </div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

          <div className="container relative">
            <div className="mx-auto max-w-5xl text-center">
              <div className="animate-fade-in mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-sm font-medium backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Powered by Next-Gen AI Technology</span>
              </div>
              
              <h1 className="animate-slide-up text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
                Transform Text Into
                <span className="block mt-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent"> Natural Speech</span>
              </h1>
              
              <p className="animate-slide-up delay-100 mx-auto mt-8 max-w-3xl text-xl text-muted-foreground leading-relaxed">
                Create lifelike voiceovers, podcasts, and audio content with our 
                state-of-the-art AI voice generation platform. <span className="text-foreground font-medium">100+ premium voices</span> in <span className="text-foreground font-medium">29 languages</span>.
              </p>
              
              <div className="animate-slide-up delay-200 mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/login">
                  <Button variant="hero" size="xl" className="group">
                    Get Started Free
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link to="/voices">
                  <Button variant="heroOutline" size="xl" className="group">
                    <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
                    Explore Voices
                  </Button>
                </Link>
              </div>

              <div className="animate-fade-in delay-300 mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>100 free credits</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Demo Preview */}
            <div className="animate-slide-up delay-400 mx-auto mt-20 max-w-5xl">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-2xl opacity-50" />
                <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
                    <div className="h-3 w-3 rounded-full bg-destructive/70" />
                    <div className="h-3 w-3 rounded-full bg-warning/70" />
                    <div className="h-3 w-3 rounded-full bg-success/70" />
                    <span className="ml-4 text-xs text-muted-foreground">VoiceStudio — Text to Speech</span>
                  </div>
                  <div className="p-8">
                    <div className="flex items-start gap-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                        <Mic className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <div className="h-4 w-full rounded-full bg-muted/50" />
                          <div className="h-4 w-4/5 rounded-full bg-muted/50" />
                          <div className="h-4 w-3/5 rounded-full bg-muted/50" />
                        </div>
                        <div className="flex items-center gap-4 pt-2">
                          <Button size="sm" className="gap-2">
                            <Play className="h-4 w-4" />
                            Generate
                          </Button>
                          <div className="flex-1">
                            <div className="flex h-10 items-center gap-[2px] rounded-lg bg-muted/30 px-3">
                              {Array.from({ length: 60 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="w-1 rounded-full bg-primary/40 transition-all"
                                  style={{
                                    height: `${15 + Math.sin(i * 0.3) * 35 + Math.random() * 20}%`,
                                    animationDelay: `${i * 0.02}s`
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
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-b border-border bg-muted/30 py-16">
          <div className="container">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat, index) => (
                <div key={index} className="group text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
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

        {/* Voice Showcase Section */}
        {voices.length > 0 && (
          <section className="py-24">
            <div className="container">
              <div className="mx-auto max-w-2xl text-center mb-16">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm mb-6">
                  <Volume2 className="h-4 w-4 text-primary" />
                  <span>Premium Voice Library</span>
                </div>
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Discover Our <span className="text-primary">AI Voices</span>
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Explore our collection of natural-sounding AI voices. Click to preview any voice.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {voices.map((voice, index) => (
                  <div
                    key={voice.id}
                    className="group relative rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                    onClick={() => handlePlayVoice(voice)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
                          playingVoice === voice.id 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-primary/10 group-hover:bg-primary/20"
                        }`}>
                          {playingVoice === voice.id ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{voice.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {voice.gender && <span className="capitalize">{voice.gender}</span>}
                            {voice.age && <span>• {voice.age}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {voice.accent && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                          {voice.accent}
                        </span>
                      )}
                      {voice.category && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                          {voice.category}
                        </span>
                      )}
                    </div>

                    {/* Playing indicator */}
                    {playingVoice === voice.id && (
                      <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r from-primary to-primary/50 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <Link to="/voices">
                  <Button variant="outline" size="lg" className="group">
                    View All 100+ Voices
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="border-y border-border bg-muted/20 py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Everything You Need for <span className="text-primary">Audio Content</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful AI tools to create, translate, and transcribe audio at scale
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 transition-all group-hover:from-primary/30 group-hover:to-primary/20">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Built for <span className="text-primary">Every Use Case</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From content creators to enterprises, VoiceStudio powers audio at any scale
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {useCases.map((useCase, index) => (
                <div key={index} className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
                    <useCase.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{useCase.title}</h3>
                  <p className="mt-2 text-muted-foreground">
                    {useCase.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="border-y border-border bg-muted/20 py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Loved by <span className="text-primary">Creators</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join thousands of creators who trust VoiceStudio for their audio needs
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Why Choose <span className="text-primary">VoiceStudio</span>?
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Join thousands of creators, businesses, and developers who trust our platform for their audio needs.
                </p>
                
                <div className="mt-10 space-y-8">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-4 group">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                        <benefit.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{benefit.title}</h3>
                        <p className="mt-1 text-muted-foreground">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10 blur-3xl" />
                  <div className="relative rounded-3xl border border-border bg-card p-8 shadow-2xl">
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30">
                        <Zap className="h-10 w-10 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold">100 Credits</p>
                        <p className="text-lg text-muted-foreground">Free to start</p>
                      </div>
                    </div>
                    <div className="mt-8 space-y-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span>No credit card required</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span>Access to all 100+ voices</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span>Full API access</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span>Priority support</span>
                      </div>
                    </div>
                    <Link to="/login" className="mt-8 block">
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

        {/* Pricing Section */}
        {packages.length > 0 && (
          <section className="border-t border-border py-24">
            <div className="container">
              <div className="mx-auto max-w-2xl text-center mb-16">
                <Badge variant="secondary" className="mb-4">
                  Simple Pricing
                </Badge>
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Choose Your <span className="text-primary">Plan</span>
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  No subscriptions, no hidden fees. Buy credits and use them anytime.
                </p>
              </div>

              <div className={`mx-auto grid max-w-6xl gap-6 ${
                packages.length === 3 ? 'md:grid-cols-3' : 
                packages.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
                packages.length >= 5 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3'
              }`}>
                {packages.map((pkg) => (
                  <Card 
                    key={pkg.id} 
                    className={`relative transition-all hover:shadow-lg ${pkg.is_popular ? "border-primary shadow-elevated" : ""}`}
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
                      <div className="space-y-3">
                        {pkg.features?.slice(0, 4).map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-success shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
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

              <div className="mt-12 text-center">
                <Link to="/pricing">
                  <Button variant="outline" size="lg" className="group">
                    View All Pricing Details
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Final CTA Section */}
        <section className="relative overflow-hidden border-t border-border py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="container relative">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Ready to Transform Your <span className="text-primary">Audio</span>?
              </h2>
              <p className="mt-6 text-xl text-muted-foreground">
                Join thousands of creators and start generating professional audio content today.
                Get started with 100 free credits.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/login">
                  <Button variant="hero" size="xl" className="group">
                    Get Started Free
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
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
