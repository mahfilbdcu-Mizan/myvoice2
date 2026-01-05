import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  credits?: number;
}

const navItems = [
  { icon: Mic, label: "Text to Speech", href: "/dashboard" },
  { icon: Library, label: "Voice Library", href: "/dashboard/voices" },
  { icon: FileAudio, label: "Speech to Text", href: "/dashboard/stt" },
  { icon: Languages, label: "Dubbing", href: "/dashboard/dubbing" },
  { icon: CreditCard, label: "Buy Credits", href: "/dashboard/credits" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export function DashboardLayout({ children, credits = 0 }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-background transition-all duration-300",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!isCollapsed && (
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">VoiceStudio</span>
            </Link>
          )}
          {isCollapsed && (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
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
            <div className="rounded-xl bg-primary/10 p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{credits.toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Credits available</p>
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">User</p>
                <p className="truncate text-xs text-muted-foreground">user@example.com</p>
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

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300",
          isCollapsed ? "ml-20" : "ml-64"
        )}
      >
        <div className="min-h-screen p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
