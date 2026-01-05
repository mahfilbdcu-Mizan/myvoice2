import { useState, useEffect } from "react";
import { Download, Play, Pause, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { formatDistanceToNow, differenceInHours, parseISO } from "date-fns";

interface GenerationTask {
  id: string;
  voice_id: string;
  voice_name: string | null;
  input_text: string;
  words_count: number;
  model: string | null;
  status: string;
  progress: number | null;
  error_message: string | null;
  audio_url: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
}

interface ExternalTask {
  id: string;
  created_at: string;
  status: string;
  error_message: string | null;
  credit_cost: number;
  metadata: {
    audio_url?: string;
    srt_url?: string;
    json_url?: string;
  };
  progress: number;
  type: string;
}

export default function DashboardHistory() {
  const { user, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [externalTasks, setExternalTasks] = useState<ExternalTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState("local");
  const [externalPage, setExternalPage] = useState(1);
  const [externalTotal, setExternalTotal] = useState(0);

  useEffect(() => {
    if (user) {
      fetchTasks();
      // Subscribe to realtime updates
      const channel = supabase
        .channel('generation-tasks')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'generation_tasks',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setTasks(prev => [payload.new as GenerationTask, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setTasks(prev => 
                prev.map(t => t.id === payload.new.id ? payload.new as GenerationTask : t)
              );
            } else if (payload.eventType === 'DELETE') {
              setTasks(prev => prev.filter(t => t.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("generation_tasks")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTasks((data as GenerationTask[]) || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load generation history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExternalTasks = async (page = 1) => {
    setIsLoadingExternal(true);
    try {
      // Get user's API key
      const { data: keyData } = await supabase
        .from("user_api_keys")
        .select("encrypted_key")
        .eq("user_id", user?.id)
        .eq("provider", "ai33")
        .single();

      if (!keyData?.encrypted_key) {
        toast({
          title: "No API Key",
          description: "Add your API key to view external tasks",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            page, 
            limit: 20,
            apiKey: keyData.encrypted_key
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExternalTasks(data.data || []);
          setExternalTotal(data.total || 0);
          setExternalPage(page);
        }
      }
    } catch (error) {
      console.error("Error fetching external tasks:", error);
    } finally {
      setIsLoadingExternal(false);
    }
  };

  const handleDeleteExternalTask = async (taskId: string) => {
    try {
      // Get user's API key
      const { data: keyData } = await supabase
        .from("user_api_keys")
        .select("encrypted_key")
        .eq("user_id", user?.id)
        .eq("provider", "ai33")
        .single();

      if (!keyData?.encrypted_key) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-task`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            taskIds: [taskId],
            apiKey: keyData.encrypted_key
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Task Deleted",
          description: data.refund_credits ? `Refunded ${data.refund_credits} credits` : "Task removed",
        });
        fetchExternalTasks(externalPage);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const getTimeRemaining = (expiresAt: string | null): string | null => {
    if (!expiresAt) return null;
    const hours = differenceInHours(parseISO(expiresAt), new Date());
    if (hours <= 0) return "Expired";
    return `${hours}h remaining`;
  };

  const isExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return differenceInHours(parseISO(expiresAt), new Date()) <= 0;
  };

  const handlePlay = (task: GenerationTask) => {
    if (!task.audio_url) return;

    if (playingId === task.id && audioElement) {
      audioElement.pause();
      setPlayingId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(task.audio_url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    setAudioElement(audio);
    setPlayingId(task.id);
  };

  const handlePlayExternal = (url: string, taskId: string) => {
    if (playingId === taskId && audioElement) {
      audioElement.pause();
      setPlayingId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    setAudioElement(audio);
    setPlayingId(taskId);
  };

  const handleDownload = async (task: GenerationTask) => {
    if (!task.audio_url) return;

    try {
      const response = await fetch(task.audio_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${task.voice_name || 'voice'}-${task.id.slice(0, 8)}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the audio file",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, progress?: number | null, expiresAt?: string | null) => {
    switch (status) {
      case "done":
        if (expiresAt && isExpired(expiresAt)) {
          return <Badge variant="secondary">Expired</Badge>;
        }
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "doing":
      case "processing":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing {progress ? `${progress}%` : ''}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "error":
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Generation History</h1>
            <p className="text-muted-foreground">
              Your past voice generations. Downloads available for 72 hours.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v);
          if (v === "external" && externalTasks.length === 0) {
            fetchExternalTasks();
          }
        }}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="local">Local History</TabsTrigger>
              <TabsTrigger value="external">API Tasks</TabsTrigger>
            </TabsList>
            <Button 
              variant="outline" 
              onClick={() => activeTab === "local" ? fetchTasks() : fetchExternalTasks(externalPage)} 
              disabled={isLoading || isLoadingExternal}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${(isLoading || isLoadingExternal) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Local Tasks */}
          <TabsContent value="local" className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : tasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg">No generations yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Your voice generations will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Play Button */}
                      <div className="flex-shrink-0">
                        {task.status === "done" && task.audio_url && !isExpired(task.expires_at) ? (
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={() => handlePlay(task)}
                          >
                            {playingId === task.id ? (
                              <Pause className="h-5 w-5" />
                            ) : (
                              <Play className="h-5 w-5 ml-0.5" />
                            )}
                          </Button>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            {task.status === "processing" ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : task.status === "failed" ? (
                              <AlertCircle className="h-5 w-5 text-destructive" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {task.voice_name || task.voice_id}
                          </span>
                          {getStatusBadge(task.status, task.progress, task.expires_at)}
                          {task.expires_at && task.status === "done" && !isExpired(task.expires_at) && (
                            <span className="text-xs text-muted-foreground">
                              {getTimeRemaining(task.expires_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {task.input_text.slice(0, 200)}
                          {task.input_text.length > 200 ? "..." : ""}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{task.words_count} words</span>
                          <span>{task.model || "Default model"}</span>
                          <span>{formatDistanceToNow(parseISO(task.created_at), { addSuffix: true })}</span>
                        </div>
                        {task.error_message && (
                          <p className="text-sm text-destructive mt-2">{task.error_message}</p>
                        )}
                      </div>

                      {/* Download Button */}
                      {task.status === "done" && task.audio_url && !isExpired(task.expires_at) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(task)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* External API Tasks */}
          <TabsContent value="external" className="space-y-3">
            {isLoadingExternal ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : externalTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg">No API tasks</h3>
                  <p className="text-muted-foreground text-sm">
                    Tasks from your API key will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {externalTasks.map((task) => (
                  <Card key={task.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Play Button */}
                        <div className="flex-shrink-0">
                          {task.status === "done" && task.metadata?.audio_url ? (
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-12 w-12 rounded-full"
                              onClick={() => handlePlayExternal(task.metadata.audio_url!, task.id)}
                            >
                              {playingId === task.id ? (
                                <Pause className="h-5 w-5" />
                              ) : (
                                <Play className="h-5 w-5 ml-0.5" />
                              )}
                            </Button>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                              {task.status === "doing" ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              ) : task.status === "error" ? (
                                <AlertCircle className="h-5 w-5 text-destructive" />
                              ) : (
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">
                              {task.type.toUpperCase()} Task
                            </span>
                            {getStatusBadge(task.status, task.progress)}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{task.credit_cost} credits</span>
                            <span>{formatDistanceToNow(parseISO(task.created_at), { addSuffix: true })}</span>
                            <span className="font-mono text-xs">{task.id.slice(0, 8)}...</span>
                          </div>
                          {task.error_message && (
                            <p className="text-sm text-destructive mt-2">{task.error_message}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {task.metadata?.audio_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(task.metadata.audio_url, '_blank')}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteExternalTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {externalTotal > 20 && (
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={externalPage <= 1}
                      onClick={() => fetchExternalTasks(externalPage - 1)}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      Page {externalPage} of {Math.ceil(externalTotal / 20)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={externalPage >= Math.ceil(externalTotal / 20)}
                      onClick={() => fetchExternalTasks(externalPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
