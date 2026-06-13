import {
  equatorialToHorizontal,
  getJulianDate,
  getLocalSiderealTime,
  normalizeDegrees,
  normalizeHours,
  OBLIQUITY_J2000_DEG,
  toDegrees,
  toRadians,
  type EquatorialCoordinates,
  type HorizontalCoordinates,
} from "@/lib/astronomy";

/** Standard geocentric moonrise/moonset horizon (degrees). */
const HORIZON_ELEVATION = 0.125;

const SAMPLE_STEP_MS = 5 * 60 * 1000;
const SEARCH_WINDOW_MS = 36 * 60 * 60 * 1000;
const BISECT_TOLERANCE_MS = 1000;

interface LongitudeTerm {
  d: number;
  m: number;
  mp: number;
  f: number;
  sumL: number;
}

interface LatitudeTerm {
  d: number;
  m: number;
  mp: number;
  f: number;
  sumB: number;
}

/** Meeus Astronomical Algorithms Ch. 47, Table 47.A (longitude). */
const LONGITUDE_TERMS: LongitudeTerm[] = [
  { d: 0, m: 0, mp: 1, f: 0, sumL: 6288774 },
  { d: 2, m: 0, mp: -1, f: 0, sumL: 1274027 },
  { d: 2, m: 0, mp: 0, f: 0, sumL: 658314 },
  { d: 0, m: 0, mp: 2, f: 0, sumL: 213618 },
  { d: 0, m: 1, mp: 0, f: 0, sumL: -185116 },
  { d: 0, m: 0, mp: 0, f: 2, sumL: -114332 },
  { d: 2, m: 0, mp: -2, f: 0, sumL: 58793 },
  { d: 2, m: -1, mp: -1, f: 0, sumL: 57066 },
  { d: 2, m: 0, mp: 1, f: 0, sumL: 53322 },
  { d: 2, m: -1, mp: 0, f: 0, sumL: 45758 },
  { d: 0, m: 1, mp: -1, f: 0, sumL: -40923 },
  { d: 1, m: 0, mp: 0, f: 0, sumL: -34720 },
  { d: 0, m: 1, mp: 1, f: 0, sumL: -30383 },
  { d: 2, m: 0, mp: 0, f: -2, sumL: 15327 },
  { d: 0, m: 0, mp: 1, f: 2, sumL: -12528 },
  { d: 0, m: 0, mp: 1, f: -2, sumL: 10980 },
  { d: 4, m: 0, mp: -1, f: 0, sumL: 10675 },
  { d: 0, m: 0, mp: 3, f: 0, sumL: 10034 },
  { d: 4, m: 0, mp: -2, f: 0, sumL: 8548 },
  { d: 2, m: 1, mp: -1, f: 0, sumL: -7888 },
  { d: 2, m: 1, mp: 0, f: 0, sumL: -6766 },
  { d: 1, m: 0, mp: -1, f: 0, sumL: -5163 },
  { d: 1, m: 1, mp: 0, f: 0, sumL: 4987 },
  { d: 2, m: -1, mp: 1, f: 0, sumL: 4036 },
  { d: 2, m: 0, mp: 2, f: 0, sumL: 3994 },
  { d: 4, m: 0, mp: 0, f: 0, sumL: 3861 },
  { d: 2, m: 0, mp: -3, f: 0, sumL: 3665 },
  { d: 0, m: 1, mp: -2, f: 0, sumL: -2689 },
  { d: 2, m: 0, mp: -1, f: 2, sumL: -2602 },
  { d: 2, m: -1, mp: -2, f: 0, sumL: 2390 },
  { d: 1, m: 0, mp: 1, f: 0, sumL: -2348 },
  { d: 2, m: -2, mp: 0, f: 0, sumL: 2236 },
  { d: 0, m: 1, mp: 2, f: 0, sumL: -2120 },
  { d: 0, m: 2, mp: 0, f: 0, sumL: -2069 },
  { d: 2, m: -2, mp: -1, f: 0, sumL: 2048 },
  { d: 2, m: 0, mp: 1, f: -2, sumL: -1773 },
  { d: 2, m: 0, mp: 0, f: 2, sumL: -1595 },
  { d: 4, m: -1, mp: -1, f: 0, sumL: 1215 },
  { d: 0, m: 0, mp: 2, f: 2, sumL: -1110 },
  { d: 3, m: 0, mp: -1, f: 0, sumL: -892 },
  { d: 2, m: 1, mp: 1, f: 0, sumL: -810 },
  { d: 4, m: -1, mp: -2, f: 0, sumL: 759 },
  { d: 0, m: 2, mp: -1, f: 0, sumL: -713 },
  { d: 2, m: 2, mp: -1, f: 0, sumL: -700 },
  { d: 2, m: 1, mp: -2, f: 0, sumL: 691 },
  { d: 2, m: -1, mp: 0, f: -2, sumL: 596 },
  { d: 4, m: 0, mp: 1, f: 0, sumL: 549 },
  { d: 0, m: 0, mp: 4, f: 0, sumL: 537 },
  { d: 4, m: -1, mp: 0, f: 0, sumL: 520 },
  { d: 1, m: 0, mp: -2, f: 0, sumL: -487 },
  { d: 2, m: 1, mp: 0, f: -2, sumL: -399 },
  { d: 0, m: 0, mp: 2, f: -2, sumL: -381 },
  { d: 1, m: 1, mp: 1, f: 0, sumL: 351 },
  { d: 3, m: 0, mp: -2, f: 0, sumL: -340 },
  { d: 4, m: 0, mp: -3, f: 0, sumL: 330 },
  { d: 2, m: -1, mp: 2, f: 0, sumL: 327 },
  { d: 0, m: 2, mp: 1, f: 0, sumL: -323 },
  { d: 1, m: 1, mp: -1, f: 0, sumL: 299 },
  { d: 2, m: 0, mp: 3, f: 0, sumL: 294 },
  { d: 2, m: 0, mp: -1, f: -2, sumL: 0 },
];

