import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type GridRaSpacing = 1 | 2 | 3 | 6;
export type GridDecSpacing = 10 | 15 | 30 | 45;

export interface Settings {
  latitude: number;
  longitude: number;
  magnitudeCutoff: number;
  mirrorEastWest: boolean;
  showLabels: boolean;
  showGrid: boolean;
  gridRaSpacing: GridRaSpacing;
  gridDecSpacing: GridDecSpacing;
  gridLineColor: string;
  gridLineOpacity: number;
  gridLineThickness: number;
  gridLabelColor: string;
  gridLabelFontSize: number;
}

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
}

const STORAGE_KEY = "astro-planisphere-settings";

const defaultSettings: Settings = {
  latitude: 51.5,
  longitude: -0.12,
  magnitudeCutoff: 5,
  mirrorEastWest: false,
  showLabels: true,
  showGrid: true,
  gridRaSpacing: 2,
  gridDecSpacing: 30,
  gridLineColor: "rgba(56, 189, 248, 1)",
  gridLineOpacity: 0.2,
  gridLineThickness: 1,
  gridLabelColor: "rgba(56, 189, 248, 1)",
  gridLabelFontSize: 10,
};

const VALID_RA_SPACINGS = new Set<GridRaSpacing>([1, 2, 3, 6]);
const VALID_DEC_SPACINGS = new Set<GridDecSpacing>([10, 15, 30, 45]);

function normalizeSettings(parsed: Partial<Settings>): Settings {
  const gridRaSpacing = VALID_RA_SPACINGS.has(
    parsed.gridRaSpacing as GridRaSpacing,
  )
    ? (parsed.gridRaSpacing as GridRaSpacing)
    : defaultSettings.gridRaSpacing;

  const gridDecSpacing = VALID_DEC_SPACINGS.has(
    parsed.gridDecSpacing as GridDecSpacing,
  )
    ? (parsed.gridDecSpacing as GridDecSpacing)
    : defaultSettings.gridDecSpacing;

  const gridLineThickness =
    typeof parsed.gridLineThickness === "number" &&
    parsed.gridLineThickness >= 0.5 &&
    parsed.gridLineThickness <= 3
      ? parsed.gridLineThickness
      : defaultSettings.gridLineThickness;

  const gridLineColor =
    typeof parsed.gridLineColor === "string" && parsed.gridLineColor.length > 0
      ? parsed.gridLineColor
      : defaultSettings.gridLineColor;

  const gridLineOpacity =
    typeof parsed.gridLineOpacity === "number" &&
    parsed.gridLineOpacity >= 0 &&
    parsed.gridLineOpacity <= 1
      ? parsed.gridLineOpacity
      : defaultSettings.gridLineOpacity;

  const gridLabelColor =
    typeof parsed.gridLabelColor === "string" && parsed.gridLabelColor.length > 0
      ? parsed.gridLabelColor
      : defaultSettings.gridLabelColor;

  const gridLabelFontSize =
    typeof parsed.gridLabelFontSize === "number" &&
    parsed.gridLabelFontSize >= 8 &&
    parsed.gridLabelFontSize <= 18
      ? parsed.gridLabelFontSize
      : defaultSettings.gridLabelFontSize;

  return {
    ...defaultSettings,
    ...parsed,
    gridRaSpacing,
    gridDecSpacing,
    gridLineColor,
    gridLineOpacity,
    gridLineThickness,
    gridLabelColor,
    gridLabelFontSize,
  };
}

function loadSettings(): Settings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSettings;
    }

    const parsed = JSON.parse(raw) as Partial<Settings>;
    return normalizeSettings(parsed);
  } catch {
    return defaultSettings;
  }
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...partial };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
    }),
    [settings, updateSettings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
