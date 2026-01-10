import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";
import defaultLogo from "@/assets/logo.jpeg";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  isLoggedIn?: boolean;
  credits?: number;
}

export function Header({ isLoggedIn = false, credits = 0 }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 lg:gap-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoUrl || defaultLogo} alt="BD YT Automation" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover shadow-lg" />
            <span className="text-lg sm:text-xl font-bold tracking-tight">BD YT Automation</span>
          </Link>
          
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/voices" className="text-base font-semibold text-primary transition-colors hover:text-primary/80">
              Voices
            </Link>
            <Link to="/pricing" className="text-base font-semibold text-primary transition-colors hover:text-primary/80">
              Pricing
            </Link>
            <Link to="/contact" className="text-base font-semibold text-primary transition-colors hover:text-primary/80">
              Contact
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
              className="rounded-lg px-4 py-3 text-base font-semibold text-primary hover:bg-accent"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Voices
            </Link>
            <Link 
              to="/pricing" 
              className="rounded-lg px-4 py-3 text-base font-semibold text-primary hover:bg-accent"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              to="/contact" 
              className="rounded-lg px-4 py-3 text-base font-semibold text-primary hover:bg-accent"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
