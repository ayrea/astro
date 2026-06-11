import { Settings as SettingsIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  SheetContent,
  SheetDescription,
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
  useSettings,
} from "@/context/SettingsContext";
import { cn } from "@/lib/utils";

const PARTIAL_NUMBER_PATTERN = /^-?\d*\.?\d*$/;

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

function rgbaToHex(color: string): string {
  const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);

  if (!match) {
    return "#38bdf8";
  }

  const [, red, green, blue] = match;
  return `#${[red, green, blue]
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

interface NumericInputProps {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function NumericInput({ id, value, min, max, onChange }: NumericInputProps) {
  const [text, setText] = useState(String(value));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(String(value));
    }
  }, [value]);

  const commitValue = (raw: string, fallback: number) => {
    const trimmed = raw.trim();
    if (
      trimmed === "" ||
      trimmed === "-" ||
      trimmed === "." ||
      trimmed === "-."
    ) {
      setText(String(fallback));
      onChange(fallback);
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setText(String(fallback));
      onChange(fallback);
      return;
    }

    const clamped = Math.min(max, Math.max(min, parsed));
    setText(String(clamped));
    onChange(clamped);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        commitValue(text, value);
      }}
      onChange={(event) => {
        const next = event.target.value;
        if (next !== "" && !PARTIAL_NUMBER_PATTERN.test(next)) {
          return;
        }

        setText(next);

        const parsed = Number(next);
        if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
          onChange(parsed);
        }
      }}
    />
  );
}

export function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed right-4 top-4 z-40 border-border/80 bg-card/80 backdrop-blur"
          aria-label="Open settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Configure your observer location and display options.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="general" className="mt-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="ra-dec">RA & Dec</TabsTrigger>
            <TabsTrigger value="elevation">Elevation</TabsTrigger>
            <TabsTrigger value="constellations">Constellations</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <NumericInput
                id="latitude"
                min={-90}
                max={90}
                value={settings.latitude}
                onChange={(latitude) => updateSettings({ latitude })}
              />
              <p className="text-xs text-muted-foreground">
                Observer latitude in degrees (-90 to 90).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <NumericInput
                id="longitude"
                min={-180}
                max={180}
                value={settings.longitude}
                onChange={(longitude) => updateSettings({ longitude })}
              />
              <p className="text-xs text-muted-foreground">
                Observer longitude in degrees (-180 to 180, positive east).
              </p>
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
                    Latitude and longitude values will be kept. All other
                    settings from all tabs will be reset.
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
                    Restore all settings to defaults. Latitude and longitude are
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
                  <div className="flex flex-wrap items-center gap-2">
                    {GRID_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        aria-label={preset.label}
                        disabled={!settings.showGrid}
                        onClick={() =>
                          updateSettings({ gridLineColor: preset.value })
                        }
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 disabled:cursor-not-allowed",
                          settings.gridLineColor === preset.value
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/80",
                        )}
                        style={{ backgroundColor: preset.value }}
                      />
                    ))}
                    <label
                      className={cn(
                        "relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-background",
                        !settings.showGrid && "cursor-not-allowed",
                      )}
                      aria-label="Custom line color"
                    >
                      <input
                        type="color"
                        value={rgbaToHex(settings.gridLineColor)}
                        disabled={!settings.showGrid}
                        onChange={(event) => {
                          const hex = event.target.value;
                          const red = Number.parseInt(hex.slice(1, 3), 16);
                          const green = Number.parseInt(hex.slice(3, 5), 16);
                          const blue = Number.parseInt(hex.slice(5, 7), 16);
                          updateSettings({
                            gridLineColor: `rgba(${red}, ${green}, ${blue}, 1)`,
                          });
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-muted-foreground">+</span>
                    </label>
                  </div>
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
                    <Label htmlFor="grid-line-thickness">Line Thickness</Label>
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
                  <div className="flex flex-wrap items-center gap-2">
                    {GRID_COLOR_PRESETS.map((preset) => (
                      <button
                        key={`label-${preset.value}`}
                        type="button"
                        aria-label={preset.label}
                        disabled={!settings.showGrid}
                        onClick={() =>
                          updateSettings({ gridLabelColor: preset.value })
                        }
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 disabled:cursor-not-allowed",
                          settings.gridLabelColor === preset.value
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/80",
                        )}
                        style={{ backgroundColor: preset.value }}
                      />
                    ))}
                    <label
                      className={cn(
                        "relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-background",
                        !settings.showGrid && "cursor-not-allowed",
                      )}
                      aria-label="Custom label color"
                    >
                      <input
                        type="color"
                        value={rgbaToHex(settings.gridLabelColor)}
                        disabled={!settings.showGrid}
                        onChange={(event) => {
                          const hex = event.target.value;
                          const red = Number.parseInt(hex.slice(1, 3), 16);
                          const green = Number.parseInt(hex.slice(3, 5), 16);
                          const blue = Number.parseInt(hex.slice(5, 7), 16);
                          updateSettings({
                            gridLabelColor: `rgba(${red}, ${green}, ${blue}, 1)`,
                          });
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-muted-foreground">+</span>
                    </label>
                  </div>
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
                  <div className="flex flex-wrap items-center gap-2">
                    {GRID_COLOR_PRESETS.map((preset) => (
                      <button
                        key={`elevation-line-${preset.value}`}
                        type="button"
                        aria-label={preset.label}
                        disabled={!settings.showElevation}
                        onClick={() =>
                          updateSettings({ elevationLineColor: preset.value })
                        }
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 disabled:cursor-not-allowed",
                          settings.elevationLineColor === preset.value
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/80",
                        )}
                        style={{ backgroundColor: preset.value }}
                      />
                    ))}
                    <label
                      className={cn(
                        "relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-background",
                        !settings.showElevation && "cursor-not-allowed",
                      )}
                      aria-label="Custom line color"
                    >
                      <input
                        type="color"
                        value={rgbaToHex(settings.elevationLineColor)}
                        disabled={!settings.showElevation}
                        onChange={(event) => {
                          const hex = event.target.value;
                          const red = Number.parseInt(hex.slice(1, 3), 16);
                          const green = Number.parseInt(hex.slice(3, 5), 16);
                          const blue = Number.parseInt(hex.slice(5, 7), 16);
                          updateSettings({
                            elevationLineColor: `rgba(${red}, ${green}, ${blue}, 1)`,
                          });
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-muted-foreground">+</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="elevation-line-opacity">Line Opacity</Label>
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
                  <div className="flex flex-wrap items-center gap-2">
                    {GRID_COLOR_PRESETS.map((preset) => (
                      <button
                        key={`elevation-label-${preset.value}`}
                        type="button"
                        aria-label={preset.label}
                        disabled={!settings.showElevation}
                        onClick={() =>
                          updateSettings({ elevationLabelColor: preset.value })
                        }
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 disabled:cursor-not-allowed",
                          settings.elevationLabelColor === preset.value
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/80",
                        )}
                        style={{ backgroundColor: preset.value }}
                      />
                    ))}
                    <label
                      className={cn(
                        "relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-background",
                        !settings.showElevation && "cursor-not-allowed",
                      )}
                      aria-label="Custom label color"
                    >
                      <input
                        type="color"
                        value={rgbaToHex(settings.elevationLabelColor)}
                        disabled={!settings.showElevation}
                        onChange={(event) => {
                          const hex = event.target.value;
                          const red = Number.parseInt(hex.slice(1, 3), 16);
                          const green = Number.parseInt(hex.slice(3, 5), 16);
                          const blue = Number.parseInt(hex.slice(5, 7), 16);
                          updateSettings({
                            elevationLabelColor: `rgba(${red}, ${green}, ${blue}, 1)`,
                          });
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-muted-foreground">+</span>
                    </label>
                  </div>
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
                  <div className="flex flex-wrap items-center gap-2">
                    {GRID_COLOR_PRESETS.map((preset) => (
                      <button
                        key={`const-line-${preset.value}`}
                        type="button"
                        aria-label={preset.label}
                        disabled={!settings.showConstellations}
                        onClick={() =>
                          updateSettings({
                            constellationLineColor: preset.value,
                          })
                        }
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 disabled:cursor-not-allowed",
                          settings.constellationLineColor === preset.value
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/80",
                        )}
                        style={{ backgroundColor: preset.value }}
                      />
                    ))}
                    <label
                      className={cn(
                        "relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-background",
                        !settings.showConstellations && "cursor-not-allowed",
                      )}
                      aria-label="Custom line color"
                    >
                      <input
                        type="color"
                        value={rgbaToHex(settings.constellationLineColor)}
                        disabled={!settings.showConstellations}
                        onChange={(event) => {
                          const hex = event.target.value;
                          const red = Number.parseInt(hex.slice(1, 3), 16);
                          const green = Number.parseInt(hex.slice(3, 5), 16);
                          const blue = Number.parseInt(hex.slice(5, 7), 16);
                          updateSettings({
                            constellationLineColor: `rgba(${red}, ${green}, ${blue}, 1)`,
                          });
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-muted-foreground">+</span>
                    </label>
                  </div>
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
                    <Label htmlFor="const-line-thickness">Line Thickness</Label>
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
                    <div className="flex flex-wrap items-center gap-2">
                      {GRID_COLOR_PRESETS.map((preset) => (
                        <button
                          key={`const-label-${preset.value}`}
                          type="button"
                          aria-label={preset.label}
                          disabled={
                            !settings.showConstellations ||
                            !settings.showConstellationLabels
                          }
                          onClick={() =>
                            updateSettings({
                              constellationLabelColor: preset.value,
                            })
                          }
                          className={cn(
                            "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 disabled:cursor-not-allowed",
                            settings.constellationLabelColor === preset.value
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border/80",
                          )}
                          style={{ backgroundColor: preset.value }}
                        />
                      ))}
                      <label
                        className={cn(
                          "relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-background",
                          (!settings.showConstellations ||
                            !settings.showConstellationLabels) &&
                            "cursor-not-allowed",
                        )}
                        aria-label="Custom label color"
                      >
                        <input
                          type="color"
                          value={rgbaToHex(settings.constellationLabelColor)}
                          disabled={
                            !settings.showConstellations ||
                            !settings.showConstellationLabels
                          }
                          onChange={(event) => {
                            const hex = event.target.value;
                            const red = Number.parseInt(hex.slice(1, 3), 16);
                            const green = Number.parseInt(hex.slice(3, 5), 16);
                            const blue = Number.parseInt(hex.slice(5, 7), 16);
                            updateSettings({
                              constellationLabelColor: `rgba(${red}, ${green}, ${blue}, 1)`,
                            });
                          }}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-muted-foreground">+</span>
                      </label>
                    </div>
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
                  <Label htmlFor="const-bounds">Constellation Boundaries</Label>
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
                  <div className="flex flex-wrap items-center gap-2">
                    {GRID_COLOR_PRESETS.map((preset) => (
                      <button
                        key={`const-bound-${preset.value}`}
                        type="button"
                        aria-label={preset.label}
                        disabled={!settings.showConstellationBounds}
                        onClick={() =>
                          updateSettings({
                            constellationBoundsColor: preset.value,
                          })
                        }
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 disabled:cursor-not-allowed",
                          settings.constellationBoundsColor === preset.value
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/80",
                        )}
                        style={{ backgroundColor: preset.value }}
                      />
                    ))}
                    <label
                      className={cn(
                        "relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-border/80 bg-background",
                        !settings.showConstellationBounds &&
                          "cursor-not-allowed",
                      )}
                      aria-label="Custom boundary color"
                    >
                      <input
                        type="color"
                        value={rgbaToHex(settings.constellationBoundsColor)}
                        disabled={!settings.showConstellationBounds}
                        onChange={(event) => {
                          const hex = event.target.value;
                          const red = Number.parseInt(hex.slice(1, 3), 16);
                          const green = Number.parseInt(hex.slice(3, 5), 16);
                          const blue = Number.parseInt(hex.slice(5, 7), 16);
                          updateSettings({
                            constellationBoundsColor: `rgba(${red}, ${green}, ${blue}, 1)`,
                          });
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-muted-foreground">+</span>
                    </label>
                  </div>
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
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
