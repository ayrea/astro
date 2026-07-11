import { Loader2, LocateFixed, Settings as SettingsIcon } from "lucide-react";
import { useRef, useState } from "react";

import { AboutDialog } from "@/components/About";
import { LocationPicker } from "@/components/LocationPicker";
import { NumericInput } from "@/components/NumericInput";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type ElevationSpacing,
  type GridDecSpacing,
  type GridRaSpacing,
  type Settings,
  useSettings,
} from "@/context/SettingsContext";
import {
  CUSTOM_LOCATION_ID,
  findObserverCity,
  findObserverCityByKey,
  loadObserverCities,
  observerCityKey,
  type ObserverCity,
} from "@/data/observer-cities";
import { cn } from "@/lib/utils";

const GRID_COLOR_PRESETS = [
  { label: "Sky blue", value: "rgba(56, 189, 248, 1)" },
  { label: "White", value: "rgba(248, 250, 252, 1)" },
  { label: "Green", value: "rgba(74, 222, 128, 1)" },
  { label: "Amber", value: "rgba(251, 191, 36, 1)" },
  { label: "Violet", value: "rgba(167, 139, 250, 1)" },
] as const;

const RA_SPACING_OPTIONS: Array<{ value: GridRaSpacing; label: string }> = [
  { value: 1, label: "1 Hr" },
  { value: 2, label: "2 Hrs" },
  { value: 3, label: "3 Hrs" },
  { value: 6, label: "6 Hrs" },
];

const DEC_SPACING_OPTIONS: Array<{ value: GridDecSpacing; label: string }> = [
  { value: 10, label: "10°" },
  { value: 15, label: "15°" },
  { value: 30, label: "30°" },
  { value: 45, label: "45°" },
];

const ELEVATION_SPACING_OPTIONS: Array<{
  value: ElevationSpacing;
  label: string;
}> = [
  { value: 10, label: "10°" },
  { value: 15, label: "15°" },
  { value: 30, label: "30°" },
  { value: 45, label: "45°" },
];

function formatCoordinate(value: number, positiveSuffix: string): string {
  const absolute = Math.abs(value);
  const suffix =
    value >= 0 ? positiveSuffix : positiveSuffix === "N" ? "S" : "W";
  return `${absolute.toFixed(3)}°${suffix}`;
}

function formatLocationCoordinates(
  latitude: number,
  longitude: number,
): string {
  return `${formatCoordinate(latitude, "N")}, ${formatCoordinate(longitude, "E")}`;
}

function resolveLocationSelectValue(
  latitude: number,
  longitude: number,
  cities: ObserverCity[],
): string {
  const match = findObserverCity(latitude, longitude, cities);
  return match ? observerCityKey(match) : CUSTOM_LOCATION_ID;
}

