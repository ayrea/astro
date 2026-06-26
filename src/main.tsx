import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

registerSW({
  immediate: true,
  onNeedReload() {
    sessionStorage.setItem("sw-updated", "1");
    window.location.reload();
  },
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;

    const checkForUpdate = async () => {
      if (registration.installing || !navigator.onLine) return;
      try {
        const resp = await fetch(swUrl, { cache: "no-store" });
        if (resp?.status === 200) await registration.update();
      } catch {
        // offline / transient: ignore
      }
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    window.addEventListener("focus", checkForUpdate);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
