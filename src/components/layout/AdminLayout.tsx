import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard,
  Settings, 
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Loader2,
  Package,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { checkIsAdmin } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";
import defaultLogo from "@/assets/logo.jpeg";
import { supabase } from "@/integrations/supabase/client";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: CreditCard, label: "Orders", href: "/admin/orders" },
  { icon: Package, label: "Packages", href: "/admin/packages" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, session, signOut, isLoading } = useAuth();

  useEffect(() => {
    async function checkAdmin() {
      if (user && session) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const adminStatus = await checkIsAdmin();
        setIsAdmin(adminStatus);
      } else if (!isLoading && !user) {
        setIsAdmin(false);
      }
    }
    
    if (!isLoading && session) {
      checkAdmin();
    }
  }, [user, session, isLoading]);

  // Fetch logo
  useEffect(() => {
    async function fetchLogo() {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "site_logo_url")
        .maybeSingle();
      
      if (data?.value) {
        setLogoUrl(data.value);
      }
    }
    fetchLogo();
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect to login if user is definitely not logged in
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Show loading while checking admin status
  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Access Denied</h1>
        <p className="text-sm sm:text-base text-muted-foreground">You don't have permission to access the admin panel.</p>
        <Button onClick={() => navigate("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <div className="flex items-center gap-2">
          <img 
            src={logoUrl || defaultLogo} 
            alt="Logo" 
            className="h-8 w-8 rounded-lg object-cover"
          />
          <span className="text-lg font-bold tracking-tight">Admin</span>
          <Badge variant="destructive" className="text-xs">Panel</Badge>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-background transition-all duration-300",
          "hidden md:flex",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive shadow-lg">
                <Zap className="h-5 w-5 text-destructive-foreground" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight">Admin</span>
                <Badge variant="destructive" className="ml-2 text-xs">Panel</Badge>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-destructive shadow-lg">
              <Zap className="h-5 w-5 text-destructive-foreground" />
            </div>
          )}
        </div>

        {/* Back to Dashboard */}
        <div className={cn(
          "border-b border-border p-4",
          isCollapsed && "flex justify-center"
        )}>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("w-full", isCollapsed && "w-10 px-0")}
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Back to App</span>}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive 
                        ? "bg-destructive text-destructive-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-3">
          <div className={cn(
            "flex items-center gap-3 rounded-lg p-2",
            isCollapsed && "justify-center"
          )}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-destructive text-destructive-foreground">
                A
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">Admin</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email || ""}
                </p>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "mt-2 w-full justify-start text-muted-foreground",
              isCollapsed && "justify-center px-2"
            )}
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-72 flex-col border-r border-border bg-background transition-transform duration-300 md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Back to Dashboard */}
        <div className="border-b border-border p-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2">Back to App</span>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive 
                        ? "bg-destructive text-destructive-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-destructive text-destructive-foreground">
                A
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">Admin</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email || ""}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 w-full justify-start text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300",
          "mt-14 md:mt-0",
          isCollapsed ? "md:ml-20" : "md:ml-64"
        )}
      >
        <div className="min-h-screen p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
