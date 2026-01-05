import { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Download, 
  Pause, 
  Settings2, 
  ChevronDown,
  Loader2,
  Upload,
  Mic,
  Music
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { generateSpeech, waitForTask, fetchModelsFromAPI, type VoiceModel } from "@/lib/voice-api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface TextToSpeechPanelProps {
  selectedVoice?: { id: string; name: string } | null;
  onOpenVoiceLibrary?: () => void;
}

type Provider = "elevenlabs" | "minimax";

const defaultModels = [
  { id: "eleven_multilingual_v2", name: "Multilingual v2" },
  { id: "eleven_turbo_v2_5", name: "Turbo v2.5" },
  { id: "eleven_monolingual_v1", name: "English v1" },
];

const minimaxModels = [
  { id: "speech-2.6-hd", name: "Speech 2.6 HD" },
  { id: "speech-2.5-hd", name: "Speech 2.5 HD" },
  { id: "speech-2.5-turbo", name: "Speech 2.5 Turbo (0.6x credits)" },
];

const languageOptions = [
  { id: "Auto", name: "Auto Detect" },
  { id: "English", name: "English" },
  { id: "Chinese", name: "Chinese" },
  { id: "Japanese", name: "Japanese" },
  { id: "Korean", name: "Korean" },
  { id: "Spanish", name: "Spanish" },
  { id: "French", name: "French" },
  { id: "German", name: "German" },
  { id: "Arabic", name: "Arabic" },
  { id: "Portuguese", name: "Portuguese" },
  { id: "Russian", name: "Russian" },
];

