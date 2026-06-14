import { useCallback, useEffect, useState } from "react";

import { DateTimePartInput } from "@/components/DateTimePartInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useObserverTime } from "@/context/TimeContext";
import {
  buildObserverDateTime,
  getObserverDateTimeParts,
  stepObserverDateTimePart,
  type ObserverDateTimePart,
  type ObserverDateTimeParts,
} from "@/lib/dateTime";
import { cn } from "@/lib/utils";

const DATE_PARTS: ObserverDateTimePart[] = ["day", "month", "year"];
const TIME_PARTS: ObserverDateTimePart[] = ["hours", "minutes", "seconds"];
const DATE_TIME_PARTS: ObserverDateTimePart[] = [...DATE_PARTS, ...TIME_PARTS];

const PART_LABELS: Record<ObserverDateTimePart, string> = {
  day: "Day",
  month: "Month",
  year: "Year",
  hours: "Hours",
  minutes: "Minutes",
  seconds: "Seconds",
};

const PART_WIDTHS: Record<ObserverDateTimePart, string> = {
  day: "w-7",
  month: "w-9",
  year: "w-11",
  hours: "w-7",
  minutes: "w-7",
  seconds: "w-7",
};

const PART_MAX_LENGTH: Record<ObserverDateTimePart, number> = {
  day: 2,
  month: 3,
  year: 4,
  hours: 2,
  minutes: 2,
  seconds: 2,
};

function getPartAriaValues(
  part: ObserverDateTimePart,
  parts: ObserverDateTimeParts,
): { now: number; min: number; max: number } | undefined {
  const date = buildObserverDateTime(parts);
  if (!date) {
    return undefined;
  }

  switch (part) {
    case "day":
      return { now: date.getDate(), min: 1, max: 31 };
    case "month":
      return { now: date.getMonth() + 1, min: 1, max: 12 };
    case "year":
      return { now: date.getFullYear(), min: 1, max: 9999 };
    case "hours":
      return { now: date.getHours(), min: 0, max: 23 };
    case "minutes":
      return { now: date.getMinutes(), min: 0, max: 59 };
    case "seconds":
      return { now: date.getSeconds(), min: 0, max: 59 };
  }
}

interface DateTimePartGroupProps {
  parts: ObserverDateTimePart[];
  separator: "-" | ":";
  displayParts: ObserverDateTimeParts;
  isLive: boolean;
  invalidPart: ObserverDateTimePart | null;
  onUpdatePart: (part: ObserverDateTimePart, value: string) => void;
  onCommitPart: (part: ObserverDateTimePart) => void;
  onStepPart: (part: ObserverDateTimePart, direction: 1 | -1) => void;
}

function DateTimePartGroup({
  parts,
  separator,
  displayParts,
  isLive,
  invalidPart,
  onUpdatePart,
  onCommitPart,
  onStepPart,
}: DateTimePartGroupProps) {
  return (
    <div className="flex items-center gap-0.5">
      {parts.map((part, index) => {
        const ariaValues = getPartAriaValues(part, displayParts);

        return (
          <div key={part} className="flex items-center gap-0.5">
            <DateTimePartInput
              part={part}
              value={displayParts[part]}
              readOnly={isLive}
              invalid={invalidPart === part}
              ariaLabel={PART_LABELS[part]}
              widthClass={PART_WIDTHS[part]}
              inputMode={part === "month" ? "text" : "numeric"}
              maxLength={PART_MAX_LENGTH[part]}
              ariaValueNow={ariaValues?.now}
              ariaValueMin={ariaValues?.min}
              ariaValueMax={ariaValues?.max}
              onChange={(value) => onUpdatePart(part, value)}
              onCommit={() => onCommitPart(part)}
              onStep={(direction) => onStepPart(part, direction)}
            />
            {index < parts.length - 1 && (
              <span aria-hidden="true" className="px-0.5">
                {separator}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ObserverTimeControls() {
  const { observerTime, isLive, setLive, setObserverTime } = useObserverTime();
  const [draftParts, setDraftParts] = useState(() =>
    getObserverDateTimeParts(observerTime),
  );
  const [invalidPart, setInvalidPart] = useState<ObserverDateTimePart | null>(
    null,
  );

  const handleLiveChange = useCallback(
    (enabled: boolean) => {
      setLive(enabled);
      if (!enabled) {
        setDraftParts(getObserverDateTimeParts(new Date()));
        setInvalidPart(null);
      }
    },
    [setLive],
  );

  useEffect(() => {
    if (isLive && document.activeElement instanceof HTMLInputElement) {
      const part = document.activeElement.dataset.part;
      if (part && DATE_TIME_PARTS.includes(part as ObserverDateTimePart)) {
        document.activeElement.blur();
      }
    }
  }, [isLive]);

  const displayParts = isLive
    ? getObserverDateTimeParts(observerTime)
    : draftParts;

  const updateDraftPart = useCallback(
    (part: ObserverDateTimePart, value: string) => {
      setDraftParts((current) => ({ ...current, [part]: value }));
      setInvalidPart(null);
    },
    [],
  );

  const commitPart = useCallback(
    (part: ObserverDateTimePart) => {
      const parsed = buildObserverDateTime(draftParts);
      if (!parsed) {
        setInvalidPart(part);
        setDraftParts(getObserverDateTimeParts(observerTime));
        return;
      }

      setInvalidPart(null);
      setDraftParts(getObserverDateTimeParts(parsed));
      setObserverTime(parsed);
    },
    [draftParts, observerTime, setObserverTime],
  );

  const stepPart = useCallback(
    (part: ObserverDateTimePart, direction: 1 | -1) => {
      const next = stepObserverDateTimePart(observerTime, part, direction);
      setInvalidPart(null);
      setDraftParts(getObserverDateTimeParts(next));
      setObserverTime(next);
    },
    [observerTime, setObserverTime],
  );

  const partGroupProps = {
    displayParts,
    isLive,
    invalidPart,
    onUpdatePart: updateDraftPart,
    onCommitPart: commitPart,
    onStepPart: stepPart,
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Switch
          id="live-time"
          checked={isLive}
          onCheckedChange={handleLiveChange}
          aria-label="Use live date and time"
        />
        <Label htmlFor="live-time" className="text-xs text-muted-foreground">
          Live
        </Label>
      </div>
      <div
        aria-live={isLive ? "polite" : undefined}
        aria-label="Observer date and time"
        className={cn(
          "flex min-w-0 flex-col items-center gap-0.5 text-xs text-muted-foreground md:max-w-[min(100vw-8rem,28rem)] md:flex-row md:items-center",
        )}
      >
        <DateTimePartGroup
          parts={DATE_PARTS}
          separator="-"
          {...partGroupProps}
        />
        <span aria-hidden="true" className="mx-1 hidden md:inline">
          |
        </span>
        <DateTimePartGroup
          parts={TIME_PARTS}
          separator=":"
          {...partGroupProps}
        />
      </div>
    </div>
  );
}
