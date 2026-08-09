import { useCallback, useEffect, useState } from "react";

import { DateTimePartGroup } from "@/components/DateTimePartGroup";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/context/SettingsContext";
import { useObserverTime } from "@/context/TimeContext";
import {
  buildObserverDateTime,
  getObserverDateTimeParts,
  stepObserverDateTimePart,
  type ObserverDateTimePart,
} from "@/lib/dateTime";
import { cn } from "@/lib/utils";

const DATE_PARTS: ObserverDateTimePart[] = ["day", "month", "year"];
const TIME_PARTS: ObserverDateTimePart[] = ["hours", "minutes", "seconds"];
const DATE_TIME_PARTS: ObserverDateTimePart[] = [...DATE_PARTS, ...TIME_PARTS];

export function ObserverTimeControls() {
  const { settings } = useSettings();
  const { observerTime, isLive, setLive, setObserverTime } = useObserverTime();
  const utcOffsetHours = settings.utcOffsetHours;
  const [draftParts, setDraftParts] = useState(() =>
    getObserverDateTimeParts(observerTime, utcOffsetHours),
  );
  const [invalidPart, setInvalidPart] = useState<ObserverDateTimePart | null>(
    null,
  );
  const [draftOffsetHours, setDraftOffsetHours] = useState(utcOffsetHours);

  // Re-derive wall-clock parts when the observing offset changes.
  if (utcOffsetHours !== draftOffsetHours) {
    setDraftOffsetHours(utcOffsetHours);
    setDraftParts(getObserverDateTimeParts(observerTime, utcOffsetHours));
    setInvalidPart(null);
  }

  const handleLiveChange = useCallback(
    (enabled: boolean) => {
      setLive(enabled);
      if (!enabled) {
        setDraftParts(getObserverDateTimeParts(new Date(), utcOffsetHours));
        setInvalidPart(null);
      }
    },
    [setLive, utcOffsetHours],
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
    ? getObserverDateTimeParts(observerTime, utcOffsetHours)
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
      const parsed = buildObserverDateTime(draftParts, utcOffsetHours);
      if (!parsed) {
        setInvalidPart(part);
        setDraftParts(getObserverDateTimeParts(observerTime, utcOffsetHours));
        return;
      }

      setInvalidPart(null);
      setDraftParts(getObserverDateTimeParts(parsed, utcOffsetHours));
      setObserverTime(parsed);
    },
    [draftParts, observerTime, setObserverTime, utcOffsetHours],
  );

  const stepPart = useCallback(
    (part: ObserverDateTimePart, direction: 1 | -1) => {
      const next = stepObserverDateTimePart(
        observerTime,
        part,
        direction,
        utcOffsetHours,
      );
      setInvalidPart(null);
      setDraftParts(getObserverDateTimeParts(next, utcOffsetHours));
      setObserverTime(next);
    },
    [observerTime, setObserverTime, utcOffsetHours],
  );

  const partGroupProps = {
    displayParts,
    utcOffsetHours,
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
