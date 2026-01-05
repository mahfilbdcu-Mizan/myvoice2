import { useState, useMemo, useEffect } from "react";
import { Search, X } from "lucide-react";
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
import { getVoices, getVoiceById, type Voice } from "@/lib/voice-api";

const languages = ["All", "English", "Spanish", "French", "German", "Italian", "Portuguese"];
const accents = ["All", "American", "British", "Australian", "Irish"];
const genders = ["All", "Male", "Female"];
const ages = ["All", "Young", "Middle-aged", "Senior"];
const categories = ["All", "Conversational", "Narration", "News", "Documentary", "Audiobook", "Corporate", "Gaming"];

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
  const [showVoiceIdPopup, setShowVoiceIdPopup] = useState(false);
  const [foundVoice, setFoundVoice] = useState<Voice | null>(null);

  // Fetch voices on mount
  useEffect(() => {
    async function fetchVoices() {
      setIsLoading(true);
      const data = await getVoices();
      setVoices(data);
      setIsLoading(false);
    }
    fetchVoices();
  }, []);

  // Check if search query is a voice ID (long alphanumeric string)
  const isVoiceId = searchQuery.length > 10 && !searchQuery.includes(" ");

  // Filter voices
  const filteredVoices = useMemo(() => {
    return voices.filter((voice) => {
      const matchesSearch = 
        voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.id.toLowerCase() === searchQuery.toLowerCase();
      const matchesLanguage = selectedLanguage === "All" || (voice.languages?.includes(selectedLanguage) ?? false);
      const matchesAccent = selectedAccent === "All" || voice.accent === selectedAccent;
      const matchesGender = selectedGender === "All" || voice.gender === selectedGender;
      const matchesAge = selectedAge === "All" || voice.age === selectedAge;
      const matchesCategory = selectedCategory === "All" || voice.category === selectedCategory;

      return matchesSearch && matchesLanguage && matchesAccent && matchesGender && matchesAge && matchesCategory;
    });
  }, [searchQuery, selectedLanguage, selectedAccent, selectedGender, selectedAge, selectedCategory, voices]);

  // Check for voice ID match
  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    
    // Check if it's a voice ID
    if (value.length > 10 && !value.includes(" ")) {
      // First check local voices
      let found = voices.find(v => v.id.toLowerCase() === value.toLowerCase());
      
      // If not found locally, try to fetch from API
      if (!found) {
        found = await getVoiceById(value) ?? undefined;
      }
      
      if (found) {
        setFoundVoice(found);
        setShowVoiceIdPopup(true);
      } else {
        setShowVoiceIdPopup(false);
        setFoundVoice(null);
      }
    } else {
      setShowVoiceIdPopup(false);
      setFoundVoice(null);
    }
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    const voice = voices.find(v => v.id === voiceId) || foundVoice;
    if (voice && onSelectVoice) {
      onSelectVoice({ id: voice.id, name: voice.name });
      if (isModal && onClose) {
        onClose();
      }
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
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or paste a Voice ID..."
            className="pl-10"
          />
        </div>

        {/* Voice ID Popup */}
        {showVoiceIdPopup && foundVoice && (
          <div className="animate-scale-in rounded-xl border border-primary bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-lg">🎤</span>
                </div>
                <div>
                  <p className="font-semibold">{foundVoice.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {foundVoice.accent} · {foundVoice.gender} · {foundVoice.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  Preview
                </Button>
                <Button size="sm" onClick={() => handleVoiceSelect(foundVoice.id)}>
                  Use this voice
                </Button>
              </div>
            </div>
          </div>
        )}

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
                <SelectItem key={gender} value={gender}>{gender}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedAge} onValueChange={setSelectedAge}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Age" />
            </SelectTrigger>
            <SelectContent>
              {ages.map((age) => (
                <SelectItem key={age} value={age}>{age}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
          {isLoading ? "Loading voices..." : `Showing ${filteredVoices.length} of ${voices.length} voices`}
        </p>
      </div>

      {/* Voice Grid */}
      <div className="grid flex-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {filteredVoices.map((voice) => (
          <VoiceCard
            key={voice.id}
            id={voice.id}
            name={voice.name}
            accent={voice.accent || undefined}
            gender={voice.gender || undefined}
            age={voice.age || undefined}
            languages={voice.languages || undefined}
            category={voice.category || undefined}
            isSelected={selectedVoiceId === voice.id}
            onSelect={handleVoiceSelect}
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
