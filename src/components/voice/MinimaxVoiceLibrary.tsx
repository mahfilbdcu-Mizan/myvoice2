import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, ChevronLeft, ChevronRight, Play, Pause, Check, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchMinimaxVoices, listVoiceClones, type MinimaxVoice, type VoiceClone } from "@/lib/minimax-api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface MinimaxVoiceCardProps {
  voice: MinimaxVoice | VoiceClone;
  isSelected?: boolean;
  isPlaying?: boolean;
  onSelect?: (voice: MinimaxVoice | VoiceClone) => void;
  onPlay?: (voice: MinimaxVoice | VoiceClone) => void;
  isClone?: boolean;
}

function MinimaxVoiceCard({
  voice,
  isSelected = false,
  isPlaying = false,
  onSelect,
  onPlay,
  isClone = false,
}: MinimaxVoiceCardProps) {
  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (voice.sample_audio) {
      onPlay?.(voice);
    }
  };

  const handleSelect = () => {
    onSelect?.(voice);
  };

  return (
    <div
      onClick={handleSelect}
      className={cn(
        "group relative cursor-pointer rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-elevated",
        isSelected 
          ? "border-primary ring-2 ring-primary/20" 
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Clone badge */}
      {isClone && (
        <div className="absolute left-2 top-2">
          <Badge variant="secondary" className="text-xs gap-1">
            <Mic className="h-3 w-3" />
            Clone
          </Badge>
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-lg">
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}

      <div className={cn("flex items-start gap-4", isClone && "mt-6")}>
        {/* Play Button */}
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "h-12 w-12 shrink-0 rounded-full",
            !voice.sample_audio && "opacity-50 cursor-not-allowed"
          )}
          onClick={handlePlay}
          disabled={!voice.sample_audio}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" />
          )}
        </Button>

        {/* Voice Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {voice.cover_url && (
              <img 
                src={voice.cover_url} 
                alt="" 
                className="h-8 w-8 rounded-full object-cover border border-border"
              />
            )}
            <h3 className="truncate text-base font-semibold">{voice.voice_name}</h3>
          </div>
          
          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {voice.tag_list?.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Use Voice Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-4 w-full opacity-0 transition-opacity group-hover:opacity-100"
        onClick={handleSelect}
      >
        Use this voice
      </Button>
    </div>
  );
}

interface MinimaxVoiceLibraryProps {
  onSelectVoice?: (voice: MinimaxVoice | VoiceClone) => void;
  selectedVoice?: MinimaxVoice | VoiceClone | null;
  isModal?: boolean;
  onClose?: () => void;
}

export function MinimaxVoiceLibrary({ 
  onSelectVoice, 
  selectedVoice,
  isModal = false, 
  onClose 
}: MinimaxVoiceLibraryProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("library");
  const [voices, setVoices] = useState<MinimaxVoice[]>([]);
  const [clones, setClones] = useState<VoiceClone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClonesLoading, setIsClonesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const PAGE_SIZE = 50;

  const fetchVoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchMinimaxVoices({
        page: currentPage,
        page_size: PAGE_SIZE,
      });
      setVoices(result.voices);
      setHasMore(result.has_more);
    } catch (error) {
      console.error("Failed to fetch Minimax voices:", error);
    }
    setIsLoading(false);
  }, [currentPage]);

  const fetchClones = useCallback(async () => {
    if (!user) return;
    setIsClonesLoading(true);
    try {
      const result = await listVoiceClones();
      if (result.error) {
        console.error("Failed to fetch clones:", result.error);
      } else {
        setClones(result.clones);
      }
    } catch (error) {
      console.error("Failed to fetch voice clones:", error);
    }
    setIsClonesLoading(false);
  }, [user]);

  useEffect(() => {
    fetchVoices();
    fetchClones();
  }, [fetchVoices, fetchClones]);

  const filteredVoices = voices.filter(voice => 
    voice.voice_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    voice.tag_list?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredClones = clones.filter(clone => 
    clone.voice_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clone.tag_list?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleVoiceSelect = (voice: MinimaxVoice | VoiceClone) => {
    onSelectVoice?.(voice);
    if (isModal && onClose) {
      onClose();
    }
  };

  const handlePlayVoice = (voice: MinimaxVoice | VoiceClone) => {
    if (!voice.sample_audio) return;

    if (playingVoiceId === voice.voice_id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(voice.sample_audio);
      audio.onended = () => setPlayingVoiceId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingVoiceId(voice.voice_id);
    }
  };

  const content = (
    <div className="flex h-full flex-col">
      {/* Header */}
      {!isModal && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Minimax Voice Library</h1>
          <p className="text-muted-foreground">
            Explore Minimax AI voices with preview
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mb-4 w-fit">
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="clones" className="gap-2">
            <Mic className="h-4 w-4" />
            My Clones
            {clones.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {clones.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or tag..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Library Tab */}
        <TabsContent value="library" className="flex-1 flex flex-col mt-0">
          {/* Results count & pagination info */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading voices...
                </span>
              ) : (
                `Showing ${filteredVoices.length} voices`
              )}
            </p>
            
            {/* Pagination controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!hasMore || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Voice Grid */}
          <div className="grid flex-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVoices.map((voice) => (
              <MinimaxVoiceCard
                key={voice.voice_id}
                voice={voice}
                isSelected={selectedVoice?.voice_id === voice.voice_id}
                isPlaying={playingVoiceId === voice.voice_id}
                onSelect={handleVoiceSelect}
                onPlay={handlePlayVoice}
              />
            ))}
          </div>

          {filteredVoices.length === 0 && !isLoading && (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No voices found</h3>
              <p className="mt-1 text-muted-foreground">
                Try adjusting your search
              </p>
            </div>
          )}
        </TabsContent>

        {/* Clones Tab */}
        <TabsContent value="clones" className="flex-1 flex flex-col mt-0">
          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {isClonesLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading clones...
                </span>
              ) : (
                `${filteredClones.length} cloned voice${filteredClones.length !== 1 ? 's' : ''}`
              )}
            </p>
          </div>

          {/* Clone Grid */}
          {isClonesLoading ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredClones.length > 0 ? (
            <div className="grid flex-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredClones.map((clone) => (
                <MinimaxVoiceCard
                  key={clone.voice_id}
                  voice={clone}
                  isSelected={selectedVoice?.voice_id === clone.voice_id}
                  isPlaying={playingVoiceId === clone.voice_id}
                  onSelect={handleVoiceSelect}
                  onPlay={handlePlayVoice}
                  isClone
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Mic className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No cloned voices yet</h3>
              <p className="mt-1 text-muted-foreground max-w-sm">
                Go to Voice Clone to create your custom voice clones that will appear here
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  if (onClose) onClose();
                  window.location.href = "/dashboard/voice-clone";
                }}
              >
                <Mic className="mr-2 h-4 w-4" />
                Create Voice Clone
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isModal) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select a Voice</DialogTitle>
          </DialogHeader>
          <div className="h-[65vh] overflow-y-auto">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}
