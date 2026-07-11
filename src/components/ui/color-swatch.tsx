import { applyOpacity } from "@/lib/color";
import { cn } from "@/lib/utils";

interface ColorSwatchProps {
  color: string;
  previewOpacity?: number;
  className?: string;
}

export function ColorSwatch({
  color,
  previewOpacity,
  className,
}: ColorSwatchProps) {
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
