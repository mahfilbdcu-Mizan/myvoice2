import { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Download, 
  Pause, 
  Settings2, 
  ChevronDown,
  Loader2,
  Upload,
  FileText,
  RotateCcw,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { generateMinimaxSpeech, fetchMinimaxVoices, type MinimaxVoice, type VoiceClone } from "@/lib/minimax-api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTTSSettings } from "@/hooks/useTTSSettings";
import { MinimaxVoiceLibrary } from "./MinimaxVoiceLibrary";

interface TextToSpeechPanelProps {
  selectedVoice?: { id: string; name: string; provider?: string } | null;
  onOpenVoiceLibrary?: () => void;
}

type TTSProvider = "elevenlabs" | "minimax";

const defaultElevenLabsModels = [
  { id: "eleven_multilingual_v2", name: "Multilingual v2" },
  { id: "eleven_turbo_v2_5", name: "Turbo v2.5" },
  { id: "eleven_monolingual_v1", name: "English v1" },
];

const minimaxModels = [
  { id: "speech-2.6-hd", name: "Speech 2.6 HD" },
  { id: "speech-2.5-hd", name: "Speech 2.5 HD" },
  { id: "speech-2.0-turbo", name: "Speech 2.0 Turbo (0.6x credits)" },
];

const languages = [
  { id: "auto", name: "Auto detect", recommended: true },
  { id: "en", name: "English" },
  { id: "es", name: "Spanish" },
  { id: "fr", name: "French" },
  { id: "de", name: "German" },
  { id: "it", name: "Italian" },
  { id: "pt", name: "Portuguese" },
  { id: "zh", name: "Chinese" },
  { id: "ja", name: "Japanese" },
  { id: "ko", name: "Korean" },
  { id: "ar", name: "Arabic" },
  { id: "hi", name: "Hindi" },
  { id: "ru", name: "Russian" },
];

const minimaxLanguages = [
  "Auto", "English", "Chinese", "Spanish", "French", "German",
  "Italian", "Portuguese", "Russian", "Japanese", "Korean", "Arabic", "Hindi"
];

export function TextToSpeechPanel({ 
  selectedVoice, 
  onOpenVoiceLibrary 
}: TextToSpeechPanelProps) {
  const { user, profile, refreshProfile } = useAuth();
  
  // Use TTS settings hook for persistence
  const ttsSettings = useTTSSettings(user?.id);
  
  const [provider, setProvider] = useState<TTSProvider>("elevenlabs");
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>(defaultElevenLabsModels);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  
  // User API key balance
  const [userApiBalance, setUserApiBalance] = useState<number | null>(null);
  const [hasUserApiKey, setHasUserApiKey] = useState(false);
  
  // ElevenLabs Voice settings
  const [model, setModel] = useState("eleven_multilingual_v2");
  const [language, setLanguage] = useState("auto");
  const [speed, setSpeed] = useState([1.0]);
  const [stability, setStability] = useState([0.5]);
  const [similarity, setSimilarity] = useState([0.75]);
  const [style, setStyle] = useState([0]);
  const [speakerBoost, setSpeakerBoost] = useState(false);

  // Minimax Voice settings
  const [minimaxModel, setMinimaxModel] = useState("speech-2.6-hd");
  const [minimaxLanguage, setMinimaxLanguage] = useState("Auto");
  const [minimaxVol, setMinimaxVol] = useState([1.0]);
  const [minimaxPitch, setMinimaxPitch] = useState([0]);
  const [minimaxSpeed, setMinimaxSpeed] = useState([1.0]);

  // Minimax voices
  const [minimaxVoices, setMinimaxVoices] = useState<MinimaxVoice[]>([]);
  const [selectedMinimaxVoice, setSelectedMinimaxVoice] = useState<MinimaxVoice | VoiceClone | null>(null);
  const [loadingMinimaxVoices, setLoadingMinimaxVoices] = useState(false);
  const [showMinimaxVoiceLibrary, setShowMinimaxVoiceLibrary] = useState(false);
  
  // Track if we've loaded saved voice
  const [savedVoiceLoaded, setSavedVoiceLoaded] = useState(false);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  // Load saved settings when ready
  useEffect(() => {
    if (ttsSettings.isLoaded && !savedVoiceLoaded) {
      const s = ttsSettings.settings;
      setProvider(s.provider);
      setText(s.text);
      setModel(s.elevenLabsModel);
      setLanguage(s.language);
      setSpeed([s.speed]);
      setStability([s.stability]);
      setSimilarity([s.similarity]);
      setStyle([s.style]);
      setSpeakerBoost(s.speakerBoost);
      setMinimaxModel(s.minimaxModel);
      setMinimaxLanguage(s.minimaxLanguage);
      setMinimaxVol([s.minimaxVol]);
      setMinimaxPitch([s.minimaxPitch]);
      setMinimaxSpeed([s.minimaxSpeed]);
      if (s.minimaxVoice) {
        setSelectedMinimaxVoice(s.minimaxVoice as MinimaxVoice);
      }
      setSavedVoiceLoaded(true);
    }
  }, [ttsSettings.isLoaded, savedVoiceLoaded]);

  // Save settings when they change
  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateProvider(provider);
  }, [provider, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateText(text);
  }, [text, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateElevenLabsModel(model);
  }, [model, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateLanguage(language);
  }, [language, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateSpeed(speed[0]);
  }, [speed, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateStability(stability[0]);
  }, [stability, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateSimilarity(similarity[0]);
  }, [similarity, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateStyle(style[0]);
  }, [style, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateSpeakerBoost(speakerBoost);
  }, [speakerBoost, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateMinimaxModel(minimaxModel);
  }, [minimaxModel, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateMinimaxLanguage(minimaxLanguage);
  }, [minimaxLanguage, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateMinimaxVol(minimaxVol[0]);
  }, [minimaxVol, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateMinimaxPitch(minimaxPitch[0]);
  }, [minimaxPitch, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded) return;
    ttsSettings.updateMinimaxSpeed(minimaxSpeed[0]);
  }, [minimaxSpeed, ttsSettings.isLoaded, savedVoiceLoaded]);

  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded || !selectedMinimaxVoice) return;
    ttsSettings.updateMinimaxVoice({
      voice_id: selectedMinimaxVoice.voice_id,
      voice_name: selectedMinimaxVoice.voice_name,
    });
  }, [selectedMinimaxVoice, ttsSettings.isLoaded, savedVoiceLoaded]);

  // Save ElevenLabs voice when it changes from parent
  useEffect(() => {
    if (!ttsSettings.isLoaded || !savedVoiceLoaded || !selectedVoice) return;
    ttsSettings.updateElevenLabsVoice(selectedVoice);
  }, [selectedVoice, ttsSettings.isLoaded, savedVoiceLoaded]);

  // Fetch ElevenLabs models on mount
  useEffect(() => {
    async function loadModels() {
      const apiModels = await fetchModelsFromAPI();
      if (apiModels.length > 0) {
        setModels(apiModels.map(m => ({ id: m.model_id, name: m.name })));
      }
    }
    loadModels();
  }, []);

  // Fetch Minimax voices when switching to Minimax
  useEffect(() => {
    if (provider === "minimax" && minimaxVoices.length === 0) {
      loadMinimaxVoices();
    }
  }, [provider]);

  const loadMinimaxVoices = async () => {
    setLoadingMinimaxVoices(true);
    const result = await fetchMinimaxVoices({ page: 1, page_size: 50 });
    setMinimaxVoices(result.voices);
    if (result.voices.length > 0 && !selectedMinimaxVoice) {
      setSelectedMinimaxVoice(result.voices[0]);
    }
    setLoadingMinimaxVoices(false);
  };

  // Fetch user API key balance
  useEffect(() => {
    async function fetchUserApiKeyBalance() {
      if (!user) return;
      
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        const { data: apiKeyData } = await supabase
          .from("user_api_keys")
          .select("*")
          .eq("user_id", user.id)
          .eq("provider", "ai33")
          .maybeSingle();
        
        // Only show balance if key exists AND is valid
        if (apiKeyData && apiKeyData.is_valid === true) {
          setHasUserApiKey(true);
          setUserApiBalance(apiKeyData.remaining_credits);
          
          // Only check balance if the key is valid
          if (apiKeyData.encrypted_key) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const token = session?.access_token;
              
              if (token) {
                const response = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-api-balance`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ provider: "ai33" }),
                  }
                );
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.valid && data.credits !== null) {
                    setUserApiBalance(data.credits);
                  }
                }
              }
            } catch (balanceError) {
              console.log("Balance check skipped:", balanceError);
            }
          }
        } else {
          setHasUserApiKey(false);
          setUserApiBalance(null);
        }
      } catch (error) {
        console.error("Error fetching API key balance:", error);
      }
    }
    
    fetchUserApiKeyBalance();
  }, [user]);

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
    if (!text.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter some text",
        variant: "destructive",
      });
      return;
    }

    // Check voice selection based on provider
    if (provider === "elevenlabs" && !selectedVoice) {
      toast({
        title: "Missing information",
        description: "Please select a voice from the library",
        variant: "destructive",
      });
      return;
    }

    if (provider === "minimax" && !selectedMinimaxVoice) {
      toast({
        title: "Missing information",
        description: "Please select a Minimax voice",
        variant: "destructive",
      });
      return;
    }
    
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: userData } = await supabase.auth.getUser();
    
    setIsGenerating(true);
    setAudioUrl(null);
    setTaskStatus("Starting generation...");
    
    try {
      if (provider === "elevenlabs") {
        // ElevenLabs generation
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
          setGenerationProgress(0);
          
          const task = await waitForTask(result.taskId, userData?.user?.id, 60, 2000, (progress, status) => {
            setGenerationProgress(progress);
            setTaskStatus(`Processing ${progress}%`);
          });
          
          if (task?.status === "done" && task.metadata?.audio_url) {
            setAudioUrl(task.metadata.audio_url);
            setTaskStatus(null);
            setGenerationProgress(0);
            toast({
              title: "Speech generated!",
              description: "Your audio is ready to play and download.",
            });
            refreshProfile();
          } else if (task?.status === "error" || task?.status === "failed") {
            toast({
              title: "Generation failed",
              description: task.error_message || "Task failed",
              variant: "destructive",
            });
            setTaskStatus(null);
            setGenerationProgress(0);
          } else {
            toast({
              title: "Generation timeout",
              description: "Task is taking too long. Please try again.",
              variant: "destructive",
            });
            setTaskStatus(null);
            setGenerationProgress(0);
          }
        }
      } else {
        // Minimax generation
        const result = await generateMinimaxSpeech({
          text: text.trim(),
          voiceId: selectedMinimaxVoice!.voice_id,
          voiceName: selectedMinimaxVoice!.voice_name,
          model: minimaxModel,
          vol: minimaxVol[0],
          pitch: minimaxPitch[0],
          speed: minimaxSpeed[0],
          language_boost: minimaxLanguage,
        });

        if (result.error) {
          toast({
            title: "Generation failed",
            description: result.error,
            variant: "destructive",
          });
          setTaskStatus(null);
          setGenerationProgress(0);
        } else if (result.taskId) {
          setTaskStatus("Processing...");
          setGenerationProgress(0);
          
          const task = await waitForTask(result.taskId, userData?.user?.id, 60, 2000, (progress, status) => {
            setGenerationProgress(progress);
            setTaskStatus(`Processing ${progress}%`);
          });
          
          if (task?.status === "done" && task.metadata?.audio_url) {
            setAudioUrl(task.metadata.audio_url);
            setTaskStatus(null);
            toast({
              title: "Speech generated!",
              description: "Your audio is ready to play and download.",
            });
            refreshProfile();
          } else if (task?.status === "error" || task?.status === "failed") {
            toast({
              title: "Generation failed",
              description: task.error_message || "Task failed",
              variant: "destructive",
            });
            setTaskStatus(null);
            setGenerationProgress(0);
          } else {
            toast({
              title: "Generation timeout",
              description: "Task is taking too long. Please try again.",
              variant: "destructive",
            });
            setTaskStatus(null);
            setGenerationProgress(0);
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
      setTaskStatus(null);
      setGenerationProgress(0);
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
    if (!audioUrl) return;

    if (format === 'mp3') {
      try {
        if (audioUrl.startsWith('blob:')) {
          const a = document.createElement("a");
          a.href = audioUrl;
          a.download = `speech-${Date.now()}.mp3`;
          a.click();
        } else {
          toast({
            title: "Downloading...",
            description: "Please wait while we prepare your file.",
          });
          
          const response = await fetch(audioUrl);
          if (!response.ok) {
            throw new Error('Failed to download audio');
          }
          
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = `speech-${Date.now()}.mp3`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          
          toast({
            title: "Downloaded!",
            description: "Your audio file has been downloaded.",
          });
        }
      } catch (error) {
        console.error("Download error:", error);
        window.open(audioUrl, '_blank');
        toast({
          title: "Download issue",
          description: "Opening audio in new tab. Right-click to save.",
        });
      }
    } else if (format === 'txt') {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `text-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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

  const currentVoice = provider === "elevenlabs" 
    ? selectedVoice 
    : selectedMinimaxVoice 
      ? { id: selectedMinimaxVoice.voice_id, name: selectedMinimaxVoice.voice_name }
      : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header with Provider Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Text to Speech</h1>
            <p className="text-muted-foreground">Convert your text into natural speech</p>
          </div>
        </div>
        
        <Tabs value={provider} onValueChange={(v) => setProvider(v as TTSProvider)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="elevenlabs" className="gap-2">
              <span className="hidden sm:inline">ElevenLabs</span>
              <span className="sm:hidden">EL</span>
            </TabsTrigger>
            <TabsTrigger value="minimax" className="gap-2">
              <span className="hidden sm:inline">Minimax</span>
              <span className="sm:hidden">MM</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              {/* Play Preview Button */}
              {provider === "minimax" && selectedMinimaxVoice?.sample_audio ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    const audio = new Audio(selectedMinimaxVoice.sample_audio);
                    audio.play().catch(err => console.error("Preview play error:", err));
                  }}
                >
                  <Play className="h-4 w-4 text-primary" />
                </Button>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Play className="h-4 w-4 text-primary" />
                </div>
              )}
              {provider === "elevenlabs" ? (
                selectedVoice ? (
                  <div>
                    <p className="font-medium">{selectedVoice.name}</p>
                    <p className="text-sm text-muted-foreground">ElevenLabs voice</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">No voice selected</p>
                    <p className="text-sm text-muted-foreground">Choose from the library</p>
                  </div>
                )
              ) : (
                selectedMinimaxVoice ? (
                  <div className="flex items-center gap-2">
                    {selectedMinimaxVoice.cover_url && (
                      <img 
                        src={selectedMinimaxVoice.cover_url} 
                        alt="" 
                        className="h-8 w-8 rounded-full object-cover border border-border"
                      />
                    )}
                    <div>
                      <p className="font-medium">{selectedMinimaxVoice.voice_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Minimax voice • {selectedMinimaxVoice.tag_list?.slice(0, 2).join(", ")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">No voice selected</p>
                    <p className="text-sm text-muted-foreground">Choose from the library</p>
                  </div>
                )
              )}
            </div>
            
            {provider === "elevenlabs" ? (
              <Button variant="outline" onClick={onOpenVoiceLibrary}>
                {selectedVoice ? "Change Voice" : "Select Voice"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShowMinimaxVoiceLibrary(true)}>
                {selectedMinimaxVoice ? "Change Voice" : "Select Voice"}
              </Button>
            )}
          </div>

          {/* Minimax Voice Library Modal */}
          {showMinimaxVoiceLibrary && (
            <MinimaxVoiceLibrary
              isModal
              selectedVoice={selectedMinimaxVoice}
              onSelectVoice={(voice) => {
                setSelectedMinimaxVoice(voice);
                setShowMinimaxVoiceLibrary(false);
              }}
              onClose={() => setShowMinimaxVoiceLibrary(false)}
            />
          )}

          {/* Generate Button with Progress */}
          <div className="mt-4 space-y-2">
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              onClick={handleGenerate}
              disabled={!text.trim() || !currentVoice || isGenerating}
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
            
            {/* Progress Bar */}
            {isGenerating && generationProgress > 0 && (
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {generationProgress}% complete
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Settings & Output Panel */}
        <div className="space-y-4">
          {/* Model Selection */}
          <div className="rounded-xl border border-border bg-card p-4">
            <Label className="text-sm font-medium">Model</Label>
            <Select 
              value={provider === "elevenlabs" ? model : minimaxModel} 
              onValueChange={provider === "elevenlabs" ? setModel : setMinimaxModel}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(provider === "elevenlabs" ? models : minimaxModels).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <CollapsibleContent className="mt-4 space-y-5 rounded-xl border border-border bg-card p-4">
              {provider === "elevenlabs" ? (
                <>
                  {/* ElevenLabs Settings */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language</label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.id} value={lang.id}>
                            {lang.name} {lang.recommended && <span className="text-muted-foreground text-xs ml-2">Recommended</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Speed: {speed[0].toFixed(2)}</label>
                    </div>
                    <Slider
                      value={speed}
                      onValueChange={setSpeed}
                      min={0.7}
                      max={1.2}
                      step={0.01}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stability: {Math.round(stability[0] * 100)}%</label>
                    <Slider
                      value={stability}
                      onValueChange={setStability}
                      max={1}
                      step={0.01}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Similarity: {Math.round(similarity[0] * 100)}%</label>
                    <Slider
                      value={similarity}
                      onValueChange={setSimilarity}
                      max={1}
                      step={0.01}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Style: {Math.round(style[0] * 100)}%</label>
                    <Slider
                      value={style}
                      onValueChange={setStyle}
                      max={1}
                      step={0.01}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-border">
                    <Label htmlFor="speaker-boost" className="text-sm font-medium cursor-pointer">
                      Speaker Boost
                    </Label>
                    <Switch
                      id="speaker-boost"
                      checked={speakerBoost}
                      onCheckedChange={setSpeakerBoost}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      setLanguage("auto");
                      setSpeed([1.0]);
                      setStability([0.5]);
                      setSimilarity([0.75]);
                      setStyle([0]);
                      setSpeakerBoost(false);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset values
                  </Button>
                </>
              ) : (
                <>
                  {/* Minimax Settings */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language Boost</label>
                    <Select value={minimaxLanguage} onValueChange={setMinimaxLanguage}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {minimaxLanguages.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Volume: {minimaxVol[0].toFixed(1)}</label>
                    <Slider
                      value={minimaxVol}
                      onValueChange={setMinimaxVol}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pitch: {minimaxPitch[0]}</label>
                    <Slider
                      value={minimaxPitch}
                      onValueChange={setMinimaxPitch}
                      min={-12}
                      max={12}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Speed: {minimaxSpeed[0].toFixed(2)}</label>
                    <Slider
                      value={minimaxSpeed}
                      onValueChange={setMinimaxSpeed}
                      min={0.5}
                      max={2.0}
                      step={0.01}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      setMinimaxLanguage("Auto");
                      setMinimaxVol([1.0]);
                      setMinimaxPitch([0]);
                      setMinimaxSpeed([1.0]);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset values
                  </Button>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Audio Output */}
          {audioUrl && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-4 font-semibold">Generated Audio</h3>
              
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

              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDownload('mp3')}
                >
                  <Download className="h-4 w-4" />
                  Download MP3
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload('txt')}
                  >
                    <FileText className="h-4 w-4" />
                    .TXT
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload('srt')}
                  >
                    <FileText className="h-4 w-4" />
                    .SRT
                  </Button>
                </div>
              </div>

              <audio ref={audioRef} src={audioUrl} className="hidden" />
            </div>
          )}

          {/* Credits Info */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            {hasUserApiKey ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                    <Zap className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {userApiBalance !== null ? userApiBalance.toLocaleString() : "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">Your API Balance</p>
                  </div>
                </div>
                <div className="rounded-lg bg-green-500/10 p-2">
                  <p className="text-xs text-green-700 font-medium text-center">
                    ✓ Using your API key — Unlimited generation
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{profile?.credits?.toLocaleString() || 0}</p>
                    <p className="text-sm text-muted-foreground">Platform Credits</p>
                  </div>
                </div>
                <div className="rounded-lg bg-yellow-500/10 p-2">
                  <p className="text-xs text-yellow-700 font-medium text-center">
                    Add your own API key for unlimited generation
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Usage Info */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 font-semibold">Generation Info</h3>
            <p className="text-sm text-muted-foreground">
              Provider: <span className="font-semibold text-foreground capitalize">{provider}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Text length: <span className="font-semibold text-foreground">{charCount}</span> characters
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Word count: <span className="font-semibold text-foreground">{wordCount}</span> words
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
