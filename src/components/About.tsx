import { Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// TODO: fill in real links
const CREATOR_NAME = "Andrew Ayre";
const LINKEDIN_URL = "https://www.linkedin.com/in/andrew-ayre";
const PROJECT_URL = "https://github.com/ayrea/astro";

export function AboutTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="About"
        className="border-border/80 bg-card/80 backdrop-blur"
      >
        <Info className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onDismiss={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>About</DialogTitle>
            <DialogDescription>
              Astro — an astronomy planisphere
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-2 text-sm text-foreground">
            <p>
              Astro is an offline-capable planisphere Progressive Web App for
              stargazing. Explore the night sky with stars, constellations,
              planets, and rise and set times — even in remote dark-sky
              locations without a network connection.
            </p>

            <div className="space-y-2">
              <h3 className="font-medium">Creator</h3>
              <p className="text-muted-foreground">
                Built by {CREATOR_NAME}, an Astronomy enthusiast and Software
                Developer based in Perth, Australia.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Links</h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href={LINKEDIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground underline-offset-2 hover:underline"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href={PROJECT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Project page
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
