import { Settings as SettingsIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useSettings } from "@/context/SettingsContext";

const PARTIAL_NUMBER_PATTERN = /^-?\d*\.?\d*$/;

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
  const { settings, updateSettings } = useSettings();

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

        <div className="mt-6 space-y-6">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
