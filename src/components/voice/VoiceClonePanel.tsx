import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Play, Pause, Trash2, Loader2, HelpCircle, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cloneVoice, listVoiceClones, deleteVoiceClone, type VoiceClone } from "@/lib/minimax-api";
import { useAuth } from "@/contexts/AuthContext";

interface VoiceClonePanelProps {
  onSelectClonedVoice?: (voice: { id: string; name: string }) => void;
}

const languages = [
  "English", "Chinese", "Spanish", "French", "German", 
  "Italian", "Portuguese", "Russian", "Japanese", "Korean",
  "Arabic", "Hindi", "Bengali", "Vietnamese", "Thai"
];

export function VoiceClonePanel({ onSelectClonedVoice }: VoiceClonePanelProps) {
  const { user } = useAuth();
  const [clones, setClones] = useState<VoiceClone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloning, setIsCloning] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Clone form state
  const [voiceName, setVoiceName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [languageTag, setLanguageTag] = useState("");
  const [genderTag, setGenderTag] = useState("");
  const [needNoiseReduction, setNeedNoiseReduction] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadClones();
    }
  }, [user]);

  const loadClones = async () => {
    setIsLoading(true);
    const result = await listVoiceClones();
    if (result.error) {
      console.error("Error loading clones:", result.error);
    } else {
      setClones(result.clones);
    }
    setIsLoading(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileValidation(files[0]);
    }
  }, []);

  const handleFileValidation = (file: File) => {
    // Check file type
    if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
      toast({
        title: "Invalid file type",
        description: "Currently only supports .mp3 files",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an audio file under 20MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    toast({
      title: "File selected",
      description: file.name,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileValidation(file);
    }
  };

  const handleClone = async () => {
    if (!selectedFile) {
      toast({
        title: "Missing audio file",
        description: "Please upload an audio file",
        variant: "destructive",
      });
      return;
    }

    if (!voiceName.trim()) {
      toast({
        title: "Missing voice name",
        description: "Please enter a voice name",
        variant: "destructive",
      });
      return;
    }

    setIsCloning(true);
    const result = await cloneVoice({
      file: selectedFile,
      voiceName: voiceName.trim(),
      previewText: previewText || "Hello, this is my cloned voice.",
      languageTag: languageTag || "English",
      genderTag: (genderTag as "male" | "female") || "male",
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
      resetForm();
      loadClones();
    }
    setIsCloning(false);
  };

  const handleDelete = async (voiceId: string, voiceName: string) => {
    if (!confirm(`Are you sure you want to delete "${voiceName}"?`)) return;
    
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
        audioRef.current.play().catch(err => {
          console.error("Audio play error:", err);
          toast({
            title: "Playback failed",
            description: "Could not play the audio preview",
            variant: "destructive",
          });
        });
        setPlayingId(voice.voice_id);
      }
    }
  };

  const handleDownload = async (voice: VoiceClone) => {
    if (!voice.sample_audio) {
      toast({
        title: "No audio available",
        description: "This voice clone doesn't have a sample audio",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Downloading...",
        description: "Please wait while we prepare your file.",
      });

      const response = await fetch(voice.sample_audio);
      if (!response.ok) throw new Error("Failed to download");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${voice.voice_name.replace(/\s+/g, "_")}_clone.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: `${voice.voice_name} has been downloaded.`,
      });
    } catch (error) {
      console.error("Download error:", error);
      // Fallback: open in new tab
      window.open(voice.sample_audio, "_blank");
      toast({
        title: "Download issue",
        description: "Opening audio in new tab. Right-click to save.",
      });
    }
  };

  const resetForm = () => {
    setVoiceName("");
    setSelectedFile(null);
    setPreviewText("");
    setLanguageTag("");
    setGenderTag("");
    setNeedNoiseReduction(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to use voice cloning.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Side - Clone Form */}
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
            <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
            <p className="text-sm text-foreground">
              Clone any voice you want, no more worries about not finding the right voice. 
              <span className="text-muted-foreground"> Cost: 333 credits (using Minimax)</span>
            </p>
          </div>

          {/* Voice Name */}
          <div className="space-y-2">
            <Label htmlFor="voice-name" className="text-sm font-medium">
              Voice Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="voice-name"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="Enter voice name"
              className="bg-card border-border"
            />
          </div>

          {/* Upload Audio File */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Upload Audio File <span className="text-destructive">*</span>
            </Label>
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center 
                min-h-[200px] rounded-xl border-2 border-dashed 
                cursor-pointer transition-all duration-200
                ${isDragOver 
                  ? "border-primary bg-primary/5" 
                  : selectedFile 
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-border hover:border-muted-foreground/50 bg-card"
                }
              `}
            >
              <Input
                ref={fileInputRef}
                type="file"
                accept="audio/mp3,audio/mpeg,.mp3"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="text-center p-6">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <Upload className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="font-medium text-green-600">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="text-center p-6">
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium">Click or drag to upload here</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Duration 10s - 5 minutes, max 20MB
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Currently only supports: .mp3
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If your file is different, please convert manually.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Language and Gender */}
          <div className="flex gap-3">
            <Select value={languageTag} onValueChange={setLanguageTag}>
              <SelectTrigger className="flex-1 bg-card border-border">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={genderTag} onValueChange={setGenderTag}>
              <SelectTrigger className="flex-1 bg-card border-border">
                <SelectValue placeholder="Select Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview Text */}
          <div className="space-y-2">
            <Label htmlFor="preview-text" className="text-sm font-medium">
              Preview Text
            </Label>
            <Textarea
              id="preview-text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Enter text to preview the cloned voice after completion."
              className="min-h-[80px] bg-card border-border resize-none"
            />
          </div>

          {/* Remove Noise and Clone Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch
                id="noise-reduction"
                checked={needNoiseReduction}
                onCheckedChange={setNeedNoiseReduction}
              />
              <Label htmlFor="noise-reduction" className="text-sm cursor-pointer">
                Remove Noise
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enable to remove background noise from your audio</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Button 
              onClick={handleClone} 
              disabled={isCloning || !selectedFile || !voiceName.trim()}
              className="px-6"
            >
              {isCloning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cloning...
                </>
              ) : (
                "Clone Voice"
              )}
            </Button>
          </div>
        </div>

        {/* Right Side - Cloned Voices */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Cloned Voices</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No cloned voices yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Upload an audio file to create your first voice clone
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {clones.map((clone) => (
                <div 
                  key={clone.voice_id} 
                  className="group rounded-xl border border-border bg-card p-4 hover:border-muted-foreground/50 transition-colors"
                >
                  {/* Voice Name */}
                  <h3 className="font-medium mb-3 truncate" title={clone.voice_name}>
                    {clone.voice_name}
                  </h3>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {clone.tag_list.slice(0, 3).map((tag, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="text-xs font-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Bottom Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {clone.cover_url ? (
                        <img 
                          src={clone.cover_url} 
                          alt={clone.voice_name}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {clone.voice_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs gap-1">
                        <Share2 className="h-3 w-3" />
                        Shared
                      </Badge>
                      
                      {clone.sample_audio && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePlay(clone)}
                            title="Play preview"
                          >
                            {playingId === clone.voice_id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(clone)}
                            title="Download audio"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(clone.voice_id, clone.voice_name)}
                        title="Delete voice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
