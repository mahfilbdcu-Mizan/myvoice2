import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Volume2, Play, Pause, ArrowRight } from "lucide-react";

interface Voice {
  id: string;
  name: string;
  accent: string | null;
  gender: string | null;
  age: string | null;
  category: string | null;
  preview_url: string | null;
}

interface VoiceShowcaseProps {
  voices: Voice[];
}

export function VoiceShowcase({ voices }: VoiceShowcaseProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

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

  if (voices.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm mb-4 sm:mb-6">
            <Volume2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            <span>Premium Voice Library</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
            Discover Our <span className="text-primary">AI Voices</span>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-muted-foreground">
            Explore our collection of natural-sounding AI voices. Click to preview any voice.
          </p>
        </div>

        {/* Voices Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {voices.map((voice, index) => (
            <div
              key={voice.id}
              className="group relative rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-5 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 0.03}s` }}
              onClick={() => handlePlayVoice(voice)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl transition-all ${
                    playingVoice === voice.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-primary/10 group-hover:bg-primary/15"
                  }`}>
                    {playingVoice === voice.id ? (
                      <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Play className="h-4 w-4 sm:h-5 sm:w-5 text-primary group-hover:scale-110 transition-transform" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">{voice.name}</h3>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                      {voice.gender && <span className="capitalize">{voice.gender}</span>}
                      {voice.age && <span>• {voice.age}</span>}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 sm:mt-4 flex flex-wrap gap-1 sm:gap-1.5">
                {voice.accent && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] sm:text-xs font-medium">
                    {voice.accent}
                  </span>
                )}
                {voice.category && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] sm:text-xs font-medium">
                    {voice.category}
                  </span>
                )}
              </div>

              {/* Playing indicator */}
              {playingVoice === voice.id && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 sm:h-1 rounded-b-xl sm:rounded-b-2xl bg-gradient-to-r from-primary to-primary/50 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-8 sm:mt-10 lg:mt-12 text-center">
          <Link to="/dashboard">
            <Button variant="outline" size="lg" className="group">
              View All 100+ Voices
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
