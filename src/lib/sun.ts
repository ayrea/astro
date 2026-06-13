import {
  eclipticToEquatorial,
  equatorialToHorizontal,
  getJulianDate,
  getLocalSiderealTime,
  normalizeDegrees,
  type EquatorialCoordinates,
  type HorizontalCoordinates,
} from "@/lib/astronomy";

/** Standard refraction horizon for sunrise/sunset (degrees). */
const HORIZON_ELEVATION = -0.833;

const SAMPLE_STEP_MS = 5 * 60 * 1000;
const SEARCH_WINDOW_MS = 36 * 60 * 60 * 1000;
const BISECT_TOLERANCE_MS = 1000;

export interface SunCrossings {
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

export function getSunEquatorial(julianDate: number): EquatorialCoordinates {
  const t = (julianDate - 2_451_545) / 36_525;
  const meanLongitude = normalizeDegrees(280.46646 + 36000.76983 * t);
  const meanAnomaly = normalizeDegrees(357.52911 + 35999.05029 * t);
  const anomalyRad = (meanAnomaly * Math.PI) / 180;

  const equationOfCenter =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(anomalyRad) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * anomalyRad) +
    0.000289 * Math.sin(3 * anomalyRad);

  const trueLongitude = normalizeDegrees(meanLongitude + equationOfCenter);
  const apparentLongitude = normalizeDegrees(
    trueLongitude -
      0.00569 -
      0.00478 * Math.sin(((125.04 - 1934.136 * t) * Math.PI) / 180),
  );

  return eclipticToEquatorial(apparentLongitude);
}

export function getSunHorizontal(
  date: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
): HorizontalCoordinates {
  const julianDate = getJulianDate(date);
  const { raHours, decDegrees } = getSunEquatorial(julianDate);
  const lst = getLocalSiderealTime(julianDate, longitudeDegrees);

  return equatorialToHorizontal(raHours, decDegrees, latitudeDegrees, lst);
}

function getSunElevation(
  date: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
): number {
  return getSunHorizontal(date, latitudeDegrees, longitudeDegrees).elevation;
}

function isAboveHorizon(
  elevation: number,
  horizonElevation: number = HORIZON_ELEVATION,
): boolean {
  return elevation > horizonElevation;
}

function bisectCrossing(
  start: Date,
  end: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
  rising: boolean,
): Date {
  let low = start.getTime();
  let high = end.getTime();

  while (high - low > BISECT_TOLERANCE_MS) {
    const mid = (low + high) / 2;
    const midDate = new Date(mid);
    const above = isAboveHorizon(
      getSunElevation(midDate, latitudeDegrees, longitudeDegrees),
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
): Crossing[] {
  const crossings: Crossing[] = [];
  const stepMs = SAMPLE_STEP_MS;

  let previousTime = start.getTime();
  let previousAbove = isAboveHorizon(
    getSunElevation(start, latitudeDegrees, longitudeDegrees),
  );

  for (
    let timeMs = previousTime + stepMs;
    timeMs <= end.getTime();
    timeMs += stepMs
  ) {
    const currentDate = new Date(timeMs);
    const currentAbove = isAboveHorizon(
      getSunElevation(currentDate, latitudeDegrees, longitudeDegrees),
    );

    if (currentAbove !== previousAbove) {
      const crossingTime = bisectCrossing(
        new Date(previousTime),
        currentDate,
        latitudeDegrees,
        longitudeDegrees,
        !previousAbove,
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

export function findSunCrossings(
  now: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
): SunCrossings {
  const nowMs = now.getTime();
  const windowStart = new Date(nowMs - SEARCH_WINDOW_MS);
  const windowEnd = new Date(nowMs + SEARCH_WINDOW_MS);

  const currentElevation = getSunElevation(
    now,
    latitudeDegrees,
    longitudeDegrees,
  );
  const isSunAbove = isAboveHorizon(currentElevation);

  const crossings = findCrossingsInWindow(
    windowStart,
    windowEnd,
    latitudeDegrees,
    longitudeDegrees,
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
    isAboveHorizon: isSunAbove,
    lastRise,
    lastSet,
    nextRise,
    nextSet,
  };
}
