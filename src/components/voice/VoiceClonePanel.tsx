import { useState, useRef, useEffect } from "react";
import { Upload, Mic, Play, Pause, Trash2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cloneVoice, listVoiceClones, deleteVoiceClone, type VoiceClone } from "@/lib/minimax-api";
import { useAuth } from "@/contexts/AuthContext";

interface VoiceClonePanelProps {
  onSelectClonedVoice?: (voice: { id: string; name: string }) => void;
}

const languages = [
  "English", "Chinese", "Spanish", "French", "German", 
  "Italian", "Portuguese", "Russian", "Japanese", "Korean",
  "Arabic", "Hindi", "Bengali"
];

export function VoiceClonePanel({ onSelectClonedVoice }: VoiceClonePanelProps) {
  const { user } = useAuth();
  const [clones, setClones] = useState<VoiceClone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloning, setIsCloning] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Clone form state
  const [voiceName, setVoiceName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewText, setPreviewText] = useState("Hello, this is my cloned voice.");
  const [languageTag, setLanguageTag] = useState("English");
  const [genderTag, setGenderTag] = useState<"male" | "female">("male");
  const [needNoiseReduction, setNeedNoiseReduction] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (user) {
      loadClones();
    }
  }, [user]);

  const loadClones = async () => {
    setIsLoading(true);
    const result = await listVoiceClones();
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setClones(result.clones);
    }
    setIsLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an audio file under 20MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleClone = async () => {
    if (!selectedFile || !voiceName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a voice name and audio file",
        variant: "destructive",
      });
      return;
    }

    setIsCloning(true);
    const result = await cloneVoice({
      file: selectedFile,
      voiceName: voiceName.trim(),
      previewText,
      languageTag,
      genderTag,
      needNoiseReduction,
    });

    if (result.error) {
      toast({
        title: "Clone failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Voice cloned!",
        description: "Your voice clone is ready to use.",
      });
      setShowCreateDialog(false);
      resetForm();
      loadClones();
    }
    setIsCloning(false);
  };

  const handleDelete = async (voiceId: string) => {
    const result = await deleteVoiceClone(voiceId);
    if (result.error) {
      toast({
        title: "Delete failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Voice deleted",
        description: "The voice clone has been removed.",
      });
      loadClones();
    }
  };

  const handlePlay = (voice: VoiceClone) => {
    if (!voice.sample_audio) return;
    
    if (playingId === voice.voice_id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = voice.sample_audio;
        audioRef.current.play();
        setPlayingId(voice.voice_id);
      }
    }
  };

  const resetForm = () => {
    setVoiceName("");
    setSelectedFile(null);
    setPreviewText("Hello, this is my cloned voice.");
    setLanguageTag("English");
    setGenderTag("male");
    setNeedNoiseReduction(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Please log in to use voice cloning.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Voice Clones</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage your custom voice clones
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Clone Voice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Clone a Voice</DialogTitle>
              <DialogDescription>
                Upload an audio file (MP3, max 20MB or 5 minutes) to create a voice clone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Voice Name</Label>
                <Input
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="My Custom Voice"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Audio File</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mp3,audio/mpeg"
                  onChange={handleFileSelect}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Preview Text</Label>
                <Input
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Hello, this is my cloned voice."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={languageTag} onValueChange={setLanguageTag}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
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
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={needNoiseReduction}
                  onCheckedChange={setNeedNoiseReduction}
                />
                <Label>Enable noise reduction</Label>
              </div>
              
              <Button 
                onClick={handleClone} 
                disabled={isCloning || !selectedFile || !voiceName.trim()}
                className="w-full"
              >
                {isCloning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Create Clone
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : clones.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Mic className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No voice clones yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first voice clone by uploading an audio sample.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Clone
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clones.map((clone) => (
            <Card key={clone.voice_id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {clone.cover_url ? (
                      <img 
                        src={clone.cover_url} 
                        alt={clone.voice_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mic className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{clone.voice_name}</CardTitle>
                      <CardDescription className="text-xs">
                        {clone.tag_list.join(", ")}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  {clone.sample_audio && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlay(clone)}
                    >
                      {playingId === clone.voice_id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectClonedVoice?.({
                      id: clone.voice_id,
                      name: clone.voice_name,
                    })}
                  >
                    Use Voice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(clone.voice_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
