import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SkyOrientationPermission } from "@/hooks/useDeviceSkyOrientation";

interface SkyAlignPermissionDialogProps {
  open: boolean;
  onRequestPermission: () => Promise<SkyOrientationPermission>;
  onDismiss: () => void;
}

export function SkyAlignPermissionDialog({
  open,
  onRequestPermission,
  onDismiss,
}: SkyAlignPermissionDialogProps) {
  const [pending, setPending] = useState(false);

  const handleEnable = async () => {
    setPending(true);
    try {
      const result = await onRequestPermission();
      if (result === "unsupported") {
        toast("Device orientation is not supported on this device");
        onDismiss();
        return;
      }
      if (result === "denied") {
        toast(
          "Motion/compass permission denied — sky align cannot track the sky",
        );
        return;
      }
      // granted: parent hides via needsPermissionPrompt becoming false
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent onDismiss={onDismiss} showClose={false}>
        <DialogHeader>
          <DialogTitle>Enable motion sensors</DialogTitle>
          <DialogDescription>
            Sky Align needs access to this device&apos;s motion sensors so the
            chart can follow where you point. Tap Enable sensors — your browser
            may ask you to allow motion and orientation.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onDismiss}
          >
            Not now
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => void handleEnable()}
          >
            {pending ? "Waiting…" : "Enable sensors"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
