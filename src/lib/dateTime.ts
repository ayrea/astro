const MONTHS = [
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
] as const;

const MONTH_INDEX: Record<string, number> = Object.fromEntries(
  MONTHS.map((month, index) => [month.toLowerCase(), index]),
);

export type ObserverDateTimePart =
  | "day"
  | "month"
  | "year"
  | "hours"
  | "minutes"
  | "seconds";

export type ObserverDateTimeParts = Record<ObserverDateTimePart, string>;

function padTwo(value: number): string {
  return value.toString().padStart(2, "0");
}

function offsetMilliseconds(utcOffsetHours: number): number {
  return utcOffsetHours * 3_600_000;
}

function toObserverLocalDate(date: Date, utcOffsetHours: number): Date {
  return new Date(date.getTime() + offsetMilliseconds(utcOffsetHours));
}

export function formatUtcOffset(utcOffsetHours: number): string {
  const sign = utcOffsetHours >= 0 ? "+" : "-";
  const absolute = Math.abs(utcOffsetHours);
  const hours = Math.floor(absolute);
  const minutes = Math.round((absolute - hours) * 60);
  return `UTC${sign}${padTwo(hours)}:${padTwo(minutes)}`;
}

export function getObserverDateTimeParts(
  date: Date,
  utcOffsetHours: number,
): ObserverDateTimeParts {
  const local = toObserverLocalDate(date, utcOffsetHours);
  return {
    day: padTwo(local.getUTCDate()),
    month: MONTHS[local.getUTCMonth()],
    year: local.getUTCFullYear().toString(),
    hours: padTwo(local.getUTCHours()),
    minutes: padTwo(local.getUTCMinutes()),
    seconds: padTwo(local.getUTCSeconds()),
  };
}

function normalizeMonth(monthText: string): string | null {
  const monthIndex = MONTH_INDEX[monthText.trim().toLowerCase()];
  if (monthIndex === undefined) {
    return null;
  }

  return MONTHS[monthIndex];
}

export function buildObserverDateTime(
  parts: ObserverDateTimeParts,
  utcOffsetHours: number,
): Date | null {
  const month = normalizeMonth(parts.month);
  if (month === null) {
    return null;
  }

  const monthIndex = MONTH_INDEX[month.toLowerCase()];
  const day = Number(parts.day);
  const year = Number(parts.year);
  const hours = Number(parts.hours);
  const minutes = Number(parts.minutes);
  const seconds = Number(parts.seconds);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(year) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds)
  ) {
    return null;
  }

  const utcMillis =
    Date.UTC(year, monthIndex, day, hours, minutes, seconds) -
    offsetMilliseconds(utcOffsetHours);
  const date = new Date(utcMillis);

  const local = toObserverLocalDate(date, utcOffsetHours);
  if (
    local.getUTCFullYear() !== year ||
    local.getUTCMonth() !== monthIndex ||
    local.getUTCDate() !== day ||
    local.getUTCHours() !== hours ||
    local.getUTCMinutes() !== minutes ||
    local.getUTCSeconds() !== seconds
  ) {
    return null;
  }

  return date;
}

export function stepObserverDateTimePart(
  date: Date,
  part: ObserverDateTimePart,
  direction: 1 | -1,
  utcOffsetHours: number,
): Date {
  const local = toObserverLocalDate(date, utcOffsetHours);

  switch (part) {
    case "seconds":
      local.setUTCSeconds(local.getUTCSeconds() + direction);
      break;
    case "minutes":
      local.setUTCMinutes(local.getUTCMinutes() + direction);
      break;
    case "hours":
      local.setUTCHours(local.getUTCHours() + direction);
      break;
    case "day":
      local.setUTCDate(local.getUTCDate() + direction);
      break;
    case "month":
      local.setUTCMonth(local.getUTCMonth() + direction);
      break;
    case "year":
      local.setUTCFullYear(local.getUTCFullYear() + direction);
      break;
  }

  return new Date(local.getTime() - offsetMilliseconds(utcOffsetHours));
}

export function formatObserverDateTime(
  date: Date,
  utcOffsetHours: number,
): string {
  const parts = getObserverDateTimeParts(date, utcOffsetHours);
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hours}:${parts.minutes}:${parts.seconds}`;
}

export function formatObserverTime(
  date: Date,
  utcOffsetHours: number,
  includeSeconds: boolean = false,
): string {
  const parts = getObserverDateTimeParts(date, utcOffsetHours);
  return includeSeconds
    ? `${parts.hours}:${parts.minutes}:${parts.seconds}`
    : `${parts.hours}:${parts.minutes}`;
}

const OBSERVER_DATE_TIME_PATTERN =
  /^(\d{2})-([A-Za-z]{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;

export function parseObserverDateTime(
  text: string,
  utcOffsetHours: number,
): Date | null {
  const match = text.trim().match(OBSERVER_DATE_TIME_PATTERN);
  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText, hoursText, minutesText, secondsText] =
    match;

  return buildObserverDateTime(
    {
      day: dayText,
      month: monthText,
      year: yearText,
      hours: hoursText,
      minutes: minutesText,
      seconds: secondsText,
    },
    utcOffsetHours,
  );
}
