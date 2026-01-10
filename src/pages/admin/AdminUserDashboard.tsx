import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, User, Key, Clock, Mic } from "lucide-react";
import { getUserProfileForAdmin, type UserProfile } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface GenerationTask {
  id: string;
  voice_name: string | null;
  input_text: string;
  status: string;
  audio_url: string | null;
  created_at: string;
  words_count: number;
}

interface UserApiKey {
  id: string;
  provider: string;
  is_valid: boolean | null;
  remaining_credits: number | null;
  created_at: string;
}

export default function AdminUserDashboard() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    // Fetch user profile
    const profileData = await getUserProfileForAdmin(userId);
    if (profileData) {
      setUser(profileData);
    }
    
    // Fetch generation tasks
    const { data: tasksData } = await supabase
      .from("generation_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (tasksData) {
      setTasks(tasksData);
    }
    
    // Fetch API keys
    const { data: keysData } = await supabase
      .from("user_api_keys")
      .select("id, provider, is_valid, remaining_credits, created_at")
      .eq("user_id", userId);
    
    if (keysData) {
      setApiKeys(keysData);
    }
    
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">User not found</h2>
          <Button onClick={() => navigate("/admin/users")} className="mt-4">
            Back to Users
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{user.full_name || user.email || "User"}'s Dashboard</h1>
            <p className="text-muted-foreground">View user's data and activity</p>
          </div>
          {user.is_blocked && (
            <Badge variant="destructive" className="text-sm">Blocked</Badge>
          )}
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="font-medium">{user.credits.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={user.is_blocked ? "destructive" : "outline"}>
                  {user.is_blocked ? "Blocked" : "Active"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Free Credits</p>
                <Badge variant={user.has_received_free_credits ? "secondary" : "outline"}>
                  {user.has_received_free_credits ? "Received" : "Not Received"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different data */}
        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Generation History ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="apikeys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys ({apiKeys.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No generation history found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Voice</TableHead>
                        <TableHead>Text Preview</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Words</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mic className="h-4 w-4 text-muted-foreground" />
                              {task.voice_name || "Unknown"}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {task.input_text.substring(0, 50)}...
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                task.status === "done" ? "default" : 
                                task.status === "error" ? "destructive" : 
                                "secondary"
                              }
                            >
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{task.words_count}</TableCell>
                          <TableCell>
                            {new Date(task.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apikeys" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No API keys configured
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remaining Credits</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium uppercase">
                            {key.provider}
                          </TableCell>
                          <TableCell>
                            <Badge variant={key.is_valid ? "default" : "destructive"}>
                              {key.is_valid ? "Valid" : "Invalid"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {key.remaining_credits?.toLocaleString() || "N/A"}
                          </TableCell>
                          <TableCell>
                            {new Date(key.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