/** Meeus Astronomical Algorithms Ch. 47, Table 47.A (latitude). */
const LATITUDE_TERMS: LatitudeTerm[] = [
  { d: 0, m: 0, mp: 0, f: 1, sumB: 5128122 },
  { d: 0, m: 0, mp: 1, f: 1, sumB: 280602 },
  { d: 0, m: 0, mp: 1, f: -1, sumB: 277693 },
  { d: 2, m: 0, mp: 0, f: -1, sumB: 173237 },
  { d: 2, m: 0, mp: -1, f: 1, sumB: 55413 },
  { d: 2, m: 0, mp: -1, f: -1, sumB: 46271 },
  { d: 2, m: 0, mp: 0, f: 1, sumB: 32573 },
  { d: 0, m: 0, mp: 2, f: 1, sumB: 17198 },
  { d: 2, m: 0, mp: 1, f: -1, sumB: 9266 },
  { d: 0, m: 0, mp: 2, f: -1, sumB: 8822 },
  { d: 2, m: -1, mp: 0, f: -1, sumB: 8216 },
  { d: 2, m: 0, mp: -2, f: -1, sumB: 4324 },
  { d: 2, m: 0, mp: 1, f: 1, sumB: 4200 },
  { d: 2, m: 1, mp: 0, f: -1, sumB: -3359 },
  { d: 2, m: -1, mp: -1, f: 1, sumB: 2463 },
  { d: 2, m: -1, mp: 0, f: 1, sumB: 2211 },
  { d: 2, m: -1, mp: -1, f: -1, sumB: 2065 },
  { d: 0, m: 1, mp: -1, f: -1, sumB: -1870 },
  { d: 4, m: 0, mp: -1, f: -1, sumB: 1828 },
  { d: 0, m: 1, mp: 0, f: 1, sumB: -1794 },
  { d: 0, m: 0, mp: 0, f: 3, sumB: -1749 },
  { d: 0, m: 1, mp: -1, f: 1, sumB: -1565 },
  { d: 1, m: 0, mp: 0, f: 1, sumB: -1491 },
  { d: 0, m: 1, mp: 1, f: 1, sumB: -1475 },
  { d: 0, m: 1, mp: 1, f: -1, sumB: -1410 },
  { d: 0, m: 1, mp: 0, f: -1, sumB: -1344 },
  { d: 1, m: 0, mp: 0, f: -1, sumB: -1335 },
  { d: 0, m: 0, mp: 3, f: 1, sumB: 1107 },
  { d: 4, m: 0, mp: 0, f: -1, sumB: 1021 },
  { d: 4, m: 0, mp: -1, f: 1, sumB: 833 },
  { d: 0, m: 0, mp: 1, f: -3, sumB: 777 },
  { d: 4, m: 0, mp: -2, f: 1, sumB: 671 },
  { d: 2, m: 0, mp: 0, f: -3, sumB: 607 },
  { d: 2, m: 0, mp: 2, f: -1, sumB: 596 },
  { d: 2, m: -1, mp: 1, f: -1, sumB: 491 },
  { d: 2, m: 0, mp: -2, f: 1, sumB: -451 },
  { d: 0, m: 0, mp: 3, f: -1, sumB: 439 },
  { d: 2, m: 0, mp: 2, f: 1, sumB: 422 },
  { d: 2, m: 0, mp: -3, f: -1, sumB: 421 },
  { d: 2, m: 1, mp: -1, f: 1, sumB: -366 },
  { d: 2, m: 1, mp: 0, f: 1, sumB: -351 },
  { d: 4, m: 0, mp: 0, f: 1, sumB: 331 },
  { d: 2, m: -1, mp: 1, f: 1, sumB: 315 },
  { d: 2, m: -2, mp: 0, f: -1, sumB: 302 },
  { d: 0, m: 0, mp: 1, f: 3, sumB: -283 },
  { d: 2, m: 1, mp: 1, f: -1, sumB: -229 },
  { d: 1, m: 1, mp: 0, f: -1, sumB: 223 },
  { d: 1, m: 1, mp: 0, f: 1, sumB: 223 },
  { d: 0, m: 1, mp: -2, f: -1, sumB: -220 },
  { d: 2, m: 1, mp: -1, f: -1, sumB: -220 },
  { d: 1, m: 0, mp: 1, f: 1, sumB: -185 },
  { d: 2, m: -1, mp: -2, f: -1, sumB: 181 },
  { d: 0, m: 1, mp: 2, f: 1, sumB: -177 },
  { d: 4, m: 0, mp: -2, f: -1, sumB: 176 },
  { d: 4, m: -1, mp: -1, f: -1, sumB: 166 },
  { d: 1, m: 0, mp: 1, f: -1, sumB: -164 },
  { d: 4, m: 0, mp: 1, f: -1, sumB: 132 },
  { d: 1, m: 0, mp: -1, f: -1, sumB: -119 },
  { d: 4, m: -1, mp: 0, f: -1, sumB: 115 },
  { d: 2, m: -2, mp: 0, f: 1, sumB: 107 },
];

