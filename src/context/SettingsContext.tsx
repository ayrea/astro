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
export type ElevationSpacing = 10 | 15 | 30 | 45;

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
  showElevation: boolean;
  elevationSpacing: ElevationSpacing;
  showZenithCross: boolean;
  showElevationLabels: boolean;
  elevationLineColor: string;
  elevationLineOpacity: number;
  elevationLineThickness: number;
  elevationLabelColor: string;
  elevationLabelFontSize: number;
  showConstellations: boolean;
  constellationLineColor: string;
  constellationLineOpacity: number;
  constellationLineThickness: number;
  showConstellationLabels: boolean;
  constellationLabelColor: string;
  constellationLabelFontSize: number;
  showConstellationBounds: boolean;
  constellationBoundsColor: string;
  constellationBoundsOpacity: number;
  constellationBoundsThickness: number;
  showEcliptic: boolean;
  eclipticLineColor: string;
  eclipticLineOpacity: number;
  eclipticLineThickness: number;
  showPlanets: boolean;
  showPlanetLabels: boolean;
  planetLabelFontSize: number;
  planetOpacity: number;
  planetSizeScale: number;
}

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  resetSettings: () => void;
}

const STORAGE_KEY = "astro-planisphere-settings";

const defaultSettings: Settings = {
  latitude: -31.95,
  longitude: 115.86,
  magnitudeCutoff: 5,
  mirrorEastWest: true,
  showLabels: true,
  showGrid: true,
  gridRaSpacing: 2,
  gridDecSpacing: 30,
  gridLineColor: "rgba(56, 189, 248, 1)",
  gridLineOpacity: 0.2,
  gridLineThickness: 1,
  gridLabelColor: "rgba(56, 189, 248, 1)",
  gridLabelFontSize: 10,
  showElevation: true,
  elevationSpacing: 30,
  showZenithCross: true,
  showElevationLabels: true,
  elevationLineColor: "rgba(148, 163, 184, 1)",
  elevationLineOpacity: 0.25,
  elevationLineThickness: 1,
  elevationLabelColor: "rgba(148, 163, 184, 1)",
  elevationLabelFontSize: 10,
  showConstellations: true,
  constellationLineColor: "rgba(251, 191, 36, 1)",
  constellationLineOpacity: 0.4,
  constellationLineThickness: 1,
  showConstellationLabels: true,
  constellationLabelColor: "rgba(251, 191, 36, 1)",
  constellationLabelFontSize: 10,
  showConstellationBounds: false,
  constellationBoundsColor: "rgba(167, 139, 250, 1)",
  constellationBoundsOpacity: 0.15,
  constellationBoundsThickness: 1,
  showEcliptic: true,
  eclipticLineColor: "rgba(251, 146, 60, 1)",
  eclipticLineOpacity: 0.5,
  eclipticLineThickness: 1.5,
  showPlanets: true,
  showPlanetLabels: true,
  planetLabelFontSize: 11,
  planetOpacity: 1,
  planetSizeScale: 1,
};

