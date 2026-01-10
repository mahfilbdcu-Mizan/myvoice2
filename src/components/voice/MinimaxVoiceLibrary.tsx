import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, ChevronLeft, ChevronRight, Play, Pause, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchMinimaxVoices, type MinimaxVoice } from "@/lib/minimax-api";
import { cn } from "@/lib/utils";

interface MinimaxVoiceCardProps {
  voice: MinimaxVoice;
  isSelected?: boolean;
  isPlaying?: boolean;
  onSelect?: (voice: MinimaxVoice) => void;
  onPlay?: (voice: MinimaxVoice) => void;
}

function MinimaxVoiceCard({
  voice,
  isSelected = false,
  isPlaying = false,
  onSelect,
  onPlay,
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
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-lg">
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}

      <div className="flex items-start gap-4">
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
  onSelectVoice?: (voice: MinimaxVoice) => void;
  selectedVoice?: MinimaxVoice | null;
  isModal?: boolean;
  onClose?: () => void;
}

export function MinimaxVoiceLibrary({ 
  onSelectVoice, 
  selectedVoice,
  isModal = false, 
  onClose 
}: MinimaxVoiceLibraryProps) {
  const [voices, setVoices] = useState<MinimaxVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  const filteredVoices = voices.filter(voice => 
    voice.voice_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    voice.tag_list?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleVoiceSelect = (voice: MinimaxVoice) => {
    onSelectVoice?.(voice);
    if (isModal && onClose) {
      onClose();
    }
  };

  const handlePlayVoice = (voice: MinimaxVoice) => {
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

        {/* Results count & pagination info */}
        <div className="flex items-center justify-between">
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
    </div>
  );

  if (isModal) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select a Minimax Voice</DialogTitle>
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
