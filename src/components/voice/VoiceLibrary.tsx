import { useState, useMemo } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface Voice {
  id: string;
  name: string;
  accent: string;
  gender: string;
  age: string;
  languages: string[];
  category: string;
  previewUrl?: string;
}

// Mock voices data
const mockVoices: Voice[] = [
  { id: "1", name: "Sarah", accent: "American", gender: "Female", age: "Young", languages: ["English"], category: "Conversational" },
  { id: "2", name: "Roger", accent: "British", gender: "Male", age: "Middle-aged", languages: ["English"], category: "Narration" },
  { id: "3", name: "Alice", accent: "American", gender: "Female", age: "Young", languages: ["English", "Spanish"], category: "News" },
  { id: "4", name: "Brian", accent: "British", gender: "Male", age: "Middle-aged", languages: ["English"], category: "Documentary" },
  { id: "5", name: "Lily", accent: "Australian", gender: "Female", age: "Young", languages: ["English"], category: "Conversational" },
  { id: "6", name: "George", accent: "British", gender: "Male", age: "Senior", languages: ["English"], category: "Audiobook" },
  { id: "7", name: "Emma", accent: "American", gender: "Female", age: "Middle-aged", languages: ["English", "French"], category: "Corporate" },
  { id: "8", name: "Daniel", accent: "Irish", gender: "Male", age: "Young", languages: ["English"], category: "Conversational" },
  { id: "9", name: "Charlotte", accent: "British", gender: "Female", age: "Young", languages: ["English", "German"], category: "News" },
  { id: "10", name: "William", accent: "American", gender: "Male", age: "Young", languages: ["English"], category: "Gaming" },
  { id: "11", name: "Jessica", accent: "American", gender: "Female", age: "Middle-aged", languages: ["English"], category: "Corporate" },
  { id: "12", name: "Eric", accent: "American", gender: "Male", age: "Young", languages: ["English", "Spanish"], category: "Conversational" },
];

const languages = ["All", "English", "Spanish", "French", "German", "Italian", "Portuguese"];
const accents = ["All", "American", "British", "Australian", "Irish"];
const genders = ["All", "Male", "Female"];
const ages = ["All", "Young", "Middle-aged", "Senior"];
const categories = ["All", "Conversational", "Narration", "News", "Documentary", "Audiobook", "Corporate", "Gaming"];

interface VoiceLibraryProps {
  onSelectVoice?: (voice: Voice) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export function VoiceLibrary({ onSelectVoice, isModal = false, onClose }: VoiceLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedAccent, setSelectedAccent] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedAge, setSelectedAge] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [showVoiceIdPopup, setShowVoiceIdPopup] = useState(false);
  const [foundVoice, setFoundVoice] = useState<Voice | null>(null);

  // Check if search query is a voice ID
  const isVoiceId = searchQuery.length > 10 && !searchQuery.includes(" ");

  // Filter voices
  const filteredVoices = useMemo(() => {
    return mockVoices.filter((voice) => {
      const matchesSearch = 
        voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.id.toLowerCase() === searchQuery.toLowerCase();
      const matchesLanguage = selectedLanguage === "All" || voice.languages.includes(selectedLanguage);
      const matchesAccent = selectedAccent === "All" || voice.accent === selectedAccent;
      const matchesGender = selectedGender === "All" || voice.gender === selectedGender;
      const matchesAge = selectedAge === "All" || voice.age === selectedAge;
      const matchesCategory = selectedCategory === "All" || voice.category === selectedCategory;

      return matchesSearch && matchesLanguage && matchesAccent && matchesGender && matchesAge && matchesCategory;
    });
  }, [searchQuery, selectedLanguage, selectedAccent, selectedGender, selectedAge, selectedCategory]);

  // Check for voice ID match
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Check if it's a voice ID
    if (value.length > 10 && !value.includes(" ")) {
      const found = mockVoices.find(v => v.id.toLowerCase() === value.toLowerCase());
      if (found) {
        setFoundVoice(found);
        setShowVoiceIdPopup(true);
      }
    } else {
      setShowVoiceIdPopup(false);
      setFoundVoice(null);
    }
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    const voice = mockVoices.find(v => v.id === voiceId);
    if (voice && onSelectVoice) {
      onSelectVoice(voice);
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
          Showing {filteredVoices.length} of {mockVoices.length} voices
        </p>
      </div>

      {/* Voice Grid */}
      <div className="grid flex-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {filteredVoices.map((voice) => (
          <VoiceCard
            key={voice.id}
            id={voice.id}
            name={voice.name}
            accent={voice.accent}
            gender={voice.gender}
            age={voice.age}
            languages={voice.languages}
            category={voice.category}
            isSelected={selectedVoiceId === voice.id}
            onSelect={handleVoiceSelect}
          />
        ))}
      </div>

      {filteredVoices.length === 0 && (
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
