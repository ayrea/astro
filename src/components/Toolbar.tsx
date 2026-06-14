import { PanelLeft } from "lucide-react";

import { ObserverTimeControls } from "@/components/ObserverTimeControls";
import { SettingsTrigger } from "@/components/Settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  infoOpen: boolean;
  onInfoToggle: () => void;
}

export function Toolbar({ infoOpen, onInfoToggle }: ToolbarProps) {
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-card/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onInfoToggle}
          aria-label={infoOpen ? "Hide info panel" : "Show info panel"}
          aria-pressed={infoOpen}
          className={cn(
            "border-border/80 bg-card/80 backdrop-blur",
            infoOpen && "bg-accent",
          )}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold text-foreground">Planisphere</h1>
      </div>
      <div className="absolute left-1/2 z-10 -translate-x-1/2">
        <ObserverTimeControls />
      </div>
      <SettingsTrigger />
    </header>
  );
}
