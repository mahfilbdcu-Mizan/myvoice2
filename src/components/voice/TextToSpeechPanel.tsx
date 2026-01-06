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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

interface TextToSpeechPanelProps {
  selectedVoice?: { id: string; name: string } | null;
  onOpenVoiceLibrary?: () => void;
}

const defaultModels = [
  { id: "eleven_multilingual_v2", name: "Multilingual v2" },
  { id: "eleven_turbo_v2_5", name: "Turbo v2.5" },
  { id: "eleven_monolingual_v1", name: "English v1" },
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

export function TextToSpeechPanel({ 
  selectedVoice, 
  onOpenVoiceLibrary 
}: TextToSpeechPanelProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>(defaultModels);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  
  // User API key balance
  const [userApiBalance, setUserApiBalance] = useState<number | null>(null);
  const [hasUserApiKey, setHasUserApiKey] = useState(false);
  
  // Voice settings
  const [model, setModel] = useState("eleven_multilingual_v2");
  const [language, setLanguage] = useState("auto");
  const [speed, setSpeed] = useState([1.0]);
  const [stability, setStability] = useState([0.5]);
  const [similarity, setSimilarity] = useState([0.75]);
  const [style, setStyle] = useState([0]);
  const [speakerBoost, setSpeakerBoost] = useState(false);

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

  // Fetch user API key balance
  useEffect(() => {
    async function fetchUserApiKeyBalance() {
      if (!user) return;
      
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        // Get user's API key
        const { data: apiKeyData } = await supabase
          .from("user_api_keys")
          .select("*")
          .eq("user_id", user.id)
          .eq("provider", "ai33")
          .maybeSingle();
        
        if (apiKeyData) {
          setHasUserApiKey(true);
          setUserApiBalance(apiKeyData.remaining_credits);
          
          // Optionally refresh balance from API
          if (apiKeyData.encrypted_key) {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-api-balance`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ apiKey: apiKeyData.encrypted_key }),
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data.valid && data.credits !== null) {
                setUserApiBalance(data.credits);
                
                // Update in database
                await supabase
                  .from("user_api_keys")
                  .update({ remaining_credits: data.credits, updated_at: new Date().toISOString() })
                  .eq("id", apiKeyData.id);
              }
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
        // Parse SRT format - extract only text, not timestamps
        const lines = content.split('\n');
        const textLines: string[] = [];
        let isTextLine = false;
        
        for (const line of lines) {
          const trimmed = line.trim();
          // Skip empty lines, numbers, and timestamps
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
    } else if (extension === 'zip') {
      toast({
        title: "ZIP files",
        description: "ZIP support coming soon. Please extract and upload TXT or SRT files.",
      });
    } else {
      toast({
        title: "Unsupported format",
        description: "Please upload .txt, .srt, or .zip files",
        variant: "destructive",
      });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    console.log("Generate clicked - text:", text.trim().length, "voice:", selectedVoice);
    
    if (!text.trim() || !selectedVoice) {
      console.log("Missing required fields - text:", !!text.trim(), "voice:", !!selectedVoice);
      toast({
        title: "Missing information",
        description: !text.trim() ? "Please enter some text" : "Please select a voice",
        variant: "destructive",
      });
      return;
    }
    
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: userData } = await supabase.auth.getUser();
    
    console.log("User ID:", userData?.user?.id);
    
    setIsGenerating(true);
    setAudioUrl(null);
    setTaskStatus("Starting generation...");
    
    try {
      console.log("Calling generateSpeech API...");
      const result = await generateSpeech({
        text: text.trim(),
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
        model,
        stability: stability[0],
        similarity: similarity[0],
        style: style[0],
        userId: userData?.user?.id,
      });
      
      console.log("Generate result:", result);

      if (result.error) {
        toast({
          title: "Generation failed",
          description: result.error,
          variant: "destructive",
        });
        setTaskStatus(null);
      } else if (result.audioUrl) {
        // Direct audio response
        setAudioUrl(result.audioUrl);
        setTaskStatus(null);
        toast({
          title: "Speech generated!",
          description: "Your audio is ready to play and download.",
        });
        refreshProfile();
      } else if (result.taskId) {
        // Task-based response - poll for completion
        setTaskStatus("Processing...");
        
        const task = await waitForTask(result.taskId, userData?.user?.id);
        
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
        } else if (!task) {
          toast({
            title: "Generation timeout",
            description: "Task is taking too long. Please try again.",
            variant: "destructive",
          });
          setTaskStatus(null);
        } else {
          // Task returned but no audio - might be still processing or unknown state
          toast({
            title: "Generation incomplete",
            description: `Task status: ${task.status}. Please try again.`,
            variant: "destructive",
          });
          setTaskStatus(null);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate speech. Please try again.",
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
    if (!audioUrl) return;

    if (format === 'mp3') {
      try {
        // Check if it's a blob URL (local) or external URL
        if (audioUrl.startsWith('blob:')) {
          // Local blob URL - direct download
          const a = document.createElement("a");
          a.href = audioUrl;
          a.download = `speech-${Date.now()}.mp3`;
          a.click();
        } else {
          // External URL - fetch and create blob to avoid CORS issues
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
        // Fallback: open in new tab
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
      // Generate basic SRT format
      const lines = text.split('\n').filter(l => l.trim());
      let srtContent = '';
      let time = 0;
      
      lines.forEach((line, index) => {
        const duration = Math.ceil(line.length / 15); // Rough estimate
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Text to Speech</h1>
          <p className="text-muted-foreground">Convert your text into natural speech</p>
        </div>
        <div className="flex items-center gap-3">
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
              accept=".txt,.srt,.zip"
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
              Supports .txt, .srt, .zip formats
            </span>
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
            size="lg"
            className="mt-4 h-14 text-lg"
            onClick={handleGenerate}
            disabled={!text.trim() || !selectedVoice || isGenerating}
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
            <CollapsibleContent className="mt-4 space-y-5 rounded-xl border border-border bg-card p-4">
              {/* Language Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select language</label>
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

              {/* Speed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Speed: {speed[0].toFixed(2)}</label>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Slower</span>
                  <span>Faster</span>
                </div>
                <Slider
                  value={speed}
                  onValueChange={setSpeed}
                  min={0.7}
                  max={1.2}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* Stability */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Stability: {Math.round(stability[0] * 100)}%</label>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>More variable</span>
                  <span>More stable</span>
                </div>
                <Slider
                  value={stability}
                  onValueChange={setStability}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* Similarity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Similarity: {Math.round(similarity[0] * 100)}%</label>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Low</span>
                  <span>High</span>
                </div>
                <Slider
                  value={similarity}
                  onValueChange={setSimilarity}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* Style Exaggeration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Style Exaggeration: {Math.round(style[0] * 100)}%</label>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>None</span>
                  <span>Exaggerated</span>
                </div>
                <Slider
                  value={style}
                  onValueChange={setStyle}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* Speaker Boost */}
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

              {/* Reset Values */}
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

              {/* Download Options */}
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
            {/* Show which API will be used */}
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
