import { Header } from "@/components/Header";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { Planisphere } from "@/components/Planisphere";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/context/SettingsContext";

function App() {
  return (
    <SettingsProvider>
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#050814]">
        <Header />
        <main className="relative min-h-0 flex-1">
          <Planisphere />
        </main>
        <InstallPrompt />
        <UpdatePrompt />
        <Toaster position="top-center" richColors />
      </div>
    </SettingsProvider>
  );
}

export default App;
