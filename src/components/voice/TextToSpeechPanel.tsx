import { useState, useRef } from "react";
import { 
  Play, 
  Download, 
  Pause, 
  Settings2, 
  ChevronDown,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface TextToSpeechPanelProps {
  selectedVoice?: { id: string; name: string } | null;
  onOpenVoiceLibrary?: () => void;
}

const providers = [
  { id: "elevenlabs", name: "Provider A" },
  { id: "minimax", name: "Provider B" },
];

const models = [
  { id: "multilingual_v2", name: "Multilingual v2" },
  { id: "turbo_v2", name: "Turbo v2.5" },
  { id: "english_v1", name: "English v1" },
];

export function TextToSpeechPanel({ 
  selectedVoice, 
  onOpenVoiceLibrary 
}: TextToSpeechPanelProps) {
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Voice settings
  const [provider, setProvider] = useState("elevenlabs");
  const [model, setModel] = useState("multilingual_v2");
  const [stability, setStability] = useState([0.5]);
  const [similarity, setSimilarity] = useState([0.75]);
  const [speed, setSpeed] = useState([1.0]);
  const [style, setStyle] = useState([0.5]);

  const audioRef = useRef<HTMLAudioElement>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleGenerate = async () => {
    if (!text.trim() || !selectedVoice) return;
    
    setIsGenerating(true);
    // Simulate API call - will be replaced with actual implementation
    setTimeout(() => {
      setIsGenerating(false);
      // Mock audio URL for now
      setAudioUrl("mock-audio-url");
    }, 2000);
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Text to Speech</h1>
          <p className="text-muted-foreground">Convert your text into natural speech</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-3">
        {/* Text Input Section */}
        <div className="flex flex-col lg:col-span-2">
          <div className="relative flex-1">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your text here. Type or paste any text you want to convert to speech..."
              className="h-full min-h-[300px] resize-none rounded-2xl border-border bg-card p-6 text-base leading-relaxed focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Play className="h-4 w-4 text-primary" />
              </div>
              {selectedVoice ? (
                <div>
                  <p className="font-medium">{selectedVoice.name}</p>
                  <p className="text-sm text-muted-foreground">Selected voice</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">No voice selected</p>
                  <p className="text-sm text-muted-foreground">Choose a voice from the library</p>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={onOpenVoiceLibrary}>
              {selectedVoice ? "Change Voice" : "Select Voice"}
            </Button>
          </div>

          {/* Generate Button */}
          <Button
            size="xl"
            variant="hero"
            className="mt-4"
            onClick={handleGenerate}
            disabled={!text.trim() || !selectedVoice || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Create Speech
              </>
            )}
          </Button>
        </div>

        {/* Settings & Output Panel */}
        <div className="space-y-4">
          {/* Voice Settings */}
          <Collapsible open={showSettings} onOpenChange={setShowSettings}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Voice Settings
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  showSettings && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-6 rounded-xl border border-border bg-card p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Stability</label>
                  <span className="text-sm text-muted-foreground">{stability[0].toFixed(2)}</span>
                </div>
                <Slider
                  value={stability}
                  onValueChange={setStability}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher stability means more consistent voice
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Similarity</label>
                  <span className="text-sm text-muted-foreground">{similarity[0].toFixed(2)}</span>
                </div>
                <Slider
                  value={similarity}
                  onValueChange={setSimilarity}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How closely to match the original voice
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Speed</label>
                  <span className="text-sm text-muted-foreground">{speed[0].toFixed(1)}x</span>
                </div>
                <Slider
                  value={speed}
                  onValueChange={setSpeed}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Style Exaggeration</label>
                  <span className="text-sm text-muted-foreground">{style[0].toFixed(2)}</span>
                </div>
                <Slider
                  value={style}
                  onValueChange={setStyle}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Amplify the style of the original speaker
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Audio Output */}
          {audioUrl && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-4 font-semibold">Generated Audio</h3>
              
              {/* Audio Player */}
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={togglePlayback}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="ml-0.5 h-5 w-5" />
                  )}
                </Button>
                
                {/* Waveform placeholder */}
                <div className="flex-1">
                  <div className="flex h-12 items-center gap-0.5">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-primary/30"
                        style={{
                          height: `${Math.random() * 100}%`,
                          minHeight: "4px",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="mt-4 w-full"
              >
                <Download className="h-4 w-4" />
                Download MP3
              </Button>

              <audio ref={audioRef} className="hidden" />
            </div>
          )}

          {/* Usage Info */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 font-semibold">Credit Usage</h3>
            <p className="text-sm text-muted-foreground">
              This generation will use <span className="font-semibold text-foreground">{wordCount}</span> credits
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              1 credit = 1 word
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
