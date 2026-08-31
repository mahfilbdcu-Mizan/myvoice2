import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { addManager, getStaffRole, listManagers, removeManager, type ManagerEntry } from "@/lib/admin-api";

export function ManagersCard() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [managers, setManagers] = useState<ManagerEntry[]>([]);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const role = await getStaffRole();
      setIsSuperAdmin(role.isSuperAdmin);
      if (role.isSuperAdmin) {
        setManagers(await listManagers());
      }
      setIsLoading(false);
    })();
  }, []);

  const refresh = async () => setManagers(await listManagers());

  const handleAdd = async () => {
    const value = email.trim().toLowerCase();
    if (!value) {
      toast({ title: "Email required", description: "Enter a Gmail or any email address", variant: "destructive" });
      return;
    }
    setIsAdding(true);
    const result = await addManager(value);
    setIsAdding(false);

    if (result.success) {
      toast({
        title: "Manager added",
        description: result.activated
          ? `${value} now has full manager access.`
          : `${value} will get manager access automatically on their first login.`,
      });
      setEmail("");
      refresh();
    } else {
      toast({ title: "Failed to add manager", description: result.error, variant: "destructive" });
    }
  };

  const handleRemove = async (target: string) => {
    if (!window.confirm(`Remove manager access for ${target}?`)) return;
    setRemoving(target);
    const result = await removeManager(target);
    setRemoving(null);
    if (result.success) {
      toast({ title: "Manager removed", description: `${target} no longer has admin access.` });
      refresh();
    } else {
      toast({ title: "Failed to remove manager", description: result.error, variant: "destructive" });
    }
  };

  // Only the owner (super admin) can add or remove managers
  if (isLoading || !isSuperAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>Managers</CardTitle>
        </div>
        <CardDescription>
          Add any email (Gmail included) as a manager. Managers get the same panel access as you —
          users, credits, orders, packages, settings and voices. Only you (the owner admin) can add or remove managers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Manager email</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="manager@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={isAdding} className="gap-2">
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Add Manager
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            If the person has no account yet, they will become a manager automatically the first time they sign in with that email.
          </p>
        </div>

        <div className="space-y-2">
          {managers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No managers added yet.</p>
          ) : (
            managers.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.active ? "default" : "secondary"}>
                    {m.active ? "Active" : "Pending first login"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(m.email)}
                    disabled={removing === m.email}
                  >
                    {removing === m.email ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
