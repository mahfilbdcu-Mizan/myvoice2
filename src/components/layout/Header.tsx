import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";

interface HeaderProps {
  isLoggedIn?: boolean;
  credits?: number;
}

export function Header({ isLoggedIn = false, credits = 0 }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">VoiceStudio</span>
          </Link>
          
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/voices" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Voices
            </Link>
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link to="/docs" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Documentation
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <div className="hidden items-center gap-2 rounded-full bg-secondary px-4 py-2 md:flex">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{credits.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
              <Link to="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden md:block">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/login">
                <Button variant="hero" size="sm">Get Started</Button>
              </Link>
            </>
          )}
          
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-2">
            <Link 
              to="/voices" 
              className="rounded-lg px-4 py-3 text-sm font-medium hover:bg-accent"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Voices
            </Link>
            <Link 
              to="/pricing" 
              className="rounded-lg px-4 py-3 text-sm font-medium hover:bg-accent"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              to="/docs" 
              className="rounded-lg px-4 py-3 text-sm font-medium hover:bg-accent"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Documentation
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
