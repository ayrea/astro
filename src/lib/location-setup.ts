const STORAGE_KEY = "astro-location-setup-done";

export function isLocationSetupDone(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function markLocationSetupDone(): void {
  window.localStorage.setItem(STORAGE_KEY, "1");
}
