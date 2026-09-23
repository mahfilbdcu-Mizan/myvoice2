import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BlockedUserGuard } from "@/components/BlockedUserGuard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Music2, Download, Clock } from "lucide-react";

interface MusicTrack {
  audio_url?: string;
  cover_url?: string | null;
  title?: string;
}

interface MusicTask {
  id: string;
  title: string | null;
  idea: string | null;
  tags: string | null;
  create_mode: string;
  status: string;
  progress: number;
  tracks: MusicTrack[] | null;
  credits_charged: number;
  error_message: string | null;
  created_at: string;
  expires_at: string;
}

const MUSIC_COST = 3600;

const IDEA_SUGGESTIONS = [
  "progressive folk",
  "dance-punk",
  "soulful samples",
  "stirring",
  "house funk",
];

const STYLE_SUGGESTIONS = [
  "Dreamy",
  "Atmospheric",
  "Cinematic",
  "Upbeat",
  "Melancholic",
  "Lo-fi",
  "Orchestral",
  "Acoustic",
  "Ethereal",
  "Funky",
  "Groovy",
  "Ambient",
];

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m left`;
}

export default function DashboardMusic() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<"simple" | "custom">("simple");
  const [idea, setIdea] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [tags, setTags] = useState("");
  const [vocalGender, setVocalGender] = useState<string>("any");

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTask, setActiveTask] = useState<MusicTask | null>(null);
  const [history, setHistory] = useState<MusicTask[]>([]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("music_generations")
      .select("*")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(30);
    setHistory((data as unknown as MusicTask[]) || []);
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const pollTask = async (id: string) => {
    for (let i = 0; i < 200; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const { data, error } = await supabase.functions.invoke("get-music-task", { body: { id } });
      if (error) continue;
      const task = data?.task as MusicTask | undefined;
      if (!task) continue;
      setActiveTask(task);
      if (task.status === "completed") {
        toast({ title: "Song ready", description: `${task.credits_charged} credits used` });
        loadHistory();
        return;
      }
      if (task.status === "failed") {
        toast({
          title: "Generation failed",
          description: task.error_message || "Could not generate the song",
          variant: "destructive",
        });
        loadHistory();
        return;
      }
    }
    toast({
      title: "Still processing",
      description: "The song is taking longer than usual. Check back in a moment.",
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setActiveTask(null);
    try {
      const body =
        mode === "simple"
          ? {
              create_mode: "simple",
              idea: idea.trim(),
              make_instrumental: instrumental,
            }
          : {
              create_mode: "custom",
              title: title.trim(),
              lyrics: lyrics.trim(),
              tags: tags.trim(),
              vocal_gender: vocalGender === "any" ? "" : vocalGender,
            };

      const { data, error } = await supabase.functions.invoke("generate-music", { body });

      if (error) {
        const message =
          (error as any)?.context?.body?.error || error.message || "Could not generate the song";
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      toast({ title: "Generation started", description: `${data.credits_charged} credits used` });
      await loadHistory();
      await pollTask(data.id);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const canSubmit =
    mode === "simple" ? idea.trim().length > 0 : lyrics.trim().length > 0 || tags.trim().length > 0;

  return (
    <DashboardLayout>
      <BlockedUserGuard featureName="Music Generation">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Music 2</h1>
            <p className="text-muted-foreground">
              Create full songs from an idea or your own lyrics — downloads stay available for 48 hours
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Song</CardTitle>
              <CardDescription>Describe your song or write the lyrics yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "simple" | "custom")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="simple">Simple</TabsTrigger>
                  <TabsTrigger value="custom">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="simple" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Song Description</Label>
                    <Textarea
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="Percussive indie pop song about the border between two lives"
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">{idea.length} / 500</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {IDEA_SUGGESTIONS.map((chip) => (
                        <Badge
                          key={chip}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            setIdea((prev) => (prev.trim() ? `${prev.trim()}, ${chip}` : chip))
                          }
                        >
                          {chip}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>Instrumental</Label>
                      <p className="text-xs text-muted-foreground">Create the song without vocals</p>
                    </div>
                    <Switch checked={instrumental} onCheckedChange={setInstrumental} />
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Border Lights"
                      maxLength={80}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Lyrics</Label>
                    <Textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder={"[Verse 1]\nI walk the line between two lives"}
                      rows={7}
                      maxLength={5000}
                    />
                    <p className="text-xs text-muted-foreground">{lyrics.length} / 5000</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Textarea
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="indie pop, emotional, cinematic drums"
                      rows={2}
                      maxLength={1000}
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {STYLE_SUGGESTIONS.map((style) => (
                        <Badge
                          key={style}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            setTags((prev) => (prev.trim() ? `${prev.trim()}, ${style}` : style))
                          }
                        >
                          {style}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Vocal Gender</Label>
                    <Select value={vocalGender} onValueChange={setVocalGender}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="f">Female</SelectItem>
                        <SelectItem value="m">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                <Music2 className="h-4 w-4 text-primary" />
                Cost: <span className="font-semibold">{MUSIC_COST} credits</span>
                <span className="text-muted-foreground">(2 songs per generation)</span>
              </div>

              {activeTask && activeTask.status === "processing" && (
                <div className="space-y-2">
                  <Progress value={activeTask.progress} />
                  <p className="text-center text-sm text-muted-foreground">
                    Generating... {activeTask.progress}%
                  </p>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !canSubmit}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Music2 className="mr-2 h-4 w-4" />
                    Generate Song
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Songs</CardTitle>
              <CardDescription>Songs are deleted automatically after 48 hours</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No songs yet</p>
              ) : (
                <div className="space-y-6">
                  {history.map((task) => (
                    <div key={task.id} className="space-y-3 rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium">
                          {task.title || task.idea || task.tags || "Untitled Song"}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{task.create_mode}</Badge>
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {timeLeft(task.expires_at)}
                          </Badge>
                        </div>
                      </div>

                      {task.status === "completed" && task.tracks?.length ? (
                        <div className="space-y-3">
                          {task.tracks.map((track, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center"
                            >
                              {track.cover_url && (
                                <img
                                  src={track.cover_url}
                                  alt={`Cover art for ${track.title || "generated song"}`}
                                  loading="lazy"
                                  className="h-16 w-16 rounded object-cover"
                                />
                              )}
                              <div className="min-w-0 flex-1 space-y-2">
                                <p className="truncate text-sm font-medium">
                                  {track.title || "Untitled Song"}
                                </p>
                                <audio controls src={track.audio_url} className="w-full" />
                              </div>
                              <Button size="sm" variant="outline" asChild>
                                <a href={track.audio_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="mr-1 h-4 w-4" /> Download
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : task.status === "failed" ? (
                        <p className="text-sm text-destructive">
                          {task.error_message || "Could not generate the song"}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Processing...</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </BlockedUserGuard>
    </DashboardLayout>
  );
}
