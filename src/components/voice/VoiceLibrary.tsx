import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceCard } from "./VoiceCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchVoicesFromAPI, type Voice, parseVoiceLabels } from "@/lib/voice-api";

const languages = ["All", "en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi", "ru"];
const languageLabels: Record<string, string> = {
  "All": "All Languages",
  "en": "English",
  "es": "Spanish",
  "fr": "French",
  "de": "German",
  "it": "Italian",
  "pt": "Portuguese",
  "zh": "Chinese",
  "ja": "Japanese",
  "ko": "Korean",
  "ar": "Arabic",
  "hi": "Hindi",
  "ru": "Russian"
};
const genders = ["All", "male", "female"];
const ages = ["All", "young", "middle_aged", "old"];
const ageLabels: Record<string, string> = {
  "All": "All Ages",
  "young": "Young",
  "middle_aged": "Middle Aged",
  "old": "Old"
};

interface VoiceLibraryProps {
  onSelectVoice?: (voice: { id: string; name: string }) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export function VoiceLibrary({ onSelectVoice, isModal = false, onClose }: VoiceLibraryProps) {
  const [allVoices, setAllVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedAge, setSelectedAge] = useState("All");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const PAGE_SIZE = 100;
  const DISPLAY_PAGE_SIZE = 24;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch ALL voices from API (load multiple pages)
  const fetchAllVoicesFromAPI = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      let allLoadedVoices: Voice[] = [];
      let page = 0;
      let hasMorePages = true;
      
      // Load up to 500 voices (5 pages of 100)
      while (hasMorePages && page < 5) {
        const result = await fetchVoicesFromAPI({
          page_size: PAGE_SIZE,
          page: page,
          gender: selectedGender !== "All" ? selectedGender : undefined,
          language: selectedLanguage !== "All" ? selectedLanguage : undefined,
          age: selectedAge !== "All" ? selectedAge : undefined,
        });
        
        allLoadedVoices = [...allLoadedVoices, ...result.voices];
        hasMorePages = result.has_more;
        page++;
        
        if (result.error) {
          setApiError(result.error);
          break;
        }
      }
      
      setAllVoices(allLoadedVoices);
      setHasMore(hasMorePages);
    } catch (error) {
      console.error("Failed to fetch voices:", error);
      setApiError("Failed to load voices. Please try again.");
    }
    setIsLoading(false);
  }, [selectedGender, selectedLanguage, selectedAge]);

  useEffect(() => {
    fetchAllVoicesFromAPI();
  }, [fetchAllVoicesFromAPI]);

  // Client-side search filtering
  const filteredVoices = useMemo(() => {
    if (!debouncedSearch) return allVoices;
    
    const searchLower = debouncedSearch.toLowerCase().trim();
    return allVoices.filter(voice => 
      voice.name.toLowerCase().includes(searchLower) ||
      voice.voice_id.toLowerCase().includes(searchLower)
    );
  }, [allVoices, debouncedSearch]);

  // Paginated voices for display
  const paginatedVoices = useMemo(() => {
    const start = currentPage * DISPLAY_PAGE_SIZE;
    const end = start + DISPLAY_PAGE_SIZE;
    return filteredVoices.slice(start, end);
  }, [filteredVoices, currentPage]);

  const totalPages = Math.ceil(filteredVoices.length / DISPLAY_PAGE_SIZE);
  const hasMorePages = currentPage < totalPages - 1;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedGender, selectedLanguage, selectedAge]);

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    const voice = filteredVoices.find(v => v.voice_id === voiceId);
    if (voice && onSelectVoice) {
      onSelectVoice({ id: voice.voice_id, name: voice.name });
      if (isModal && onClose) {
        onClose();
      }
    }
  };

  const handlePlayVoice = (voiceId: string) => {
    const voice = filteredVoices.find(v => v.voice_id === voiceId);
    if (!voice?.preview_url) return;

    if (playingVoiceId === voiceId) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(voice.preview_url);
      audio.onended = () => setPlayingVoiceId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingVoiceId(voiceId);
    }
  };

  const clearFilters = () => {
    setSelectedLanguage("All");
    setSelectedGender("All");
    setSelectedAge("All");
    setSearchQuery("");
    setCurrentPage(0);
  };

  const hasActiveFilters = 
    selectedLanguage !== "All" || 
    selectedGender !== "All" || 
    selectedAge !== "All" ||
    searchQuery !== "";

  const content = (
    <div className="flex h-full flex-col">
      {/* Header */}
      {!isModal && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Voice Library</h1>
          <p className="text-muted-foreground">
            Explore and select from thousands of AI voices powered by ElevenLabs
          </p>
        </div>
      )}

      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or paste a Voice ID..."
            className="pl-10"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang}>{languageLabels[lang]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedGender} onValueChange={setSelectedGender}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              {genders.map((gender) => (
                <SelectItem key={gender} value={gender}>{gender === "All" ? "All" : gender.charAt(0).toUpperCase() + gender.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedAge} onValueChange={setSelectedAge}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Age" />
            </SelectTrigger>
            <SelectContent>
              {ages.map((age) => (
                <SelectItem key={age} value={age}>{ageLabels[age]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
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
              `Showing ${paginatedVoices.length} of ${filteredVoices.length} voices${hasMore ? ' (more available from API)' : ''}`
            )}
          </p>
          
          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!hasMorePages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            {hasMore && !isLoading && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAllVoicesFromAPI()}
                disabled={isLoading}
              >
                Reload All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Voice Grid */}
      <div className="grid flex-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedVoices.map((voice) => {
          const labels = parseVoiceLabels(voice);
          return (
            <VoiceCard
              key={voice.voice_id}
              id={voice.voice_id}
              name={voice.name}
              accent={labels.accent}
              gender={labels.gender}
              age={labels.age}
              description={labels.description}
              category={voice.category}
              previewUrl={voice.preview_url}
              isSelected={selectedVoiceId === voice.voice_id}
              isPlaying={playingVoiceId === voice.voice_id}
              onSelect={handleVoiceSelect}
              onPlay={handlePlayVoice}
            />
          );
        })}
      </div>

      {/* API Error Message */}
      {apiError && (
        <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            ⚠️ {apiError}
          </p>
        </div>
      )}

      {paginatedVoices.length === 0 && !isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No voices found</h3>
          <p className="mt-1 text-muted-foreground">
            {apiError ? "Please check your API key in Admin Settings" : "Try adjusting your search or filters"}
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