export interface MoonCrossings {
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

function meanElement(
  base: number,
  rate: number,
  t: number,
  t2 = 0,
  t3 = 0,
  t4 = 0,
): number {
  return normalizeDegrees(
    base + rate * t + t2 * t * t + t3 * t * t * t + t4 * t * t * t * t,
  );
}

function eccentricityFactor(mCoefficient: number, e: number): number {
  const absM = Math.abs(mCoefficient);
  if (absM === 1) {
    return e;
  }
  if (absM === 2) {
    return e * e;
  }
  return 1;
}

function eclipticLatLonToEquatorial(
  longitudeDeg: number,
  latitudeDeg: number,
  obliquityDeg: number = OBLIQUITY_J2000_DEG,
): EquatorialCoordinates {
  const lambda = toRadians(longitudeDeg);
  const beta = toRadians(latitudeDeg);
  const epsilon = toRadians(obliquityDeg);

  const sinDec =
    Math.sin(beta) * Math.cos(epsilon) +
    Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambda);
  const dec = Math.asin(sinDec);

  const y =
    Math.sin(lambda) * Math.cos(beta) * Math.cos(epsilon) -
    Math.sin(beta) * Math.sin(epsilon);
  const x = Math.cos(lambda) * Math.cos(beta);
  const ra = Math.atan2(y, x);

  return {
    raHours: normalizeHours(toDegrees(ra) / 15),
    decDegrees: toDegrees(dec),
  };
}