export function SettingsTrigger() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [observerCities, setObserverCities] = useState<ObserverCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [draftLatitude, setDraftLatitude] = useState(settings.latitude);
  const [draftLongitude, setDraftLongitude] = useState(settings.longitude);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const snapshotRef = useRef<Settings | null>(null);
  const loadIdRef = useRef(0);

  const geolocationSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const locationSelectValue = resolveLocationSelectValue(
    settings.latitude,
    settings.longitude,
    observerCities,
  );

  const openCustomLocationDialog = () => {
    setDraftLatitude(settings.latitude);
    setDraftLongitude(settings.longitude);
    setLocating(false);
    setLocateError(null);
    setCustomDialogOpen(true);
  };

  const handleUseCurrentLocation = () => {
    if (!geolocationSupported) {
      return;
    }

    setLocateError(null);
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Math.min(
          90,
          Math.max(-90, position.coords.latitude),
        );
        const longitude = Math.min(
          180,
          Math.max(-180, position.coords.longitude),
        );
        setDraftLatitude(latitude);
        setDraftLongitude(longitude);
        setLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Current location unavailable."
              : error.code === error.TIMEOUT
                ? "Timed out getting current location."
                : "Unable to get current location.";
        setLocateError(message);
        setLocating(false);
      },
    );
  };

  const handleLocationChange = (value: string) => {
    if (value === CUSTOM_LOCATION_ID) {
      openCustomLocationDialog();
      return;
    }

    const city = findObserverCityByKey(value, observerCities);
    if (!city) {
      return;
    }

    updateSettings({
      latitude: city.latitude,
      longitude: city.longitude,
    });
  };

  const handleCustomLocationCancel = () => {
    setCustomDialogOpen(false);
  };

  const handleCustomLocationOk = () => {
    updateSettings({
      latitude: draftLatitude,
      longitude: draftLongitude,
    });
    setCustomDialogOpen(false);
  };

  const isCustomLocation =
    resolveLocationSelectValue(
      settings.latitude,
      settings.longitude,
      observerCities,
    ) === CUSTOM_LOCATION_ID;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      snapshotRef.current = { ...settings };
      if (observerCities.length === 0 && !citiesLoading) {
        const loadId = ++loadIdRef.current;
        setCitiesLoading(true);
        loadObserverCities()
          .then((cities) => {
            if (loadId === loadIdRef.current) {
              setObserverCities(cities);
            }
          })
          .finally(() => {
            if (loadId === loadIdRef.current) {
              setCitiesLoading(false);
            }
          });
      }
    }
    setOpen(nextOpen);
  };

  const handleCancel = () => {
    if (snapshotRef.current) {
      updateSettings(snapshotRef.current);
    }
    setOpen(false);
  };

  const handleOk = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="border-border/80 bg-card/80 backdrop-blur max-md:h-9 max-md:w-9 max-md:px-0"
          aria-label="Open settings"
        >
          <SettingsIcon className="h-4 w-4" />
          <span className="hidden md:inline">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="center" size="large" onDismiss={handleCancel}>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Configure your observer location and display options.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Tabs defaultValue="general" className="pb-4">
            <div className="sticky top-0 z-10 flex flex-col gap-1 bg-card pb-4 pt-2">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="ra-dec">RA & Dec</TabsTrigger>
                <TabsTrigger value="elevation">Elevation</TabsTrigger>
              </TabsList>
              <TabsList>
                <TabsTrigger value="constellations">Constellations</TabsTrigger>
                <TabsTrigger value="solar-system">Solar System</TabsTrigger>
                <TabsTrigger value="planets">Planets</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="general" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <LocationPicker
                  id="location"
                  value={locationSelectValue}
                  cities={observerCities}
                  loading={citiesLoading}
                  onCitySelect={(cityId) => handleLocationChange(cityId)}
                  onCustomSelect={() =>
                    handleLocationChange(CUSTOM_LOCATION_ID)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Observer location used for sky projection and rise/set times.
                </p>
                {isCustomLocation && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={openCustomLocationDialog}
                  >
                    {formatLocationCoordinates(
                      settings.latitude,
                      settings.longitude,
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="magnitude">Magnitude cutoff</Label>
                  <span className="text-sm text-muted-foreground">
                    +{settings.magnitudeCutoff.toFixed(1)}
                  </span>
                </div>
                <Slider
                  id="magnitude"
                  min={1}
                  max={8}
                  step={0.5}
                  value={[settings.magnitudeCutoff]}
                  onValueChange={(value) =>
                    updateSettings({ magnitudeCutoff: value[0] ?? 5 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Lower values show fewer, brighter stars. Default is +5.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="mirror">Mirror East / West</Label>
                  <p className="text-xs text-muted-foreground">
                    Swap E and W for looking up at the real sky.
                  </p>
                </div>
                <Switch
                  id="mirror"
                  checked={settings.mirrorEastWest}
                  onCheckedChange={(checked) =>
                    updateSettings({ mirrorEastWest: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="labels">Show star names</Label>
                  <p className="text-xs text-muted-foreground">
                    Label named stars on the chart.
                  </p>
                </div>
                <Switch
                  id="labels"
                  checked={settings.showLabels}
                  onCheckedChange={(checked) =>
                    updateSettings({ showLabels: checked })
                  }
                />
              </div>

              <div className="space-y-2 border-t border-border/60 pt-4">
                {confirmingReset ? (
                  <div className="space-y-3 rounded-md border border-border/60 p-3">
                    <p className="text-sm">
                      Reset all settings to their defaults?
                    </p>
                    <p className="text-sm">
                      Observer location will be kept. All other settings from
                      all tabs will be reset.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmingReset(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          resetSettings();
                          setConfirmingReset(false);
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => setConfirmingReset(true)}
                    >
                      Reset to defaults
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Restore all settings to defaults. Observer location is
                      preserved.
                    </p>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ra-dec" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="grid">RA / Dec Grid</Label>
                    <p className="text-xs text-muted-foreground">
                      Display right ascension and declination lines.
                    </p>
                  </div>
                  <Switch
                    id="grid"
                    checked={settings.showGrid}
                    onCheckedChange={(checked) =>
                      updateSettings({ showGrid: checked })
                    }
                  />
                </div>

                <div
                  className={cn(
                    "space-y-4 border-t border-border/60 pt-4",
                    !settings.showGrid && "pointer-events-none opacity-50",
                  )}
                >
                  <div className="space-y-2">
                    <Label htmlFor="grid-ra-spacing">RA Spacing</Label>
                    <Select
                      value={String(settings.gridRaSpacing)}
                      onValueChange={(value) =>
                        updateSettings({
                          gridRaSpacing: Number(value) as GridRaSpacing,
                        })
                      }
                      disabled={!settings.showGrid}
                    >
                      <SelectTrigger id="grid-ra-spacing">
                        <SelectValue placeholder="Select spacing" />
                      </SelectTrigger>
                      <SelectContent>
                        {RA_SPACING_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Hours between right ascension lines.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grid-dec-spacing">Dec Spacing</Label>
                    <Select
                      value={String(settings.gridDecSpacing)}
                      onValueChange={(value) =>
                        updateSettings({
                          gridDecSpacing: Number(value) as GridDecSpacing,
                        })
                      }
                      disabled={!settings.showGrid}
                    >
                      <SelectTrigger id="grid-dec-spacing">
                        <SelectValue placeholder="Select spacing" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEC_SPACING_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Degrees between declination lines.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Line Color</Label>
                    <ColorPicker
                      value={settings.gridLineColor}
                      onChange={(gridLineColor) =>
                        updateSettings({ gridLineColor })
                      }
                      presets={GRID_COLOR_PRESETS}
                      previewOpacity={settings.gridLineOpacity}
                      disabled={!settings.showGrid}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="grid-line-opacity">Line Opacity</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(settings.gridLineOpacity * 100)}%
                      </span>
                    </div>
                    <Slider
                      id="grid-line-opacity"
                      min={0}
                      max={100}
                      step={5}
                      value={[Math.round(settings.gridLineOpacity * 100)]}
                      disabled={!settings.showGrid}
                      onValueChange={(value) =>
                        updateSettings({
                          gridLineOpacity: (value[0] ?? 20) / 100,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="grid-line-thickness">
                        Line Thickness
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.gridLineThickness.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      id="grid-line-thickness"
                      min={1}
                      max={4}
                      step={1.0}
                      value={[settings.gridLineThickness]}
                      disabled={!settings.showGrid}
                      onValueChange={(value) =>
                        updateSettings({ gridLineThickness: value[0] ?? 1 })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Label Color</Label>
                    <ColorPicker
                      value={settings.gridLabelColor}
                      onChange={(gridLabelColor) =>
                        updateSettings({ gridLabelColor })
                      }
                      presets={GRID_COLOR_PRESETS}
                      previewOpacity={settings.gridLineOpacity}
                      disabled={!settings.showGrid}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="grid-label-font-size">
                        Label Font Size
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.gridLabelFontSize}px
                      </span>
                    </div>
                    <Slider
                      id="grid-label-font-size"
                      min={8}
                      max={18}
                      step={1}
                      value={[settings.gridLabelFontSize]}
                      disabled={!settings.showGrid}
                      onValueChange={(value) =>
                        updateSettings({ gridLabelFontSize: value[0] ?? 10 })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="elevation" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="elevation">Elevation Circles</Label>
                    <p className="text-xs text-muted-foreground">
                      Display concentric elevation angle circles.
                    </p>
                  </div>
                  <Switch
                    id="elevation"
                    checked={settings.showElevation}
                    onCheckedChange={(checked) =>
                      updateSettings({ showElevation: checked })
                    }
                  />
                </div>

                <div
                  className={cn(
                    "space-y-4 border-t border-border/60 pt-4",
                    !settings.showElevation && "pointer-events-none opacity-50",
                  )}
                >
                  <div className="space-y-2">
                    <Label htmlFor="elevation-spacing">Circle Spacing</Label>
                    <Select
                      value={String(settings.elevationSpacing)}
                      onValueChange={(value) =>
                        updateSettings({
                          elevationSpacing: Number(value) as ElevationSpacing,
                        })
                      }
                      disabled={!settings.showElevation}
                    >
                      <SelectTrigger id="elevation-spacing">
                        <SelectValue placeholder="Select spacing" />
                      </SelectTrigger>
                      <SelectContent>
                        {ELEVATION_SPACING_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Degrees between elevation circles.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="zenith-cross">Zenith Cross</Label>
                      <p className="text-xs text-muted-foreground">
                        Show a cross marker at the zenith.
                      </p>
                    </div>
                    <Switch
                      id="zenith-cross"
                      checked={settings.showZenithCross}
                      disabled={!settings.showElevation}
                      onCheckedChange={(checked) =>
                        updateSettings({ showZenithCross: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="elevation-labels">Elevation Labels</Label>
                      <p className="text-xs text-muted-foreground">
                        Show numeric elevation angle on each circle.
                      </p>
                    </div>
                    <Switch
                      id="elevation-labels"
                      checked={settings.showElevationLabels}
                      disabled={!settings.showElevation}
                      onCheckedChange={(checked) =>
                        updateSettings({ showElevationLabels: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Line Color</Label>
                    <ColorPicker
                      value={settings.elevationLineColor}
                      onChange={(elevationLineColor) =>
                        updateSettings({ elevationLineColor })
                      }
                      presets={GRID_COLOR_PRESETS}
                      previewOpacity={settings.elevationLineOpacity}
                      disabled={!settings.showElevation}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="elevation-line-opacity">
                        Line Opacity
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(settings.elevationLineOpacity * 100)}%
                      </span>
                    </div>
                    <Slider
                      id="elevation-line-opacity"
                      min={0}
                      max={100}
                      step={5}
                      value={[Math.round(settings.elevationLineOpacity * 100)]}
                      disabled={!settings.showElevation}
                      onValueChange={(value) =>
                        updateSettings({
                          elevationLineOpacity: (value[0] ?? 25) / 100,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="elevation-line-thickness">
                        Line Thickness
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.elevationLineThickness.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      id="elevation-line-thickness"
                      min={1}
                      max={4}
                      step={1.0}
                      value={[settings.elevationLineThickness]}
                      disabled={!settings.showElevation}
                      onValueChange={(value) =>
                        updateSettings({
                          elevationLineThickness: value[0] ?? 1,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Label Color</Label>
                    <ColorPicker
                      value={settings.elevationLabelColor}
                      onChange={(elevationLabelColor) =>
                        updateSettings({ elevationLabelColor })
                      }
                      presets={GRID_COLOR_PRESETS}
                      previewOpacity={settings.elevationLineOpacity}
                      disabled={!settings.showElevation}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="elevation-label-font-size">
                        Label Font Size
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.elevationLabelFontSize}px
                      </span>
                    </div>
                    <Slider
                      id="elevation-label-font-size"
                      min={8}
                      max={18}
                      step={1}
                      value={[settings.elevationLabelFontSize]}
                      disabled={!settings.showElevation}
                      onValueChange={(value) =>
                        updateSettings({
                          elevationLabelFontSize: value[0] ?? 10,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="constellations" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="constellations">Constellation Lines</Label>
                    <p className="text-xs text-muted-foreground">
                      Display stick-figure lines connecting stars in each
                      constellation.
                    </p>
                  </div>
                  <Switch
                    id="constellations"
                    checked={settings.showConstellations}
                    onCheckedChange={(checked) =>
                      updateSettings({ showConstellations: checked })
                    }
                  />
                </div>

                <div
                  className={cn(
                    "space-y-4 border-t border-border/60 pt-4",
                    !settings.showConstellations &&
                      "pointer-events-none opacity-50",
                  )}
                >
                  <div className="space-y-2">
                    <Label>Line Color</Label>
                    <ColorPicker
                      value={settings.constellationLineColor}
                      onChange={(constellationLineColor) =>
                        updateSettings({ constellationLineColor })
                      }
                      presets={GRID_COLOR_PRESETS}
                      previewOpacity={settings.constellationLineOpacity}
                      disabled={!settings.showConstellations}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="const-line-opacity">Line Opacity</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(settings.constellationLineOpacity * 100)}%
                      </span>
                    </div>
                    <Slider
                      id="const-line-opacity"
                      min={0}
                      max={100}
                      step={5}
                      value={[
                        Math.round(settings.constellationLineOpacity * 100),
                      ]}
                      disabled={!settings.showConstellations}
                      onValueChange={(value) =>
                        updateSettings({
                          constellationLineOpacity: (value[0] ?? 40) / 100,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="const-line-thickness">
                        Line Thickness
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.constellationLineThickness.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      id="const-line-thickness"
                      min={1}
                      max={4}
                      step={1.0}
                      value={[settings.constellationLineThickness]}
                      disabled={!settings.showConstellations}
                      onValueChange={(value) =>
                        updateSettings({
                          constellationLineThickness: value[0] ?? 1,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="constellation-labels">
                        Constellation Labels
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Show constellation names on the chart.
                      </p>
                    </div>
                    <Switch
                      id="constellation-labels"
                      checked={settings.showConstellationLabels}
                      disabled={!settings.showConstellations}
                      onCheckedChange={(checked) =>
                        updateSettings({ showConstellationLabels: checked })
                      }
                    />
                  </div>

                  <div
                    className={cn(
                      "space-y-4",
                      !settings.showConstellationLabels &&
                        "pointer-events-none opacity-50",
                    )}
                  >
                    <div className="space-y-2">
                      <Label>Label Color</Label>
                      <ColorPicker
                        value={settings.constellationLabelColor}
                        onChange={(constellationLabelColor) =>
                          updateSettings({ constellationLabelColor })
                        }
                        presets={GRID_COLOR_PRESETS}
                        previewOpacity={settings.constellationLineOpacity}
                        disabled={
                          !settings.showConstellations ||
                          !settings.showConstellationLabels
                        }
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="constellation-label-font-size">
                          Label Font Size
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          {settings.constellationLabelFontSize}px
                        </span>
                      </div>
                      <Slider
                        id="constellation-label-font-size"
                        min={8}
                        max={18}
                        step={1}
                        value={[settings.constellationLabelFontSize]}
                        disabled={
                          !settings.showConstellations ||
                          !settings.showConstellationLabels
                        }
                        onValueChange={(value) =>
                          updateSettings({
                            constellationLabelFontSize: value[0] ?? 10,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="const-bounds">
                      Constellation Boundaries
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Display IAU constellation boundary lines.
                    </p>
                  </div>
                  <Switch
                    id="const-bounds"
                    checked={settings.showConstellationBounds}
                    onCheckedChange={(checked) =>
                      updateSettings({ showConstellationBounds: checked })
                    }
                  />
                </div>

                <div
                  className={cn(
                    "space-y-4 border-t border-border/60 pt-4",
                    !settings.showConstellationBounds &&
                      "pointer-events-none opacity-50",
                  )}
                >
                  <div className="space-y-2">
                    <Label>Boundary Color</Label>
                    <ColorPicker
                      value={settings.constellationBoundsColor}
                      onChange={(constellationBoundsColor) =>
                        updateSettings({ constellationBoundsColor })
                      }
                      presets={GRID_COLOR_PRESETS}
                      previewOpacity={settings.constellationBoundsOpacity}
                      disabled={!settings.showConstellationBounds}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="const-bounds-opacity">
                        Boundary Opacity
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(settings.constellationBoundsOpacity * 100)}%
                      </span>
                    </div>
                    <Slider
                      id="const-bounds-opacity"
                      min={0}
                      max={100}
                      step={5}
                      value={[
                        Math.round(settings.constellationBoundsOpacity * 100),
                      ]}
                      disabled={!settings.showConstellationBounds}
                      onValueChange={(value) =>
                        updateSettings({
                          constellationBoundsOpacity: (value[0] ?? 15) / 100,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="const-bounds-thickness">
                        Boundary Thickness
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.constellationBoundsThickness.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      id="const-bounds-thickness"
                      min={1}
                      max={4}
                      step={1.0}
                      value={[settings.constellationBoundsThickness]}
                      disabled={!settings.showConstellationBounds}
                      onValueChange={(value) =>
                        updateSettings({
                          constellationBoundsThickness: value[0] ?? 1,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="solar-system" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="ecliptic">Ecliptic</Label>
                    <p className="text-xs text-muted-foreground">
                      Show the ecliptic — the Sun&apos;s apparent path across
                      the sky.
                    </p>
                  </div>
                  <Switch
                    id="ecliptic"
                    checked={settings.showEcliptic}
                    onCheckedChange={(checked) =>
                      updateSettings({ showEcliptic: checked })
                    }
                  />
                </div>

                <div
                  className={cn(
                    "space-y-4 border-t border-border/60 pt-4",
                    !settings.showEcliptic && "pointer-events-none opacity-50",
                  )}
                >
                  <div className="space-y-2">
                    <Label>Line Color</Label>
                    <ColorPicker
                      value={settings.eclipticLineColor}
                      onChange={(eclipticLineColor) =>
                        updateSettings({ eclipticLineColor })
                      }
                      presets={GRID_COLOR_PRESETS}
                      previewOpacity={settings.eclipticLineOpacity}
                      disabled={!settings.showEcliptic}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ecliptic-line-opacity">
                        Line Opacity
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(settings.eclipticLineOpacity * 100)}%
                      </span>
                    </div>
                    <Slider
                      id="ecliptic-line-opacity"
                      min={0}
                      max={100}
                      step={5}
                      value={[Math.round(settings.eclipticLineOpacity * 100)]}
                      disabled={!settings.showEcliptic}
                      onValueChange={(value) =>
                        updateSettings({
                          eclipticLineOpacity: (value[0] ?? 50) / 100,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ecliptic-line-thickness">
                        Line Thickness
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.eclipticLineThickness.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      id="ecliptic-line-thickness"
                      min={1}
                      max={4}
                      step={1.0}
                      value={[settings.eclipticLineThickness]}
                      disabled={!settings.showEcliptic}
                      onValueChange={(value) =>
                        updateSettings({
                          eclipticLineThickness: value[0] ?? 1.5,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="planets" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="planets">Show Planets</Label>
                    <p className="text-xs text-muted-foreground">
                      Display Mercury, Venus, Mars, Jupiter, and Saturn on the
                      chart.
                    </p>
                  </div>
                  <Switch
                    id="planets"
                    checked={settings.showPlanets}
                    onCheckedChange={(checked) =>
                      updateSettings({ showPlanets: checked })
                    }
                  />
                </div>

                <div
                  className={cn(
                    "space-y-4 border-t border-border/60 pt-4",
                    !settings.showPlanets && "pointer-events-none opacity-50",
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="planet-size-scale">Planet Size</Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.planetSizeScale.toFixed(1)}x
                      </span>
                    </div>
                    <Slider
                      id="planet-size-scale"
                      min={5}
                      max={20}
                      step={1}
                      value={[Math.round(settings.planetSizeScale * 10)]}
                      disabled={!settings.showPlanets}
                      onValueChange={(value) =>
                        updateSettings({
                          planetSizeScale: (value[0] ?? 10) / 10,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Scale planet marker size relative to apparent magnitude.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="planet-opacity">Opacity</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(settings.planetOpacity * 100)}%
                      </span>
                    </div>
                    <Slider
                      id="planet-opacity"
                      min={0}
                      max={100}
                      step={5}
                      value={[Math.round(settings.planetOpacity * 100)]}
                      disabled={!settings.showPlanets}
                      onValueChange={(value) =>
                        updateSettings({
                          planetOpacity: (value[0] ?? 100) / 100,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="planet-labels">Show Planet Names</Label>
                      <p className="text-xs text-muted-foreground">
                        Label planets on the chart.
                      </p>
                    </div>
                    <Switch
                      id="planet-labels"
                      checked={settings.showPlanetLabels}
                      disabled={!settings.showPlanets}
                      onCheckedChange={(checked) =>
                        updateSettings({ showPlanetLabels: checked })
                      }
                    />
                  </div>

                  <div
                    className={cn(
                      "space-y-3",
                      !settings.showPlanetLabels &&
                        "pointer-events-none opacity-50",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor="planet-label-font-size">
                        Label Font Size
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.planetLabelFontSize}px
                      </span>
                    </div>
                    <Slider
                      id="planet-label-font-size"
                      min={8}
                      max={18}
                      step={1}
                      value={[settings.planetLabelFontSize]}
                      disabled={
                        !settings.showPlanets || !settings.showPlanetLabels
                      }
                      onValueChange={(value) =>
                        updateSettings({
                          planetLabelFontSize: value[0] ?? 11,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </SheetBody>

        <SheetFooter className="justify-between">
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setAboutOpen(true)}
          >
            About Astro
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleOk}>OK</Button>
          </div>
        </SheetFooter>
      </SheetContent>

      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />

      <Dialog
        open={customDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleCustomLocationCancel();
            return;
          }
          setCustomDialogOpen(true);
        }}
      >
        <DialogContent onDismiss={handleCustomLocationCancel}>
          <DialogHeader>
            <DialogTitle>Custom location</DialogTitle>
            <DialogDescription>
              Enter observer latitude and longitude in degrees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="custom-latitude">Latitude</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!geolocationSupported || locating}
                  aria-label="Use current location"
                  title={
                    geolocationSupported
                      ? "Use current location"
                      : "Current location is not available in this browser"
                  }
                  onClick={handleUseCurrentLocation}
                >
                  {locating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {locateError && (
                <p className="text-xs text-destructive">{locateError}</p>
              )}
              <NumericInput
                id="custom-latitude"
                min={-90}
                max={90}
                value={draftLatitude}
                onChange={setDraftLatitude}
              />
              <p className="text-xs text-muted-foreground">
                Observer latitude in degrees (-90 to 90).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-longitude">Longitude</Label>
              <NumericInput
                id="custom-longitude"
                min={-180}
                max={180}
                value={draftLongitude}
                onChange={setDraftLongitude}
              />
              <p className="text-xs text-muted-foreground">
                Observer longitude in degrees (-180 to 180, positive east).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCustomLocationCancel}>
              Cancel
            </Button>
            <Button onClick={handleCustomLocationOk}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
