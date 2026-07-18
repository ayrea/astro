import { useState } from "react";

import { InfoPanel } from "@/components/InfoPanel";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LocationSetupDialog } from "@/components/LocationSetupDialog";
import { Planisphere } from "@/components/Planisphere";
import { Toolbar } from "@/components/Toolbar";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/context/SettingsContext";
import { TimeProvider } from "@/context/TimeContext";

function App() {
  const [infoOpen, setInfoOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches,
  );

  return (
    <SettingsProvider>
      <TimeProvider>
        <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#050814]">
          <Toolbar
            infoOpen={infoOpen}
            onInfoToggle={() => setInfoOpen((open) => !open)}
          />
          <main className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="relative order-1 min-h-0 min-w-0 flex-1 md:order-2">
              <Planisphere />
            </div>
            {infoOpen && <InfoPanel onClose={() => setInfoOpen(false)} />}
          </main>
          <LocationSetupDialog />
          <InstallPrompt />
          <UpdatePrompt />
          <Toaster position="top-center" richColors />
        </div>
      </TimeProvider>
    </SettingsProvider>
  );
}

export default App;
