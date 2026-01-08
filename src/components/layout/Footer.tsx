import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpeg";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-subtle">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="BD YT Automation" className="h-9 w-9 rounded-xl object-cover shadow-lg" />
              <span className="text-xl font-bold tracking-tight">BD YT Automation</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Transform text into natural, expressive speech with cutting-edge AI technology.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Product</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/voices" className="text-sm text-muted-foreground hover:text-foreground">
                Voice Library
              </Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                Pricing
              </Link>
              <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground">
                API Documentation
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Features</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/text-to-speech" className="text-sm text-muted-foreground hover:text-foreground">
                Text to Speech
              </Link>
              <Link to="/speech-to-text" className="text-sm text-muted-foreground hover:text-foreground">
                Speech to Text
              </Link>
              <Link to="/dubbing" className="text-sm text-muted-foreground hover:text-foreground">
                AI Dubbing
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BD YT Automation. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
