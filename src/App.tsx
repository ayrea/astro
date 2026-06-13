import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { Planisphere } from "@/components/Planisphere";
import { Settings } from "@/components/Settings";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/context/SettingsContext";

function App() {
  return (
    <SettingsProvider>
      <div className="relative h-dvh w-full overflow-hidden bg-[#050814]">
        <Planisphere />
        <Settings />
        <InstallPrompt />
        <UpdatePrompt />
        <Toaster position="top-center" richColors />
      </div>
    </SettingsProvider>
  );
}

export default App;
