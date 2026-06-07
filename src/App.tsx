import { Planisphere } from "@/components/Planisphere";
import { Settings } from "@/components/Settings";
import { SettingsProvider } from "@/context/SettingsContext";

function App() {
  return (
    <SettingsProvider>
      <div className="relative h-dvh w-full overflow-hidden bg-[#050814]">
        <Planisphere />
        <Settings />
      </div>
    </SettingsProvider>
  );
}

export default App;
