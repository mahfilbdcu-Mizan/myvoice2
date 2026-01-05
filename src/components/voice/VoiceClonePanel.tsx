import { useState, useRef, useEffect } from "react";
import { Upload, Loader2, Trash2, Mic, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface VoiceClone {
  voice_id: string;
  voice_name: string;
  tag_list: string[];
  cover_url?: string;
  sample_audio?: string;
}

const languages = [
  "English", "Chinese", "Japanese", "Korean", "Spanish", "French", 
  "German", "Italian", "Portuguese", "Russian", "Arabic", "Hindi"
];

export function VoiceClonePanel() {
  const [voiceClones, setVoiceClones] = useState<VoiceClone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [previewText, setPreviewText] = useState("Hello, this is a preview of my cloned voice.");
  const [languageTag, setLanguageTag] = useState("English");
  const [genderTag, setGenderTag] = useState<"male" | "female">("female");
  const [needNoiseReduction, setNeedNoiseReduction] = useState(false);

  useEffect(() => {
    loadVoiceClones();
  }, []);

  const loadVoiceClones = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('voice-clone', {
        method: 'GET',
      });
      
      if (!error && data?.data) {
        setVoiceClones(data.data);
      }
    } catch (e) {
      console.error("Failed to load voice clones:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "audio/mpeg" || selectedFile.name.endsWith('.mp3')) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an MP3 file (max 20MB or 5 minutes)",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateClone = async () => {
    if (!file || !voiceName) {
      toast({
        title: "Missing required fields",
        description: "Please provide an audio file and voice name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("voice_name", voiceName);
      formData.append("preview_text", previewText);
      formData.append("language_tag", languageTag);
      formData.append("gender_tag", genderTag);
      formData.append("need_noise_reduction", needNoiseReduction.toString());

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-clone`,
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
        throw new Error(data.error || "Failed to create voice clone");
      }

      toast({
        title: "Voice clone created!",
        description: `Voice "${voiceName}" has been created successfully.`,
      });

      setIsDialogOpen(false);
      resetForm();
      loadVoiceClones();
    } catch (error) {
      toast({
        title: "Failed to create voice clone",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClone = async (voiceId: string, voiceName: string) => {
    if (!confirm(`Are you sure you want to delete "${voiceName}"?`)) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-clone/${voiceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete voice clone");
      }

      toast({
        title: "Voice clone deleted",
        description: `"${voiceName}" has been deleted.`,
      });

      loadVoiceClones();
    } catch (error) {
      toast({
        title: "Failed to delete voice clone",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const togglePlay = (voiceId: string, sampleUrl?: string) => {
    if (!sampleUrl) return;

    if (playingId === voiceId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = sampleUrl;
        audioRef.current.play();
        setPlayingId(voiceId);
      }
    }
  };

  const resetForm = () => {
    setFile(null);
    setVoiceName("");
    setPreviewText("Hello, this is a preview of my cloned voice.");
    setLanguageTag("English");
    setGenderTag("female");
    setNeedNoiseReduction(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Voice Cloning</h2>
          <p className="text-muted-foreground">
            Clone voices from audio samples (Minimax)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Mic className="h-4 w-4" />
              Create Voice Clone
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Voice Clone</DialogTitle>
              <DialogDescription>
                Upload an audio sample to clone a voice
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">{file ? file.name : "Upload audio"}</p>
                <p className="text-xs text-muted-foreground">MP3 (max 20MB or 5 min)</p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <Label>Voice Name</Label>
                <Input
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="My Voice Clone"
                />
              </div>

              <div className="space-y-2">
                <Label>Preview Text</Label>
                <Input
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Hello, this is a preview..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={languageTag} onValueChange={setLanguageTag}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={genderTag} onValueChange={(v) => setGenderTag(v as "male" | "female")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="noise-reduction">Noise Reduction</Label>
                <Switch
                  id="noise-reduction"
                  checked={needNoiseReduction}
                  onCheckedChange={setNeedNoiseReduction}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateClone} disabled={isCreating || !file || !voiceName}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Clone"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Voice Clones Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : voiceClones.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <Mic className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No voice clones yet</p>
          <p className="text-muted-foreground">Create your first voice clone to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voiceClones.map((voice) => (
            <div
              key={voice.voice_id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                {voice.cover_url ? (
                  <img
                    src={voice.cover_url}
                    alt={voice.voice_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <Mic className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{voice.voice_name}</p>
                <p className="text-sm text-muted-foreground">
                  {voice.tag_list?.slice(0, 2).join(", ")}
                </p>
              </div>
              <div className="flex gap-1">
                {voice.sample_audio && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePlay(voice.voice_id, voice.sample_audio)}
                  >
                    {playingId === voice.voice_id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => handleDeleteClone(voice.voice_id, voice.voice_name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />
    </div>
  );
}
