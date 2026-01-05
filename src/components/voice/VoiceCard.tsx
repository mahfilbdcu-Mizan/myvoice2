import { Play, Pause, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VoiceCardProps {
  id: string;
  name: string;
  accent?: string;
  gender?: string;
  age?: string;
  description?: string;
  category?: string;
  previewUrl?: string;
  isSelected?: boolean;
  isPlaying?: boolean;
  onSelect?: (id: string) => void;
  onPlay?: (id: string) => void;
}

export function VoiceCard({
  id,
  name,
  accent,
  gender,
  age,
  description,
  category,
  previewUrl,
  isSelected = false,
  isPlaying = false,
  onSelect,
  onPlay,
}: VoiceCardProps) {
  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      onPlay?.(id);
    }
  };

  const handleSelect = () => {
    onSelect?.(id);
  };

  // Build description line from available data
  const infoLine = [accent, gender, age].filter(Boolean).join(" · ") || "Voice";

  return (
    <div
      onClick={handleSelect}
      className={cn(
        "group relative cursor-pointer rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-elevated",
        isSelected 
          ? "border-primary ring-2 ring-primary/20" 
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-lg">
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Play Button */}
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "h-12 w-12 shrink-0 rounded-full",
            !previewUrl && "opacity-50 cursor-not-allowed"
          )}
          onClick={handlePlay}
          disabled={!previewUrl}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" />
          )}
        </Button>

        {/* Voice Info */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground capitalize">
            {infoLine}
          </p>
          
          {/* Description */}
          {description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
          
          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {category && (
              <Badge variant="secondary" className="text-xs capitalize">
                {category}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Use Voice Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-4 w-full opacity-0 transition-opacity group-hover:opacity-100"
        onClick={handleSelect}
      >
        Use this voice
      </Button>
    </div>
  );
}
