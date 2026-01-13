import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Mic, 
  Library, 
  FileAudio, 
  Languages, 
  Settings, 
  CreditCard,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Loader2,
  Key,
  History,
  Copy,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/logo.jpeg";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: Mic, label: "Text to Speech", href: "/dashboard" },
  { icon: Copy, label: "Voice Clone", href: "/dashboard/voice-clone" },
  { icon: Library, label: "Voice Library", href: "/dashboard/voices" },
  { icon: History, label: "History", href: "/dashboard/history" },
  { icon: FileAudio, label: "Speech to Text", href: "/dashboard/stt" },
  { icon: Languages, label: "Dubbing", href: "/dashboard/dubbing" },
  { icon: CreditCard, label: "Buy Credits", href: "/dashboard/credits" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userApiBalance, setUserApiBalance] = useState<number | null>(null);
  const [hasUserApiKey, setHasUserApiKey] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut, isLoading } = useAuth();

  const credits = profile?.credits ?? 0;

  // Fetch user API key balance and logo
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        // Fetch API key balance - only show if key is valid
        const { data: apiKeyData } = await supabase
          .from("user_api_keys")
          .select("remaining_credits, is_valid")
          .eq("user_id", user.id)
          .eq("provider", "ai33")
          .maybeSingle();
        
        // Only show API balance if key exists AND is valid
        if (apiKeyData && apiKeyData.is_valid === true) {
          setHasUserApiKey(true);
          setUserApiBalance(apiKeyData.remaining_credits);
        } else {
          setHasUserApiKey(false);
          setUserApiBalance(null);
        }

        // Fetch logo URL
        const { data: logoData } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "site_logo_url")
          .maybeSingle();
        
        if (logoData?.value) {
          setLogoUrl(logoData.value);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    
    fetchData();
  }, [user]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src={logoUrl || defaultLogo} 
            alt="Logo" 
            className="h-8 w-8 rounded-lg object-cover"
          />
          <span className="text-lg font-bold tracking-tight">BD YT Automation</span>
        </Link>
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

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-background transition-all duration-300",
          "hidden md:flex", // Hide on mobile by default
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!isCollapsed && (
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={logoUrl || defaultLogo} 
                alt="Logo" 
                className="h-9 w-9 rounded-xl object-cover shadow-lg"
              />
              <span className="text-lg font-bold tracking-tight">BD YT Automation</span>
            </Link>
          )}
          {isCollapsed && (
            <Link to="/" className="mx-auto">
              <img 
                src={logoUrl || defaultLogo} 
                alt="Logo" 
                className="h-9 w-9 rounded-xl object-cover shadow-lg"
              />
            </Link>
          )}
        </div>

        {/* Credits Display */}
        <div className={cn(
          "border-b border-border p-4",
          isCollapsed && "flex justify-center"
        )}>
          {isCollapsed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Platform Credits */}
              <div className="rounded-xl bg-primary/10 p-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xl font-bold">{credits.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">Platform Credits</p>
              </div>
              
              {/* User API Key Balance */}
              {hasUserApiKey && (
                <div className="rounded-xl bg-green-500/10 p-3">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-green-500" />
                    <span className="text-xl font-bold text-green-600">
                      {userApiBalance !== null ? userApiBalance.toLocaleString() : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">API Key Balance</p>
                </div>
              )}
            </div>
          )}
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
                        ? "bg-primary text-primary-foreground shadow-sm" 
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
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {profile?.full_name || "User"}
                </p>
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
        {/* Credits Display */}
        <div className="border-b border-border p-4">
          <div className="space-y-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold">{credits.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">Platform Credits</p>
            </div>
            
            {hasUserApiKey && (
              <div className="rounded-xl bg-green-500/10 p-3">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-green-500" />
                  <span className="text-xl font-bold text-green-600">
                    {userApiBalance !== null ? userApiBalance.toLocaleString() : "—"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">API Key Balance</p>
              </div>
            )}
          </div>
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
                        ? "bg-primary text-primary-foreground shadow-sm" 
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
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {profile?.full_name || "User"}
              </p>
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
          "mt-14 md:mt-0", // Add top margin on mobile for header
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