export function TextToSpeechPanel({ 
  selectedVoice, 
  onOpenVoiceLibrary 
}: TextToSpeechPanelProps) {
  const { profile, refreshProfile } = useAuth();
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>(defaultModels);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("elevenlabs");
  
  // ElevenLabs settings
  const [model, setModel] = useState("eleven_multilingual_v2");
  const [stability, setStability] = useState([0.5]);
  const [similarity, setSimilarity] = useState([0.75]);
  const [style, setStyle] = useState([0.5]);

  // Minimax settings
  const [minimaxModel, setMinimaxModel] = useState("speech-2.6-hd");
  const [minimaxVoiceId, setMinimaxVoiceId] = useState("209533299589184");
  const [volume, setVolume] = useState([1]);
  const [pitch, setPitch] = useState([0]);
  const [speed, setSpeed] = useState([1]);
  const [languageBoost, setLanguageBoost] = useState("Auto");
  const [minimaxVoices, setMinimaxVoices] = useState<Array<{ voice_id: string; voice_name: string; tag_list: string[] }>>([]);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  // Fetch models on mount
  useEffect(() => {
    async function loadModels() {
      const apiModels = await fetchModelsFromAPI();
      if (apiModels.length > 0) {
        setModels(apiModels.map(m => ({ id: m.model_id, name: m.name })));
      }
    }
    loadModels();
  }, []);

  // Fetch Minimax voices
  useEffect(() => {
    async function loadMinimaxVoices() {
      try {
        const { data, error } = await supabase.functions.invoke('minimax-voices', {
          body: { page: 1, pageSize: 100 }
        });
        if (!error && data?.data?.voice_list) {
          setMinimaxVoices(data.data.voice_list);
        }
      } catch (e) {
        console.error("Failed to load Minimax voices:", e);
      }
    }
    loadMinimaxVoices();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener("ended", handleEnded);
      return () => audio.removeEventListener("ended", handleEnded);
    }
  }, [audioUrl]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'txt' || extension === 'srt') {
      const content = await file.text();
      
      if (extension === 'srt') {
        const lines = content.split('\n');
        const textLines: string[] = [];
        let isTextLine = false;
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            isTextLine = false;
            continue;
          }
          if (/^\d+$/.test(trimmed)) {
            isTextLine = true;
            continue;
          }
          if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) {
            continue;
          }
          if (isTextLine || textLines.length > 0) {
            textLines.push(trimmed);
          }
        }
        setText(textLines.join('\n'));
      } else {
        setText(content);
      }
      
      toast({
        title: "File loaded",
        description: `Loaded ${file.name}`,
      });
    } else {
      toast({
        title: "Unsupported format",
        description: "Please upload .txt or .srt files",
        variant: "destructive",
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    if (provider === "elevenlabs" && !selectedVoice) {
      toast({
        title: "No voice selected",
        description: "Please select a voice from the library",
        variant: "destructive",
      });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    
    setIsGenerating(true);
    setAudioUrl(null);
    setTaskStatus("Starting generation...");
    
    try {
      if (provider === "elevenlabs") {
        const result = await generateSpeech({
          text: text.trim(),
          voiceId: selectedVoice!.id,
          voiceName: selectedVoice!.name,
          model,
          stability: stability[0],
          similarity: similarity[0],
          style: style[0],
          userId: userData?.user?.id,
        });

        if (result.error) {
          toast({
            title: "Generation failed",
            description: result.error,
            variant: "destructive",
          });
          setTaskStatus(null);
        } else if (result.audioUrl) {
          setAudioUrl(result.audioUrl);
          setTaskStatus(null);
          toast({
            title: "Speech generated!",
            description: "Your audio is ready to play and download.",
          });
          refreshProfile();
          } else if (result.taskId) {
            setTaskStatus("Processing...");
            const task = await waitForTask(result.taskId);
            
            if (task?.status === "done" && task.metadata?.audio_url) {
              const audioUrlValue = Array.isArray(task.metadata.audio_url) ? task.metadata.audio_url[0] : task.metadata.audio_url;
              setAudioUrl(audioUrlValue);
              setTaskStatus(null);
              toast({
                title: "Speech generated!",
                description: "Your audio is ready to play and download.",
              });
              refreshProfile();
            } else if (task?.status === "failed") {
            toast({
              title: "Generation failed",
              description: task.error_message || "Task failed",
              variant: "destructive",
            });
            setTaskStatus(null);
          } else {
            toast({
              title: "Generation timeout",
              description: "Task is taking too long. Check history for results.",
              variant: "destructive",
            });
            setTaskStatus(null);
          }
        }
      } else {
        // Minimax TTS
        const { data, error } = await supabase.functions.invoke('minimax-tts', {
          body: {
            text: text.trim(),
            model: minimaxModel,
            voiceId: minimaxVoiceId,
            vol: volume[0],
            pitch: pitch[0],
            speed: speed[0],
            languageBoost,
          }
        });

        if (error) {
          throw error;
        }

        if (data?.task_id) {
          setTaskStatus("Processing...");
          const task = await waitForTask(data.task_id);
          
          if (task?.status === "done" && task.metadata?.audio_url) {
            const audioUrlValue = Array.isArray(task.metadata.audio_url) ? task.metadata.audio_url[0] : task.metadata.audio_url;
            setAudioUrl(audioUrlValue);
            setTaskStatus(null);
            toast({
              title: "Speech generated!",
              description: "Your audio is ready to play and download.",
            });
            refreshProfile();
          } else if (task?.status === "failed") {
            toast({
              title: "Generation failed",
              description: task.error_message || "Task failed",
              variant: "destructive",
            });
            setTaskStatus(null);
          }
        } else if (data?.error) {
          toast({
            title: "Generation failed",
            description: data.error,
            variant: "destructive",
          });
          setTaskStatus(null);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate speech",
        variant: "destructive",
      });
      setTaskStatus(null);
    } finally {
      setIsGenerating(false);
    }
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

  const handleDownload = async (format: 'mp3' | 'txt' | 'srt') => {
    if (!audioUrl && format === 'mp3') return;

    if (format === 'mp3') {
      const a = document.createElement("a");
      a.href = audioUrl!;
      a.download = `speech-${Date.now()}.mp3`;
      a.click();
    } else if (format === 'txt') {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `text-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'srt') {
      const lines = text.split('\n').filter(l => l.trim());
      let srtContent = '';
      let time = 0;
      
      lines.forEach((line, index) => {
        const duration = Math.ceil(line.length / 15);
        const startTime = formatSrtTime(time);
        const endTime = formatSrtTime(time + duration);
        srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${line}\n\n`;
        time += duration;
      });
      
      const blob = new Blob([srtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subtitle-${Date.now()}.srt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatSrtTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
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
          {/* Provider Selection */}
          <Tabs value={provider} onValueChange={(v) => setProvider(v as Provider)}>
            <TabsList>
              <TabsTrigger value="elevenlabs">ElevenLabs</TabsTrigger>
              <TabsTrigger value="minimax">Minimax</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Model Selection */}
          {provider === "elevenlabs" ? (
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[180px]">
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
          ) : (
            <Select value={minimaxModel} onValueChange={setMinimaxModel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minimaxModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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

          {/* File Upload */}
          <div className="mt-4 flex items-center gap-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".txt,.srt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload File
            </Button>
            <span className="text-sm text-muted-foreground">
              Supports .txt, .srt formats
            </span>
          </div>

          {/* Voice Selection */}
          {provider === "elevenlabs" ? (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Mic className="h-4 w-4 text-primary" />
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
          ) : (
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <label className="mb-2 block text-sm font-medium">Minimax Voice</label>
              <Select value={minimaxVoiceId} onValueChange={setMinimaxVoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {minimaxVoices.map((v) => (
                    <SelectItem key={v.voice_id} value={v.voice_id}>
                      {v.voice_name} ({v.tag_list?.slice(0, 2).join(", ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Generate Button */}
          <Button
            size="lg"
            className="mt-4 h-14 text-lg"
            onClick={handleGenerate}
            disabled={!text.trim() || (provider === "elevenlabs" && !selectedVoice) || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {taskStatus || "Generating..."}
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
              {provider === "elevenlabs" ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Language Boost</label>
                    <Select value={languageBoost} onValueChange={setLanguageBoost}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Volume</label>
                      <span className="text-sm text-muted-foreground">{volume[0].toFixed(2)}</span>
                    </div>
                    <Slider
                      value={volume}
                      onValueChange={setVolume}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Pitch</label>
                      <span className="text-sm text-muted-foreground">{pitch[0]}</span>
                    </div>
                    <Slider
                      value={pitch}
                      onValueChange={setPitch}
                      min={-12}
                      max={12}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Speed</label>
                      <span className="text-sm text-muted-foreground">{speed[0].toFixed(2)}</span>
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
                </>
              )}
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
                        className={cn(
                          "w-1 rounded-full transition-all",
                          isPlaying ? "bg-primary animate-pulse" : "bg-primary/30"
                        )}
                        style={{
                          height: `${Math.random() * 100}%`,
                          minHeight: "4px",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Hidden audio element */}
              <audio ref={audioRef} src={audioUrl} />

              {/* Download Options */}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleDownload('mp3')}
                >
                  <Download className="h-4 w-4" />
                  MP3
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleDownload('txt')}
                >
                  <Download className="h-4 w-4" />
                  TXT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleDownload('srt')}
                >
                  <Download className="h-4 w-4" />
                  SRT
                </Button>
              </div>
            </div>
          )}

          {/* Credits Info */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 font-semibold">Your Credits</h3>
            <p className="text-2xl font-bold text-primary">{profile?.credits || 0}</p>
            <p className="text-sm text-muted-foreground">words remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
}