const VALID_RA_SPACINGS = new Set<GridRaSpacing>([1, 2, 3, 6]);
const VALID_DEC_SPACINGS = new Set<GridDecSpacing>([10, 15, 30, 45]);
const VALID_ELEVATION_SPACINGS = new Set<ElevationSpacing>([10, 15, 30, 45]);

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
    typeof parsed.gridLabelColor === "string" &&
    parsed.gridLabelColor.length > 0
      ? parsed.gridLabelColor
      : defaultSettings.gridLabelColor;

  const gridLabelFontSize =
    typeof parsed.gridLabelFontSize === "number" &&
    parsed.gridLabelFontSize >= 8 &&
    parsed.gridLabelFontSize <= 18
      ? parsed.gridLabelFontSize
      : defaultSettings.gridLabelFontSize;

  const elevationSpacing = VALID_ELEVATION_SPACINGS.has(
    parsed.elevationSpacing as ElevationSpacing,
  )
    ? (parsed.elevationSpacing as ElevationSpacing)
    : defaultSettings.elevationSpacing;

  const elevationLineThickness =
    typeof parsed.elevationLineThickness === "number" &&
    parsed.elevationLineThickness >= 0.5 &&
    parsed.elevationLineThickness <= 4
      ? parsed.elevationLineThickness
      : defaultSettings.elevationLineThickness;

  const elevationLineColor =
    typeof parsed.elevationLineColor === "string" &&
    parsed.elevationLineColor.length > 0
      ? parsed.elevationLineColor
      : defaultSettings.elevationLineColor;

  const elevationLineOpacity =
    typeof parsed.elevationLineOpacity === "number" &&
    parsed.elevationLineOpacity >= 0 &&
    parsed.elevationLineOpacity <= 1
      ? parsed.elevationLineOpacity
      : defaultSettings.elevationLineOpacity;

  const elevationLabelColor =
    typeof parsed.elevationLabelColor === "string" &&
    parsed.elevationLabelColor.length > 0
      ? parsed.elevationLabelColor
      : defaultSettings.elevationLabelColor;

  const elevationLabelFontSize =
    typeof parsed.elevationLabelFontSize === "number" &&
    parsed.elevationLabelFontSize >= 8 &&
    parsed.elevationLabelFontSize <= 18
      ? parsed.elevationLabelFontSize
      : defaultSettings.elevationLabelFontSize;

  const constellationLineColor =
    typeof parsed.constellationLineColor === "string" &&
    parsed.constellationLineColor.length > 0
      ? parsed.constellationLineColor
      : defaultSettings.constellationLineColor;

  const constellationLineOpacity =
    typeof parsed.constellationLineOpacity === "number" &&
    parsed.constellationLineOpacity >= 0 &&
    parsed.constellationLineOpacity <= 1
      ? parsed.constellationLineOpacity
      : defaultSettings.constellationLineOpacity;

  const constellationLineThickness =
    typeof parsed.constellationLineThickness === "number" &&
    parsed.constellationLineThickness >= 0.5 &&
    parsed.constellationLineThickness <= 4
      ? parsed.constellationLineThickness
      : defaultSettings.constellationLineThickness;

  const constellationLabelColor =
    typeof parsed.constellationLabelColor === "string" &&
    parsed.constellationLabelColor.length > 0
      ? parsed.constellationLabelColor
      : defaultSettings.constellationLabelColor;

  const constellationLabelFontSize =
    typeof parsed.constellationLabelFontSize === "number" &&
    parsed.constellationLabelFontSize >= 8 &&
    parsed.constellationLabelFontSize <= 18
      ? parsed.constellationLabelFontSize
      : defaultSettings.constellationLabelFontSize;

  const constellationBoundsColor =
    typeof parsed.constellationBoundsColor === "string" &&
    parsed.constellationBoundsColor.length > 0
      ? parsed.constellationBoundsColor
      : defaultSettings.constellationBoundsColor;

  const constellationBoundsOpacity =
    typeof parsed.constellationBoundsOpacity === "number" &&
    parsed.constellationBoundsOpacity >= 0 &&
    parsed.constellationBoundsOpacity <= 1
      ? parsed.constellationBoundsOpacity
      : defaultSettings.constellationBoundsOpacity;

  const constellationBoundsThickness =
    typeof parsed.constellationBoundsThickness === "number" &&
    parsed.constellationBoundsThickness >= 0.5 &&
    parsed.constellationBoundsThickness <= 4
      ? parsed.constellationBoundsThickness
      : defaultSettings.constellationBoundsThickness;

  const eclipticLineColor =
    typeof parsed.eclipticLineColor === "string" &&
    parsed.eclipticLineColor.length > 0
      ? parsed.eclipticLineColor
      : defaultSettings.eclipticLineColor;

  const eclipticLineOpacity =
    typeof parsed.eclipticLineOpacity === "number" &&
    parsed.eclipticLineOpacity >= 0 &&
    parsed.eclipticLineOpacity <= 1
      ? parsed.eclipticLineOpacity
      : defaultSettings.eclipticLineOpacity;

  const eclipticLineThickness =
    typeof parsed.eclipticLineThickness === "number" &&
    parsed.eclipticLineThickness >= 1 &&
    parsed.eclipticLineThickness <= 4
      ? parsed.eclipticLineThickness
      : defaultSettings.eclipticLineThickness;

  const planetLabelFontSize =
    typeof parsed.planetLabelFontSize === "number" &&
    parsed.planetLabelFontSize >= 8 &&
    parsed.planetLabelFontSize <= 18
      ? parsed.planetLabelFontSize
      : defaultSettings.planetLabelFontSize;

  const planetOpacity =
    typeof parsed.planetOpacity === "number" &&
    parsed.planetOpacity >= 0 &&
    parsed.planetOpacity <= 1
      ? parsed.planetOpacity
      : defaultSettings.planetOpacity;

  const planetSizeScale =
    typeof parsed.planetSizeScale === "number" &&
    parsed.planetSizeScale >= 0.5 &&
    parsed.planetSizeScale <= 2
      ? parsed.planetSizeScale
      : defaultSettings.planetSizeScale;

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
    elevationSpacing,
    elevationLineColor,
    elevationLineOpacity,
    elevationLineThickness,
    elevationLabelColor,
    elevationLabelFontSize,
    constellationLineColor,
    constellationLineOpacity,
    constellationLineThickness,
    constellationLabelColor,
    constellationLabelFontSize,
    constellationBoundsColor,
    constellationBoundsOpacity,
    constellationBoundsThickness,
    eclipticLineColor,
    eclipticLineOpacity,
    eclipticLineThickness,
    planetLabelFontSize,
    planetOpacity,
    planetSizeScale,
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

  const resetSettings = useCallback(() => {
    setSettings((current) => {
      const next = {
        ...defaultSettings,
        latitude: current.latitude,
        longitude: current.longitude,
      };
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      resetSettings,
    }),
    [settings, updateSettings, resetSettings],
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
