import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { applyOpacity, hexToRgba, rgbaToHex } from "@/lib/color";
import { cn } from "@/lib/utils";

export interface ColorPreset {
  label: string;
  value: string;
}

export interface ColorPickerProps {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  presets: ReadonlyArray<ColorPreset>;
  previewOpacity?: number;
  disabled?: boolean;
}

function ColorSwatch({
  color,
  previewOpacity,
  className,
}: {
  color: string;
  previewOpacity?: number;
  className?: string;
}) {
  const backgroundColor =
    previewOpacity !== undefined ? applyOpacity(color, previewOpacity) : color;

  return (
    <span
      className={cn(
        "inline-block h-4 w-4 shrink-0 rounded-full border border-border/80",
        className,
      )}
      style={{ backgroundColor }}
    />
  );
}

export function ColorPicker({
  id,
  value,
  onChange,
  presets,
  previewOpacity,
  disabled = false,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const triggerId = id ?? generatedId;

  const matchedPreset = presets.find((preset) => preset.value === value);
  const displayLabel = matchedPreset?.label ?? rgbaToHex(value).toUpperCase();
  const isCustom = !matchedPreset;

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ColorSwatch color={value} previewOpacity={previewOpacity} />
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-labelledby={triggerId}
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="p-1">
            {presets.map((preset) => {
              const selected = preset.value === value;

              return (
                <button
                  key={preset.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(preset.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                  )}
                >
                  <ColorSwatch
                    color={preset.value}
                    previewOpacity={previewOpacity}
                  />
                  <span>{preset.label}</span>
                  {selected && (
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mx-1 h-px bg-muted" />

          <div className="flex items-center gap-2 p-2">
            <ColorSwatch
              color={value}
              previewOpacity={previewOpacity}
              className="h-5 w-5"
            />
            <span className="flex-1 text-sm">Custom</span>
            <input
              type="color"
              value={rgbaToHex(value)}
              aria-label="Custom color"
              onChange={(event) => {
                onChange(hexToRgba(event.target.value));
              }}
              className="h-8 w-10 cursor-pointer rounded border border-border/80 bg-background p-0.5"
            />
            {isCustom && (
              <span className="flex h-3.5 w-3.5 items-center justify-center">
                <Check className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
