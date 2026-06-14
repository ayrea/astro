import type { KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
import type { ObserverDateTimePart } from "@/lib/dateTime";
import { cn } from "@/lib/utils";

interface DateTimePartInputProps {
  part: ObserverDateTimePart;
  value: string;
  readOnly: boolean;
  invalid?: boolean;
  ariaLabel: string;
  widthClass: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
  ariaValueNow?: number;
  ariaValueMin?: number;
  ariaValueMax?: number;
  onChange: (value: string) => void;
  onCommit: () => void;
  onStep: (direction: 1 | -1) => void;
}

export function DateTimePartInput({
  part,
  value,
  readOnly,
  invalid = false,
  ariaLabel,
  widthClass,
  inputMode = "numeric",
  maxLength,
  ariaValueNow,
  ariaValueMin,
  ariaValueMax,
  onChange,
  onCommit,
  onStep,
}: DateTimePartInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      onStep(1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      onStep(-1);
      return;
    }

    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  return (
    <Input
      value={value}
      readOnly={readOnly}
      inputMode={inputMode}
      maxLength={maxLength}
      role={readOnly ? undefined : "spinbutton"}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      aria-valuenow={readOnly ? undefined : ariaValueNow}
      aria-valuemin={readOnly ? undefined : ariaValueMin}
      aria-valuemax={readOnly ? undefined : ariaValueMax}
      data-part={part}
      tabIndex={readOnly ? -1 : 0}
      onMouseDown={(event) => {
        if (readOnly) {
          event.preventDefault();
        }
      }}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        if (!readOnly) {
          onCommit();
        }
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "h-8 min-w-0 px-1 text-center text-xs tabular-nums",
        widthClass,
        readOnly && "cursor-default opacity-90",
        invalid && "border-destructive",
      )}
    />
  );
}
