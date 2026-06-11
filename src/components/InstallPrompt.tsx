import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

const DISMISSAL_STORAGE_KEY = "pwa-install-dismissed-at";
const DISMISSAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const PROMPT_DELAY_MS = 3000;

function isDismissalActive(): boolean {
  const dismissedAt = localStorage.getItem(DISMISSAL_STORAGE_KEY);
  if (!dismissedAt) {
    return false;
  }

  const elapsed = Date.now() - Number(dismissedAt);
  return !Number.isNaN(elapsed) && elapsed < DISMISSAL_COOLDOWN_MS;
}

function recordDismissed(): void {
  localStorage.setItem(DISMISSAL_STORAGE_KEY, Date.now().toString());
}

export function InstallPrompt() {
  const { canInstall, isIos, isStandalone, promptInstall } =
    usePwaInstallPrompt();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (isStandalone || isDismissalActive() || hasShownRef.current) {
      return;
    }

    if (!canInstall && !isIos) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (hasShownRef.current || isDismissalActive()) {
        return;
      }

      hasShownRef.current = true;

      if (canInstall) {
        toast("Install Astro Planisphere?", {
          description: "Add this app to your device for quick offline access.",
          duration: Infinity,
          action: {
            label: "Install",
            onClick: () => {
              void promptInstall().then(() => {
                recordDismissed();
              });
            },
          },
          cancel: {
            label: "Not now",
            onClick: () => {
              recordDismissed();
            },
          },
        });
        return;
      }

      if (isIos) {
        toast.message("Install Astro Planisphere", {
          description:
            "Tap the Share icon, then choose \"Add to Home Screen\".",
          duration: Infinity,
          action: {
            label: "Dismiss",
            onClick: () => {
              recordDismissed();
            },
          },
        });
      }
    }, PROMPT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canInstall, isIos, isStandalone, promptInstall]);

  return null;
}
