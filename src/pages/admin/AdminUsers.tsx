import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Edit, Loader2, AlertTriangle, Eye, Ban, CheckCircle, Key } from "lucide-react";
import { getAllUsers, updateUserCredits, toggleUserBlock, setUserApiKey, type UserProfile } from "@/lib/admin-api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Credit validation constants
const MAX_CREDITS = 100_000_000; // 100 million max
const WARN_THRESHOLD = 10_000_000; // 10 million - show warning
const LARGE_CHANGE_THRESHOLD = 1_000_000; // 1 million - require confirmation

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newCredits, setNewCredits] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [togglingBlock, setTogglingBlock] = useState<string | null>(null);
  
  // API Key dialog state
  const [apiKeyUser, setApiKeyUser] = useState<UserProfile | null>(null);
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [isSettingApiKey, setIsSettingApiKey] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setFilteredUsers(data);
    setIsLoading(false);
  };

  const handleEditCredits = (user: UserProfile) => {
    setEditingUser(user);
    setNewCredits(user.credits.toString());
  };

  const handleSaveCredits = async () => {
    if (!editingUser) return;

    const credits = parseInt(newCredits, 10);
    
    // Validate: must be a valid number
    if (isNaN(credits)) {
      toast({
        title: "Invalid credits",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }
    
    // Validate: must be non-negative
    if (credits < 0) {
      toast({
        title: "Invalid credits",
        description: "Credits cannot be negative",
        variant: "destructive",
      });
      return;
    }
    
    // Validate: must not exceed max
    if (credits > MAX_CREDITS) {
      toast({
        title: "Credits too high",
        description: `Maximum allowed credits: ${MAX_CREDITS.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }
    
    // Warn for very large values
    if (credits > WARN_THRESHOLD) {
      const confirmed = window.confirm(
        `You are setting credits to ${credits.toLocaleString()}. This is a very large amount. Are you sure?`
      );
      if (!confirmed) return;
    }
    
    // Confirm large changes
    const difference = Math.abs(credits - editingUser.credits);
    if (difference > LARGE_CHANGE_THRESHOLD) {
      const confirmed = window.confirm(
        `This will change credits by ${difference.toLocaleString()}. Continue?`
      );
      if (!confirmed) return;
    }

    setIsSaving(true);
    const result = await updateUserCredits(editingUser.id, credits);
    setIsSaving(false);
    
    if (result.success) {
      toast({
        title: "Credits updated",
        description: `${editingUser.email} now has ${credits.toLocaleString()} credits`,
      });
      fetchUsers();
      setEditingUser(null);
    } else {
      toast({
        title: "Update failed",
        description: result.error || "Could not update user credits",
        variant: "destructive",
      });
    }
  };

  const handleToggleBlock = async (user: UserProfile) => {
    const newBlockedState = !user.is_blocked;
    const actionText = newBlockedState ? "block" : "unblock";
    
    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} ${user.email}?${newBlockedState ? " They will not be able to use any features." : ""}`
    );
    
    if (!confirmed) return;
    
    setTogglingBlock(user.id);
    const result = await toggleUserBlock(user.id, newBlockedState);
    setTogglingBlock(null);
    
    if (result.success) {
      toast({
        title: newBlockedState ? "User blocked" : "User unblocked",
        description: `${user.email} has been ${newBlockedState ? "blocked" : "unblocked"}`,
      });
      fetchUsers();
    } else {
      toast({
        title: "Action failed",
        description: result.error || `Could not ${actionText} user`,
        variant: "destructive",
      });
    }
  };

  const handleViewDashboard = (user: UserProfile) => {
    // Navigate to admin view of user's dashboard
    navigate(`/admin/user-dashboard/${user.id}`);
  };

  const handleSetApiKey = async () => {
    if (!apiKeyUser || !apiKeyValue.trim()) {
      toast({
        title: "API Key required",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setIsSettingApiKey(true);
    const result = await setUserApiKey(apiKeyUser.id, apiKeyValue.trim());
    setIsSettingApiKey(false);

    if (result.success) {
      toast({
        title: "API Key set successfully",
        description: `API Key has been configured for ${apiKeyUser.email}`,
      });
      setApiKeyUser(null);
      setApiKeyValue("");
      fetchUsers();
    } else {
      toast({
        title: "Failed to set API Key",
        description: result.error || "Could not set API key",
        variant: "destructive",
      });
    }
  };

  const creditsValue = parseInt(newCredits, 10);
  const showWarning = !isNaN(creditsValue) && creditsValue > WARN_THRESHOLD;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            View and manage all registered users
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Users ({filteredUsers.length})</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Free Credits</TableHead>
                    <TableHead>Paid API Credits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={user.is_blocked ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <div className="font-medium">
                          {user.full_name || "No name"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {user.email || "No email"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {user.credits.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {user.api_credits !== undefined ? user.api_credits.toLocaleString() : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_blocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDashboard(user)}
                            title="View user dashboard"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCredits(user)}
                            title="Edit credits"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setApiKeyUser(user);
                              setApiKeyValue("");
                            }}
                            title="Set API Key"
                            className="text-primary hover:text-primary"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleBlock(user)}
                            disabled={togglingBlock === user.id}
                            title={user.is_blocked ? "Unblock user" : "Block user"}
                            className={user.is_blocked ? "text-green-600 hover:text-green-700" : "text-destructive hover:text-destructive"}
                          >
                            {togglingBlock === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : user.is_blocked ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && filteredUsers.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No users found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Credits Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Credits</DialogTitle>
              <DialogDescription>
                Update credits for {editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium">Credits</label>
              <Input
                type="number"
                value={newCredits}
                onChange={(e) => setNewCredits(e.target.value)}
                className={cn(
                  "mt-2",
                  showWarning && "border-yellow-500 focus-visible:ring-yellow-500"
                )}
                min="0"
                max={MAX_CREDITS.toString()}
              />
              {showWarning && (
                <div className="flex items-center gap-1 mt-2 text-sm text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Warning: This is a very large credit amount</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Maximum: {MAX_CREDITS.toLocaleString()} credits
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveCredits} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Set API Key Dialog */}
        <Dialog open={!!apiKeyUser} onOpenChange={() => setApiKeyUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set User API Key</DialogTitle>
              <DialogDescription>
                Set API Key for {apiKeyUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="text"
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  placeholder="Enter API key..."
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This API key will be encrypted and stored securely for the user.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApiKeyUser(null)} disabled={isSettingApiKey}>
                Cancel
              </Button>
              <Button onClick={handleSetApiKey} disabled={isSettingApiKey || !apiKeyValue.trim()}>
                {isSettingApiKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting...
                  </>
                ) : (
                  "Set API Key"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
