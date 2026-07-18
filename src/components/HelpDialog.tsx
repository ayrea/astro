import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PLANISPHERE_WIKI_URL = "https://en.wikipedia.org/wiki/Planisphere";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)]"
        onDismiss={() => onOpenChange(false)}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Help</DialogTitle>
          <DialogDescription>How to use the planisphere</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-2 text-sm text-foreground">
          <div className="space-y-2">
            <h3 className="font-medium">How to hold it</h3>
            <p className="text-muted-foreground">
              Hold the planisphere over your head so the chart matches the sky
              above you. Align the north of the chart with the real north
              horizon. The eastern and western sides of the chart should match
              the real eastern and western horizons.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">What the circle means</h3>
            <p className="text-muted-foreground">
              The planisphere represents the entire sky visible at the chosen
              time and location. The centre of the circle is the zenith —
              directly overhead — and the outer edge of the circle is the
              horizon.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Reading the sky</h3>
            <p className="text-muted-foreground">
              Stars and constellations inside the circle are above the horizon.
              Objects near the edge are low in the sky; anything beyond the edge
              is below the horizon and not visible.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Explore objects</h3>
            <p className="text-muted-foreground">
              Click or tap a star, planet, the Sun, or the Moon to learn more
              about that object. Click or tap inside a constellation to find out
              more about the constellation.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Learn more</h3>
            <a
              href={PLANISPHERE_WIKI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground underline-offset-2 hover:underline"
            >
              Planisphere on Wikipedia
            </a>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
