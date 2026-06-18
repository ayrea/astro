import {
  eclipticToEquatorial,
  equatorialToHorizontal,
  getJulianDate,
  getLocalSiderealTime,
  normalizeDegrees,
  type EquatorialCoordinates,
  type HorizontalCoordinates,
} from "@/lib/astronomy";
import { findCrossings, type CrossingsDetail } from "@/lib/crossings";

/** Standard refraction horizon for sunrise/sunset (degrees). */
const HORIZON_ELEVATION = -0.833;

const SAMPLE_STEP_MS = 5 * 60 * 1000;
const SEARCH_WINDOW_MS = 36 * 60 * 60 * 1000;

export type SunCrossings = CrossingsDetail;

export function getSunEclipticLongitude(julianDate: number): number {
  const t = (julianDate - 2_451_545) / 36_525;
  const meanLongitude = normalizeDegrees(280.46646 + 36000.76983 * t);
  const meanAnomaly = normalizeDegrees(357.52911 + 35999.05029 * t);
  const anomalyRad = (meanAnomaly * Math.PI) / 180;

  const equationOfCenter =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(anomalyRad) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * anomalyRad) +
    0.000289 * Math.sin(3 * anomalyRad);

  const trueLongitude = normalizeDegrees(meanLongitude + equationOfCenter);
  return normalizeDegrees(
    trueLongitude -
      0.00569 -
      0.00478 * Math.sin(((125.04 - 1934.136 * t) * Math.PI) / 180),
  );
}

export function getSunEquatorial(julianDate: number): EquatorialCoordinates {
  return eclipticToEquatorial(getSunEclipticLongitude(julianDate));
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

export function findSunCrossings(
  now: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
): SunCrossings {
  return findCrossings(now, latitudeDegrees, longitudeDegrees, {
    getElevation: getSunElevation,
    horizonElevation: HORIZON_ELEVATION,
    searchWindowMs: SEARCH_WINDOW_MS,
    sampleStepMs: SAMPLE_STEP_MS,
  });
}
