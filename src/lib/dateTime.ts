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

export function getObserverDateTimeParts(date: Date): ObserverDateTimeParts {
  return {
    day: padTwo(date.getDate()),
    month: MONTHS[date.getMonth()],
    year: date.getFullYear().toString(),
    hours: padTwo(date.getHours()),
    minutes: padTwo(date.getMinutes()),
    seconds: padTwo(date.getSeconds()),
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

  const date = new Date(year, monthIndex, day, hours, minutes, seconds);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes ||
    date.getSeconds() !== seconds
  ) {
    return null;
  }

  return date;
}

export function stepObserverDateTimePart(
  date: Date,
  part: ObserverDateTimePart,
  direction: 1 | -1,
): Date {
  const next = new Date(date.getTime());

  switch (part) {
    case "seconds":
      next.setSeconds(next.getSeconds() + direction);
      break;
    case "minutes":
      next.setMinutes(next.getMinutes() + direction);
      break;
    case "hours":
      next.setHours(next.getHours() + direction);
      break;
    case "day":
      next.setDate(next.getDate() + direction);
      break;
    case "month":
      next.setMonth(next.getMonth() + direction);
      break;
    case "year":
      next.setFullYear(next.getFullYear() + direction);
      break;
  }

  return next;
}

export function formatObserverDateTime(date: Date): string {
  const parts = getObserverDateTimeParts(date);
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hours}:${parts.minutes}:${parts.seconds}`;
}

const OBSERVER_DATE_TIME_PATTERN =
  /^(\d{2})-([A-Za-z]{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;

export function parseObserverDateTime(text: string): Date | null {
  const match = text.trim().match(OBSERVER_DATE_TIME_PATTERN);
  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText, hoursText, minutesText, secondsText] =
    match;

  return buildObserverDateTime({
    day: dayText,
    month: monthText,
    year: yearText,
    hours: hoursText,
    minutes: minutesText,
    seconds: secondsText,
  });
}
