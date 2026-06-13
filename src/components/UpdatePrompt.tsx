import { useEffect } from "react";
import { toast } from "sonner";

const UPDATE_STORAGE_KEY = "sw-updated";
const TOAST_DURATION_MS = 6000;

export function UpdatePrompt() {
  useEffect(() => {
    if (sessionStorage.getItem(UPDATE_STORAGE_KEY) !== "1") {
      return;
    }

    sessionStorage.removeItem(UPDATE_STORAGE_KEY);

    toast.success("App updated", {
      description: "You're now running the latest version.",
      duration: TOAST_DURATION_MS,
      cancel: {
        label: "Dismiss",
        onClick: () => {},
      },
    });
  }, []);

  return null;
}
