import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

const PARTIAL_NUMBER_PATTERN = /^-?\d*\.?\d*$/;

interface NumericInputProps {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function NumericInput({ id, value, min, max, onChange }: NumericInputProps) {
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
