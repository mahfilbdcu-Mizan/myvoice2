import { useState, useRef } from "react";
import { Upload, Loader2, Download, Play, Pause, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { waitForTask } from "@/lib/voice-api";
import { toast } from "@/hooks/use-toast";

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "ru", name: "Russian" },
  { code: "nl", name: "Dutch" },
  { code: "cs", name: "Czech" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "hi", name: "Hindi" },
  { code: "ko", name: "Korean" },
];

export function DubbingPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("es");
  const [numSpeakers, setNumSpeakers] = useState("0");
  const [disableVoiceCloning, setDisableVoiceCloning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [result, setResult] = useState<{ audioUrl?: string; srtUrl?: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (['mp3', 'm4a'].includes(extension || '')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an MP3 or M4A file (max 20MB or 5 minutes)",
          variant: "destructive",
        });
      }
    }
  };

  const handleDub = async () => {
    if (!file) return;

    setIsProcessing(true);
    setTaskStatus("Uploading...");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source_lang", sourceLang);
      formData.append("target_lang", targetLang);
      formData.append("num_speakers", numSpeakers);
      formData.append("disable_voice_cloning", disableVoiceCloning.toString());

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dubbing`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start dubbing");
      }

      if (data.task_id) {
        setTaskStatus("Processing audio...");
        const task = await waitForTask(data.task_id);

        if (task?.status === "done" && task.metadata) {
          const audioUrlValue = Array.isArray(task.metadata.audio_url) ? task.metadata.audio_url[0] : task.metadata.audio_url;
          setResult({
            audioUrl: audioUrlValue,
            srtUrl: task.metadata.srt_url,
          });
          toast({
            title: "Dubbing complete!",
            description: "Your dubbed audio is ready.",
          });
        } else if (task?.status === "failed") {
          throw new Error(task.error_message || "Dubbing failed");
        }
      }
    } catch (error) {
      toast({
        title: "Dubbing failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTaskStatus(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Audio Dubbing</h2>
        <p className="text-muted-foreground">
          Dub audio files into different languages with AI voice cloning
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Section */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{file ? file.name : "Click to upload audio"}</p>
            <p className="text-sm text-muted-foreground">MP3 or M4A (max 20MB or 5 min)</p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.m4a"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Source Language</Label>
              <Select value={sourceLang} onValueChange={setSourceLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto Detect</SelectItem>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Language</Label>
              <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Number of Speakers</Label>
            <Select value={numSpeakers} onValueChange={setNumSpeakers}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Auto Detect</SelectItem>
                <SelectItem value="1">1 Speaker</SelectItem>
                <SelectItem value="2">2 Speakers</SelectItem>
                <SelectItem value="3">3 Speakers</SelectItem>
                <SelectItem value="4">4 Speakers</SelectItem>
                <SelectItem value="5">5 Speakers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="voice-cloning">Use Voice Library (instead of cloning)</Label>
            <Switch
              id="voice-cloning"
              checked={disableVoiceCloning}
              onCheckedChange={setDisableVoiceCloning}
            />
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleDub}
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {taskStatus}
              </>
            ) : (
              <>
                <Languages className="h-5 w-5" />
                Start Dubbing
              </>
            )}
          </Button>
        </div>

        {/* Result Section */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold">Result</h3>

          {result ? (
            <div className="space-y-4">
              {result.audioUrl && (
                <div className="space-y-3">
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
                      <p className="font-medium">Dubbed Audio</p>
                      <p className="text-sm text-muted-foreground">
                        {targetLang.toUpperCase()} version
                      </p>
                    </div>
                  </div>
                  <audio
                    ref={audioRef}
                    src={result.audioUrl}
                    onEnded={() => setIsPlaying(false)}
                  />
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = result.audioUrl!;
                      a.download = `dubbed-${targetLang}-${Date.now()}.mp3`;
                      a.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download Audio
                  </Button>
                </div>
              )}

              {result.srtUrl && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = result.srtUrl!;
                    a.download = `subtitles-${targetLang}-${Date.now()}.srt`;
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download Subtitles (SRT)
                </Button>
              )}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <p>Dubbed audio will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
