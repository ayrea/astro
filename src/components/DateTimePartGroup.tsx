import { DateTimePartInput } from "@/components/DateTimePartInput";
import {
  buildObserverDateTime,
  getObserverDateTimeParts,
  type ObserverDateTimePart,
  type ObserverDateTimeParts,
} from "@/lib/dateTime";

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
  utcOffsetHours: number,
): { now: number; min: number; max: number } | undefined {
  const date = buildObserverDateTime(parts, utcOffsetHours);
  if (!date) {
    return undefined;
  }

  const localParts = getObserverDateTimeParts(date, utcOffsetHours);

  switch (part) {
    case "day":
      return { now: Number(localParts.day), min: 1, max: 31 };
    case "month": {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return {
        now: monthNames.indexOf(localParts.month) + 1,
        min: 1,
        max: 12,
      };
    }
    case "year":
      return { now: Number(localParts.year), min: 1, max: 9999 };
    case "hours":
      return { now: Number(localParts.hours), min: 0, max: 23 };
    case "minutes":
      return { now: Number(localParts.minutes), min: 0, max: 59 };
    case "seconds":
      return { now: Number(localParts.seconds), min: 0, max: 59 };
  }
}

interface DateTimePartGroupProps {
  parts: ObserverDateTimePart[];
  separator: "-" | ":";
  displayParts: ObserverDateTimeParts;
  utcOffsetHours: number;
  isLive: boolean;
  invalidPart: ObserverDateTimePart | null;
  onUpdatePart: (part: ObserverDateTimePart, value: string) => void;
  onCommitPart: (part: ObserverDateTimePart) => void;
  onStepPart: (part: ObserverDateTimePart, direction: 1 | -1) => void;
}

export function DateTimePartGroup({
  parts,
  separator,
  displayParts,
  utcOffsetHours,
  isLive,
  invalidPart,
  onUpdatePart,
  onCommitPart,
  onStepPart,
}: DateTimePartGroupProps) {
  return (
    <div className="flex items-center gap-0.5">
      {parts.map((part, index) => {
        const ariaValues = getPartAriaValues(
          part,
          displayParts,
          utcOffsetHours,
        );

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
