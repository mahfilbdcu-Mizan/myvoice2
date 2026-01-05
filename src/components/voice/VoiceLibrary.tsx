import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
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

const languages = ["All", "English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean"];
const accents = ["All", "American", "British", "Australian", "Irish", "Indian"];
const genders = ["All", "male", "female"];
const ages = ["All", "young", "middle aged", "old"];
const categories = ["All", "premade", "cloned", "generated", "professional"];

interface VoiceLibraryProps {
  onSelectVoice?: (voice: { id: string; name: string }) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export function VoiceLibrary({ onSelectVoice, isModal = false, onClose }: VoiceLibraryProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedAccent, setSelectedAccent] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedAge, setSelectedAge] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch voices on mount
  useEffect(() => {
    async function fetchVoices() {
      setIsLoading(true);
      try {
        const recommended = await fetchVoicesFromAPI("recommended");
        setVoices(recommended);
      } catch (error) {
        console.error("Failed to fetch voices:", error);
      }
      setIsLoading(false);
    }
    fetchVoices();
  }, []);

  // Filter voices
  const filteredVoices = useMemo(() => {
    return voices.filter((voice) => {
      const labels = parseVoiceLabels(voice);
      
      const matchesSearch = 
        voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.voice_id.toLowerCase() === searchQuery.toLowerCase();
      
      const matchesLanguage = selectedLanguage === "All" || 
        voice.labels?.language?.toLowerCase().includes(selectedLanguage.toLowerCase());
      
      const matchesAccent = selectedAccent === "All" || 
        labels.accent?.toLowerCase() === selectedAccent.toLowerCase();
      
      const matchesGender = selectedGender === "All" || 
        labels.gender?.toLowerCase() === selectedGender.toLowerCase();
      
      const matchesAge = selectedAge === "All" || 
        labels.age?.toLowerCase() === selectedAge.toLowerCase();
      
      const matchesCategory = selectedCategory === "All" || 
        voice.category?.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesLanguage && matchesAccent && matchesGender && matchesAge && matchesCategory;
    });
  }, [searchQuery, selectedLanguage, selectedAccent, selectedGender, selectedAge, selectedCategory, voices]);

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    const voice = voices.find(v => v.voice_id === voiceId);
    if (voice && onSelectVoice) {
      onSelectVoice({ id: voice.voice_id, name: voice.name });
      if (isModal && onClose) {
        onClose();
      }
    }
  };

  const handlePlayVoice = (voiceId: string) => {
    const voice = voices.find(v => v.voice_id === voiceId);
    if (!voice?.preview_url) return;

    if (playingVoiceId === voiceId) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      // Play new voice
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
    setSelectedAccent("All");
    setSelectedGender("All");
    setSelectedAge("All");
    setSelectedCategory("All");
  };

  const hasActiveFilters = 
    selectedLanguage !== "All" || 
    selectedAccent !== "All" || 
    selectedGender !== "All" || 
    selectedAge !== "All" || 
    selectedCategory !== "All";

  const content = (
    <div className="flex h-full flex-col">
      {/* Header */}
      {!isModal && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Voice Library</h1>
          <p className="text-muted-foreground">
            Explore and select from our collection of AI voices
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
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedAccent} onValueChange={setSelectedAccent}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Accent" />
            </SelectTrigger>
            <SelectContent>
              {accents.map((accent) => (
                <SelectItem key={accent} value={accent}>{accent}</SelectItem>
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
                <SelectItem key={age} value={age}>{age === "All" ? "All" : age.charAt(0).toUpperCase() + age.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat === "All" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
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

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading voices from API...
            </span>
          ) : (
            `Showing ${filteredVoices.length} of ${voices.length} voices`
          )}
        </p>
      </div>

      {/* Voice Grid */}
      <div className="grid flex-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {filteredVoices.map((voice) => {
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

      {filteredVoices.length === 0 && !isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No voices found</h3>
          <p className="mt-1 text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select a Voice</DialogTitle>
          </DialogHeader>
          <div className="h-[60vh] overflow-y-auto">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}
