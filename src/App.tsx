import { useState } from "react";

import { InfoPanel } from "@/components/InfoPanel";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { Planisphere } from "@/components/Planisphere";
import { Toolbar } from "@/components/Toolbar";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/context/SettingsContext";

function App() {
  const [infoOpen, setInfoOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches,
  );

  return (
    <SettingsProvider>
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#050814]">
        <Toolbar
          infoOpen={infoOpen}
          onInfoToggle={() => setInfoOpen((open) => !open)}
        />
        <main className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="relative min-h-0 min-w-0 flex-1">
            <Planisphere />
          </div>
          {infoOpen && <InfoPanel onClose={() => setInfoOpen(false)} />}
        </main>
        <InstallPrompt />
        <UpdatePrompt />
        <Toaster position="top-center" richColors />
      </div>
    </SettingsProvider>
  );
}

export default App;
