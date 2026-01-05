import { useState, useRef } from "react";
import { Music, Loader2, Download, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { waitForTask } from "@/lib/voice-api";
import { toast } from "@/hooks/use-toast";

const styles = [
  { id: "1", name: "Pop" },
  { id: "2", name: "Urban" },
  { id: "3", name: "Rock" },
  { id: "4", name: "Hip Hop" },
  { id: "5", name: "Electronic" },
  { id: "6", name: "Reggae" },
  { id: "7", name: "Blues" },
  { id: "8", name: "Jazz" },
  { id: "9", name: "Folk" },
  { id: "10", name: "Country" },
  { id: "11", name: "Classical" },
  { id: "12", name: "R&B" },
  { id: "13", name: "Disco" },
  { id: "15", name: "Experimental" },
  { id: "17", name: "World" },
  { id: "18", name: "Ethnic" },
];

const moods = [
  { id: "1", name: "Relaxed" },
  { id: "2", name: "Happy" },
  { id: "3", name: "Energetic" },
  { id: "4", name: "Romantic" },
  { id: "5", name: "Sad" },
  { id: "6", name: "Angry" },
  { id: "7", name: "Inspired" },
  { id: "8", name: "Warm" },
  { id: "9", name: "Passionate" },
  { id: "10", name: "Joyful" },
  { id: "11", name: "Longing" },
];

const scenarios = [
  { id: "1", name: "Coffee shop" },
  { id: "2", name: "Solitary walk" },
  { id: "3", name: "Travel" },
  { id: "4", name: "Sunset by the sea" },
  { id: "5", name: "Quiet evening" },
  { id: "6", name: "Late-night bar" },
  { id: "7", name: "Urban romance" },
  { id: "8", name: "City nightlife" },
  { id: "9", name: "Rainy night" },
  { id: "10", name: "Sunlit Shores" },
];

export function MusicGenerationPanel() {
  const [mode, setMode] = useState<"idea" | "lyrics">("idea");
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [styleId, setStyleId] = useState("");
  const [moodId, setMoodId] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [numTracks, setNumTracks] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ audioUrl: string; coverUrl?: string }>>([]);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerate = async () => {
    if (mode === "idea" && idea.length < 20) {
      toast({
        title: "Idea too short",
        description: "Please provide at least 20 characters for your music idea",
        variant: "destructive",
      });
      return;
    }

    if (mode === "lyrics" && lyrics.length < 50) {
      toast({
        title: "Lyrics too short",
        description: "Please provide at least 50 characters for your lyrics",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setTaskStatus("Starting...");
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('music-generation', {
        body: {
          title: title || undefined,
          idea: mode === "idea" ? idea : undefined,
          lyrics: mode === "lyrics" ? lyrics : undefined,
          styleId: styleId || undefined,
          moodId: moodId || undefined,
          scenarioId: scenarioId || undefined,
          n: parseInt(numTracks),
        }
      });

      if (error) throw error;

      if (data?.task_id) {
        setTaskStatus("Generating music...");
        const task = await waitForTask(data.task_id, 120, 3000);

        if (task?.status === "done" && task.metadata) {
          const audioUrls = Array.isArray(task.metadata.audio_url) 
            ? task.metadata.audio_url 
            : [task.metadata.audio_url];
          const coverUrls = Array.isArray(task.metadata.cover_url) 
            ? task.metadata.cover_url 
            : [task.metadata.cover_url];

          const newResults = audioUrls.map((url: string, i: number) => ({
            audioUrl: url,
            coverUrl: coverUrls[i],
          }));

          setResults(newResults);
          toast({
            title: "Music generated!",
            description: `${newResults.length} track(s) created successfully.`,
          });
        } else if (task?.status === "failed") {
          throw new Error(task.error_message || "Generation failed");
        }
      }
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setTaskStatus(null);
    }
  };

  const togglePlay = (index: number) => {
    if (playingIndex === index) {
      audioRef.current?.pause();
      setPlayingIndex(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = results[index].audioUrl;
        audioRef.current.play();
        setPlayingIndex(index);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Music Generation</h2>
        <p className="text-muted-foreground">
          Generate original music with AI (Minimax)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label>Song Title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Amazing Song"
              maxLength={40}
            />
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "idea" | "lyrics")}>
            <TabsList className="w-full">
              <TabsTrigger value="idea" className="flex-1">From Idea</TabsTrigger>
              <TabsTrigger value="lyrics" className="flex-1">From Lyrics</TabsTrigger>
            </TabsList>

            <TabsContent value="idea" className="mt-4">
              <div className="space-y-2">
                <Label>Music Idea (20-300 chars)</Label>
                <Textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="A relaxing jazz piece for a quiet evening with soft piano and smooth saxophone..."
                  className="min-h-[120px]"
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground">{idea.length}/300</p>
              </div>
            </TabsContent>

            <TabsContent value="lyrics" className="mt-4">
              <div className="space-y-2">
                <Label>Lyrics (50-3000 chars)</Label>
                <Textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="Write your song lyrics here..."
                  className="min-h-[120px]"
                  maxLength={3000}
                />
                <p className="text-xs text-muted-foreground">{lyrics.length}/3000</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Style</Label>
              <Select value={styleId} onValueChange={setStyleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {styles.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mood</Label>
              <Select value={moodId} onValueChange={setMoodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  {moods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Scenario</Label>
              <Select value={scenarioId} onValueChange={setScenarioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scenario" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Number of Tracks</Label>
              <Select value={numTracks} onValueChange={setNumTracks}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Track</SelectItem>
                  <SelectItem value="2">2 Tracks</SelectItem>
                  <SelectItem value="3">3 Tracks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {taskStatus}
              </>
            ) : (
              <>
                <Music className="h-5 w-5" />
                Generate Music
              </>
            )}
          </Button>
        </div>

        {/* Results Section */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold">Generated Tracks</h3>

          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-lg border border-border p-4"
                >
                  {result.coverUrl && (
                    <img
                      src={result.coverUrl}
                      alt={`Track ${index + 1} cover`}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">Track {index + 1}</p>
                    <p className="text-sm text-muted-foreground">
                      {title || "Generated music"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePlay(index)}
                  >
                    {playingIndex === index ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = result.audioUrl;
                      a.download = `music-${title || 'track'}-${index + 1}-${Date.now()}.mp3`;
                      a.click();
                    }}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <p>Generated music will appear here</p>
            </div>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        onEnded={() => setPlayingIndex(null)}
        className="hidden"
      />
    </div>
  );
}
