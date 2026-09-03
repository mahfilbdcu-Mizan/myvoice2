import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BlockedUserGuard } from "@/components/BlockedUserGuard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImageIcon, Download, Clock, Sparkles } from "lucide-react";

interface ImageModel {
  model_id: string;
  max_generations?: number;
  max_prompt_length?: number;
  aspect_ratios?: string[];
  default_aspect_ratio?: string;
  resolutions?: string[];
  default_resolution?: string;
  qualities?: string[];
  default_quality?: string;
  eta_seconds?: number;
  presented_credits?: number;
}

interface GeneratedImage {
  imageUrl?: string;
  previewUrl?: string;
  width?: number;
  height?: number;
}

interface ImageTask {
  id: string;
  prompt: string;
  model_id: string;
  status: string;
  progress: number;
  images: GeneratedImage[] | null;
  credits_charged: number;
  error_message: string | null;
  created_at: string;
  expires_at: string;
}

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "মেয়াদ শেষ";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}ঘ ${minutes}মি বাকি`;
}

export default function DashboardImages() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [models, setModels] = useState<ImageModel[]>([]);
  const [modelId, setModelId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<string>("");
  const [resolution, setResolution] = useState<string>("");
  const [generations, setGenerations] = useState<string>("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTask, setActiveTask] = useState<ImageTask | null>(null);
  const [history, setHistory] = useState<ImageTask[]>([]);

  const selectedModel = useMemo(
    () => models.find((m) => m.model_id === modelId),
    [models, modelId],
  );

  useEffect(() => {
    const loadModels = async () => {
      const { data, error } = await supabase.functions.invoke("fetch-image-models");
      if (error || !data?.models?.length) return;
      setModels(data.models);
      const first = data.models[0];
      setModelId(first.model_id);
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!selectedModel) return;
    setAspectRatio(selectedModel.default_aspect_ratio || selectedModel.aspect_ratios?.[0] || "");
    setResolution(selectedModel.default_resolution || selectedModel.resolutions?.[0] || "");
  }, [selectedModel]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("image_generations")
      .select("*")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(30);
    setHistory((data as unknown as ImageTask[]) || []);
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const pollTask = async (id: string) => {
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const { data, error } = await supabase.functions.invoke("get-image-task", { body: { id } });
      if (error) continue;
      const task = data?.task as ImageTask | undefined;
      if (!task) continue;
      setActiveTask(task);
      if (task.status === "completed") {
        toast({ title: "ইমেজ তৈরি হয়েছে", description: `${task.credits_charged} ক্রেডিট কাটা হয়েছে` });
        loadHistory();
        return;
      }
      if (task.status === "failed") {
        toast({
          title: "ব্যর্থ হয়েছে",
          description: task.error_message || "ইমেজ তৈরি করা যায়নি",
          variant: "destructive",
        });
        loadHistory();
        return;
      }
    }
    toast({ title: "সময় শেষ", description: "ইমেজ তৈরি হতে অনেক সময় নিচ্ছে", variant: "destructive" });
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !modelId) return;
    setIsGenerating(true);
    setActiveTask(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: prompt.trim(),
          model_id: modelId,
          aspect_ratio: aspectRatio || undefined,
          resolution: resolution || undefined,
          generations: Number(generations),
        },
      });

      if (error) {
        const message =
          (error as any)?.context?.body?.error ||
          error.message ||
          "ইমেজ তৈরি করা যায়নি";
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      toast({ title: "জেনারেশন শুরু হয়েছে", description: `${data.credits_charged} ক্রেডিট কাটা হয়েছে` });
      await loadHistory();
      await pollTask(data.id);
    } catch (e: any) {
      toast({ title: "ব্যর্থ হয়েছে", description: e.message, variant: "destructive" });
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

  const estimatedCost = (selectedModel?.presented_credits || 0) * Number(generations || 1);

  return (
    <DashboardLayout>
      <BlockedUserGuard featureName="Image Generation">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">AI Image Generation</h1>
            <p className="text-muted-foreground">
              টেক্সট থেকে ইমেজ তৈরি করুন — ডাউনলোড লিংক ৪৮ ঘণ্টা পর্যন্ত থাকবে
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Image</CardTitle>
              <CardDescription>মডেল বেছে নিন এবং আপনার আইডিয়া লিখুন</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.model_id} value={m.model_id}>
                        {m.model_id}
                        {m.presented_credits ? ` — ${m.presented_credits} credits` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Image Description</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to create..."
                  rows={4}
                  maxLength={selectedModel?.max_prompt_length || 4000}
                />
                <p className="text-xs text-muted-foreground">
                  {prompt.length} / {selectedModel?.max_prompt_length || 4000}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {!!selectedModel?.aspect_ratios?.length && (
                  <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedModel.aspect_ratios.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!!selectedModel?.resolutions?.length && (
                  <div className="space-y-2">
                    <Label>Resolution</Label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedModel.resolutions.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Images</Label>
                  <Select value={generations} onValueChange={setGenerations}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: selectedModel?.max_generations || 1 }, (_, i) => i + 1).map(
                        (n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {estimatedCost > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  আনুমানিক খরচ: <span className="font-semibold">{estimatedCost} ক্রেডিট</span>
                </div>
              )}

              {activeTask && activeTask.status === "processing" && (
                <div className="space-y-2">
                  <Progress value={activeTask.progress} />
                  <p className="text-center text-sm text-muted-foreground">
                    তৈরি হচ্ছে... {activeTask.progress}%
                  </p>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || !modelId}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Images</CardTitle>
              <CardDescription>ইমেজগুলো ৪৮ ঘণ্টা পর অটোমেটিক মুছে যাবে</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">এখনো কোনো ইমেজ নেই</p>
              ) : (
                <div className="space-y-6">
                  {history.map((task) => (
                    <div key={task.id} className="space-y-3 rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium">{task.prompt}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{task.model_id}</Badge>
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {timeLeft(task.expires_at)}
                          </Badge>
                        </div>
                      </div>

                      {task.status === "completed" && task.images?.length ? (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          {task.images.map((img, idx) => (
                            <div key={idx} className="space-y-2">
                              <img
                                src={img.previewUrl || img.imageUrl}
                                alt={`Generated image ${idx + 1} for ${task.prompt}`}
                                loading="lazy"
                                className="w-full rounded-md border object-cover"
                              />
                              <Button size="sm" variant="outline" className="w-full" asChild>
                                <a href={img.imageUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="mr-1 h-4 w-4" /> Download
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : task.status === "failed" ? (
                        <p className="text-sm text-destructive">
                          {task.error_message || "ইমেজ তৈরি করা যায়নি"}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">প্রসেস হচ্ছে...</p>
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
