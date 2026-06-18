export interface CrossingsDetail {
  isAboveHorizon: boolean;
  lastRise: Date | null;
  lastSet: Date | null;
  nextRise: Date | null;
  nextSet: Date | null;
}

interface Crossing {
  time: Date;
  rising: boolean;
}

export interface FindCrossingsOptions {
  getElevation: (
    date: Date,
    latitudeDegrees: number,
    longitudeDegrees: number,
  ) => number;
  horizonElevation: number;
  searchWindowMs: number;
  sampleStepMs: number;
  bisectToleranceMs?: number;
}

const DEFAULT_BISECT_TOLERANCE_MS = 1000;

function isAboveHorizon(elevation: number, horizonElevation: number): boolean {
  return elevation > horizonElevation;
}

function bisectCrossing(
  start: Date,
  end: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
  rising: boolean,
  getElevation: FindCrossingsOptions["getElevation"],
  horizonElevation: number,
  bisectToleranceMs: number,
): Date {
  let low = start.getTime();
  let high = end.getTime();

  while (high - low > bisectToleranceMs) {
    const mid = (low + high) / 2;
    const midDate = new Date(mid);
    const above = isAboveHorizon(
      getElevation(midDate, latitudeDegrees, longitudeDegrees),
      horizonElevation,
    );

    if (rising === above) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return new Date((low + high) / 2);
}

function findCrossingsInWindow(
  start: Date,
  end: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
  options: FindCrossingsOptions,
): Crossing[] {
  const {
    getElevation,
    horizonElevation,
    sampleStepMs,
    bisectToleranceMs = DEFAULT_BISECT_TOLERANCE_MS,
  } = options;
  const crossings: Crossing[] = [];

  let previousTime = start.getTime();
  let previousAbove = isAboveHorizon(
    getElevation(start, latitudeDegrees, longitudeDegrees),
    horizonElevation,
  );

  for (
    let timeMs = previousTime + sampleStepMs;
    timeMs <= end.getTime();
    timeMs += sampleStepMs
  ) {
    const currentDate = new Date(timeMs);
    const currentAbove = isAboveHorizon(
      getElevation(currentDate, latitudeDegrees, longitudeDegrees),
      horizonElevation,
    );

    if (currentAbove !== previousAbove) {
      const crossingTime = bisectCrossing(
        new Date(previousTime),
        currentDate,
        latitudeDegrees,
        longitudeDegrees,
        !previousAbove,
        getElevation,
        horizonElevation,
        bisectToleranceMs,
      );

      crossings.push({
        time: crossingTime,
        rising: !previousAbove,
      });
    }

    previousTime = timeMs;
    previousAbove = currentAbove;
  }

  return crossings;
}

export function findCrossings(
  now: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
  options: FindCrossingsOptions,
): CrossingsDetail {
  const nowMs = now.getTime();
  const windowStart = new Date(nowMs - options.searchWindowMs);
  const windowEnd = new Date(nowMs + options.searchWindowMs);

  const currentElevation = options.getElevation(
    now,
    latitudeDegrees,
    longitudeDegrees,
  );
  const isCurrentlyAbove = isAboveHorizon(
    currentElevation,
    options.horizonElevation,
  );

  const crossings = findCrossingsInWindow(
    windowStart,
    windowEnd,
    latitudeDegrees,
    longitudeDegrees,
    options,
  );

  let lastRise: Date | null = null;
  let lastSet: Date | null = null;
  let nextRise: Date | null = null;
  let nextSet: Date | null = null;

  for (const crossing of crossings) {
    const crossingMs = crossing.time.getTime();

    if (crossingMs <= nowMs) {
      if (crossing.rising) {
        lastRise = crossing.time;
      } else {
        lastSet = crossing.time;
      }
    } else if (crossing.rising && nextRise === null) {
      nextRise = crossing.time;
    } else if (!crossing.rising && nextSet === null) {
      nextSet = crossing.time;
    }
  }

  return {
    isAboveHorizon: isCurrentlyAbove,
    lastRise,
    lastSet,
    nextRise,
    nextSet,
  };
}
