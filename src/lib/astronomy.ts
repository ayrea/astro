const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const HOURS_TO_RAD = Math.PI / 12;

export interface HorizontalCoordinates {
  altitude: number;
  azimuth: number;
}

export function toRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

export function toDegrees(radians: number): number {
  return radians * RAD_TO_DEG;
}

export function normalizeDegrees(degrees: number): number {
  let value = degrees % 360;
  if (value < 0) {
    value += 360;
  }
  return value;
}

export function normalizeHours(hours: number): number {
  let value = hours % 24;
  if (value < 0) {
    value += 24;
  }
  return value;
}

export function getJulianDate(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3_600_000;

  let y = year;
  let m = month;

  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);

  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5 +
    hour / 24
  );
}

export function getGreenwichMeanSiderealTime(julianDate: number): number {
  const t = (julianDate - 2_451_545) / 36_525;
  const gmst =
    18.697_374_558 +
    24.065_709_824_419_08 * (julianDate - 2_451_545) +
    0.000_026 * t * t;

  return normalizeHours(gmst);
}

export function getLocalSiderealTime(
  julianDate: number,
  longitudeDegrees: number,
): number {
  const gmst = getGreenwichMeanSiderealTime(julianDate);
  const longitudeHours = longitudeDegrees / 15;
  return normalizeHours(gmst + longitudeHours);
}

export function equatorialToHorizontal(
  rightAscensionHours: number,
  declinationDegrees: number,
  latitudeDegrees: number,
  localSiderealTimeHours: number,
): HorizontalCoordinates {
  const ra = rightAscensionHours * HOURS_TO_RAD;
  const dec = toRadians(declinationDegrees);
  const lat = toRadians(latitudeDegrees);
  const lst = localSiderealTimeHours * HOURS_TO_RAD;

  const hourAngle = lst - ra;
  const sinAlt =
    Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle);
  const altitude = Math.asin(sinAlt);

  const cosAz =
    (Math.sin(dec) - Math.sin(altitude) * Math.sin(lat)) /
    (Math.cos(altitude) * Math.cos(lat));

  let azimuth = Math.acos(Math.min(1, Math.max(-1, cosAz)));

  if (Math.sin(hourAngle) > 0) {
    azimuth = 2 * Math.PI - azimuth;
  }

  return {
    altitude: toDegrees(altitude),
    azimuth: normalizeDegrees(toDegrees(azimuth)),
  };
}
