import { useState, useEffect } from "react";
import { Download, Play, Pause, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BlockedUserGuard } from "@/components/BlockedUserGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

export default function DashboardHistory() {
  const { user, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

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

  const getFirstLine = (text: string): string => {
    // Get first line or first 50 characters, clean for filename
    const firstLine = text.split(/[\n\r]/)[0].trim();
    const truncated = firstLine.length > 50 ? firstLine.slice(0, 50) : firstLine;
    // Remove invalid filename characters
    return truncated.replace(/[<>:"/\\|?*]/g, '').trim() || 'voice';
  };

  const handleDownload = async (task: GenerationTask) => {
    if (!task.audio_url) return;

    try {
      const response = await fetch(task.audio_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Use first line of text as filename
      const fileName = getFirstLine(task.input_text);
      a.download = `${fileName}.mp3`;
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

  const handleRetry = async (task: GenerationTask) => {
    try {
      toast({
        title: "Retrying...",
        description: "Regenerating speech with the same settings",
      });
      
      // Delete the failed task
      await supabase
        .from("generation_tasks")
        .delete()
        .eq("id", task.id);
      
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Re-generate
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: token ? `Bearer ${token}` : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: task.input_text,
            voiceId: task.voice_id,
            voiceName: task.voice_name,
            model: task.model,
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to retry");
      }
      
      toast({
        title: "Retry started",
        description: "Your speech is being generated again",
      });
      
      // Refresh list
      fetchTasks();
    } catch (error) {
      console.error("Retry error:", error);
      toast({
        title: "Retry failed",
        description: error instanceof Error ? error.message : "Could not retry generation",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (taskId: string) => {
    // Optimistic UI update - remove immediately from UI
    const previousTasks = tasks;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    // Stop audio if playing this task
    if (playingId === taskId && audioElement) {
      audioElement.pause();
      setPlayingId(null);
    }
    
    try {
      const { error } = await supabase
        .from("generation_tasks")
        .delete()
        .eq("id", taskId);
      
      if (error) throw error;
      
      toast({
        title: "Deleted",
        description: "Task removed from history",
      });
    } catch (error) {
      // Revert on error
      setTasks(previousTasks);
      toast({
        title: "Delete failed",
        description: "Could not delete the task",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (task: GenerationTask) => {
    switch (task.status) {
      case "done":
        if (task.expires_at && isExpired(task.expires_at)) {
          return <Badge variant="secondary">Expired</Badge>;
        }
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing {task.progress ? `${task.progress}%` : ''}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{task.status}</Badge>;
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
      <BlockedUserGuard featureName="Generation History">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Generation History</h1>
            <p className="text-muted-foreground">
              Your past voice generations. Downloads available for 72 hours.
            </p>
          </div>
          <Button variant="outline" onClick={fetchTasks} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Tasks List */}
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
          <div className="space-y-3">
            {tasks.map((task) => (
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
                          {getFirstLine(task.input_text)}
                        </span>
                        {getStatusBadge(task)}
                        {task.expires_at && task.status === "done" && !isExpired(task.expires_at) && (
                          <span className="text-xs text-muted-foreground">
                            {getTimeRemaining(task.expires_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Voice: {task.voice_name || task.voice_id}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {task.input_text.slice(0, 200)}
                        {task.input_text.length > 200 ? "..." : ""}
                      </p>
                      
                      {/* Progress Bar for Processing Tasks */}
                      {(task.status === "processing" || task.status === "pending") && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              {task.status === "pending" ? "Waiting..." : "Generating..."}
                            </span>
                            <span className="text-xs font-medium text-primary">
                              {task.progress || 0}%
                            </span>
                          </div>
                          <Progress value={task.progress || 0} className="h-2" />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{task.words_count} words</span>
                        <span>{task.model || "Default model"}</span>
                        <span>{formatDistanceToNow(parseISO(task.created_at), { addSuffix: true })}</span>
                      </div>
                      {task.error_message && (
                        <p className="text-sm text-destructive mt-2">{task.error_message}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
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
                      
                      {/* Retry Button for failed/expired tasks */}
                      {(task.status === "failed" || (task.status === "done" && task.expires_at && isExpired(task.expires_at))) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(task)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </Button>
                      )}
                      
                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </BlockedUserGuard>
    </DashboardLayout>
  );
}