export function getMoonEquatorial(julianDate: number): EquatorialCoordinates {
  const t = (julianDate - 2_451_545) / 36_525;

  const lp = toRadians(
    meanElement(
      218.3164477,
      481267.88123421,
      t,
      -0.0015786,
      1 / 538841,
      -1 / 65_194_000,
    ),
  );
  const d = toRadians(
    meanElement(
      297.8501921,
      445267.1114034,
      t,
      -0.0018819,
      1 / 545868,
      -1 / 113_065_000,
    ),
  );
  const m = toRadians(
    meanElement(357.5291092, 35999.0502909, t, -0.0001536, 1 / 24_490_000),
  );
  const mp = toRadians(
    meanElement(
      134.9633964,
      477198.8675055,
      t,
      0.0087414,
      1 / 69699,
      -1 / 14_712_000,
    ),
  );
  const f = toRadians(
    meanElement(
      93.272095,
      483202.0175233,
      t,
      -0.0036539,
      -1 / 3_526_000,
      1 / 863_310_000,
    ),
  );

  const a1 = toRadians(119.75 + 131.849 * t);
  const a2 = toRadians(53.09 + 479264.29 * t);
  const a3 = toRadians(313.45 + 481266.484 * t);

  const e = 1 - 0.002516 * t - 0.0000074 * t * t;

  let sumLongitude = 0;
  for (const term of LONGITUDE_TERMS) {
    const argument = term.d * d + term.m * m + term.mp * mp + term.f * f;
    sumLongitude +=
      term.sumL * Math.sin(argument) * eccentricityFactor(term.m, e);
  }

  let sumLatitude = 0;
  for (const term of LATITUDE_TERMS) {
    const argument = term.d * d + term.m * m + term.mp * mp + term.f * f;
    sumLatitude +=
      term.sumB * Math.sin(argument) * eccentricityFactor(term.m, e);
  }

  sumLongitude +=
    3958 * Math.sin(a1) + 1962 * Math.sin(lp - f) + 318 * Math.sin(a2);
  sumLatitude +=
    -2235 * Math.sin(lp) +
    382 * Math.sin(a3) +
    175 * Math.sin(a1 - f) +
    175 * Math.sin(a1 + f) +
    127 * Math.sin(lp - mp) -
    115 * Math.sin(lp + mp);

  const eclipticLongitude = normalizeDegrees(
    toDegrees(lp) + sumLongitude / 1_000_000,
  );
  const eclipticLatitude = sumLatitude / 1_000_000;

  return eclipticLatLonToEquatorial(eclipticLongitude, eclipticLatitude);
}

export function getMoonHorizontal(
  date: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
): HorizontalCoordinates {
  const julianDate = getJulianDate(date);
  const { raHours, decDegrees } = getMoonEquatorial(julianDate);
  const lst = getLocalSiderealTime(julianDate, longitudeDegrees);

  return equatorialToHorizontal(raHours, decDegrees, latitudeDegrees, lst);
}

function getMoonElevation(
  date: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
): number {
  return getMoonHorizontal(date, latitudeDegrees, longitudeDegrees).elevation;
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
      getMoonElevation(midDate, latitudeDegrees, longitudeDegrees),
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
    getMoonElevation(start, latitudeDegrees, longitudeDegrees),
  );

  for (
    let timeMs = previousTime + stepMs;
    timeMs <= end.getTime();
    timeMs += stepMs
  ) {
    const currentDate = new Date(timeMs);
    const currentAbove = isAboveHorizon(
      getMoonElevation(currentDate, latitudeDegrees, longitudeDegrees),
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

export function findMoonCrossings(
  now: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
): MoonCrossings {
  const nowMs = now.getTime();
  const windowStart = new Date(nowMs - SEARCH_WINDOW_MS);
  const windowEnd = new Date(nowMs + SEARCH_WINDOW_MS);

  const currentElevation = getMoonElevation(
    now,
    latitudeDegrees,
    longitudeDegrees,
  );
  const isMoonAbove = isAboveHorizon(currentElevation);

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
    isAboveHorizon: isMoonAbove,
    lastRise,
    lastSet,
    nextRise,
    nextSet,
  };
}
