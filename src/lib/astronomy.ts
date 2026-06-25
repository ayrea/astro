const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const HOURS_TO_RAD = Math.PI / 12;

export interface HorizontalCoordinates {
  elevation: number;
  azimuth: number;
}

export interface FrameConstants {
  sinLat: number;
  cosLat: number;
  lstRad: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
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

export function prepareFrameConstants(
  latitudeDegrees: number,
  localSiderealTimeHours: number,
): FrameConstants {
  const lat = toRadians(latitudeDegrees);

  return {
    sinLat: Math.sin(lat),
    cosLat: Math.cos(lat),
    lstRad: localSiderealTimeHours * HOURS_TO_RAD,
  };
}

export function equatorialToScreen(
  rightAscensionHours: number,
  declinationDegrees: number,
  frame: FrameConstants,
  radius: number,
  mirrorEastWest: boolean,
  out: ScreenPoint,
): void {
  const ra = rightAscensionHours * HOURS_TO_RAD;
  const dec = toRadians(declinationDegrees);
  const hourAngle = frame.lstRad - ra;
  const sinElev =
    Math.sin(dec) * frame.sinLat +
    Math.cos(dec) * frame.cosLat * Math.cos(hourAngle);
  const elevation = Math.asin(sinElev);
  const elevationDegrees = toDegrees(elevation);

  if (elevationDegrees < 0) {
    out.visible = false;
    return;
  }

  const cosAz =
    (Math.sin(dec) - Math.sin(elevation) * frame.sinLat) /
    (Math.cos(elevation) * frame.cosLat);

  let azimuth = Math.acos(Math.min(1, Math.max(-1, cosAz)));

  if (Math.sin(hourAngle) > 0) {
    azimuth = 2 * Math.PI - azimuth;
  }

  const projectedRadius = ((90 - elevationDegrees) / 90) * radius;
  let x = projectedRadius * Math.sin(azimuth);
  const y = -projectedRadius * Math.cos(azimuth);

  if (mirrorEastWest) {
    x = -x;
  }

  out.x = x;
  out.y = y;
  out.visible = true;
}

export function horizontalToEquatorial(
  elevationDegrees: number,
  azimuthDegrees: number,
  latitudeDegrees: number,
  localSiderealTimeHours: number,
): EquatorialCoordinates {
  const altitude = toRadians(elevationDegrees);
  const azimuth = toRadians(azimuthDegrees);
  const lat = toRadians(latitudeDegrees);

  const sinDec =
    Math.sin(lat) * Math.sin(altitude) +
    Math.cos(lat) * Math.cos(altitude) * Math.cos(azimuth);
  const dec = Math.asin(Math.min(1, Math.max(-1, sinDec)));
  const cosDec = Math.cos(dec);

  const cosHourAngle =
    (Math.sin(altitude) - Math.sin(lat) * Math.sin(dec)) /
    (Math.cos(lat) * cosDec);
  const sinHourAngle = (-Math.cos(altitude) * Math.sin(azimuth)) / cosDec;
  const hourAngle = Math.atan2(sinHourAngle, cosHourAngle);
  const raHours = normalizeHours(
    localSiderealTimeHours - toDegrees(hourAngle) / 15,
  );

  return {
    raHours,
    decDegrees: toDegrees(dec),
  };
}

export function screenToEquatorial(
  worldX: number,
  worldY: number,
  radius: number,
  mirrorEastWest: boolean,
  latitudeDegrees: number,
  localSiderealTimeHours: number,
): EquatorialCoordinates | null {
  if (radius <= 0) {
    return null;
  }

  let x = worldX;
  if (mirrorEastWest) {
    x = -x;
  }

  const projectedRadius = Math.hypot(x, worldY);
  if (projectedRadius > radius) {
    return null;
  }

  const elevationDegrees = 90 - (projectedRadius / radius) * 90;
  if (elevationDegrees < 0) {
    return null;
  }

  const azimuthDegrees = normalizeDegrees(toDegrees(Math.atan2(x, -worldY)));

  return horizontalToEquatorial(
    elevationDegrees,
    azimuthDegrees,
    latitudeDegrees,
    localSiderealTimeHours,
  );
}

export const B1875_T_CENTURIES = -1.25;

type Matrix3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export interface EquatorialCoordinates {
  raHours: number;
  decDegrees: number;
}

const ARCSEC_TO_RAD = Math.PI / (180 * 3600);
const J2000_TO_B1875_MATRIX = buildPrecessionMatrix(B1875_T_CENTURIES);

function buildPrecessionMatrix(tCenturies: number): Matrix3 {
  const t = tCenturies;
  const t2 = t * t;

  const zeta =
    (2306.2181 * t + 0.30188 * t2 + 0.017998 * t2 * t) * ARCSEC_TO_RAD;
  const z = (2306.2181 * t + 1.09468 * t2 + 0.018203 * t2 * t) * ARCSEC_TO_RAD;
  const theta =
    (2004.3109 * t - 0.42665 * t2 - 0.041833 * t2 * t) * ARCSEC_TO_RAD;

  const cosZeta = Math.cos(zeta);
  const sinZeta = Math.sin(zeta);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosZ = Math.cos(z);
  const sinZ = Math.sin(z);

  return [
    [
      cosZ * cosTheta * cosZeta - sinZ * sinZeta,
      -cosZ * cosTheta * sinZeta - sinZ * cosZeta,
      -cosZ * sinTheta,
    ],
    [
      sinZ * cosTheta * cosZeta + cosZ * sinZeta,
      -sinZ * cosTheta * sinZeta + cosZ * cosZeta,
      -sinZ * sinTheta,
    ],
    [sinTheta * cosZeta, -sinTheta * sinZeta, cosTheta],
  ];
}

function equatorialToUnitVector(
  rightAscensionHours: number,
  declinationDegrees: number,
): [number, number, number] {
  const ra = rightAscensionHours * HOURS_TO_RAD;
  const dec = toRadians(declinationDegrees);
  const cosDec = Math.cos(dec);

  return [cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec)];
}

function unitVectorToEquatorial(
  x: number,
  y: number,
  z: number,
): EquatorialCoordinates {
  const raRadians = Math.atan2(y, x);
  const decRadians = Math.asin(Math.min(1, Math.max(-1, z)));

  return {
    raHours: normalizeHours((raRadians * RAD_TO_DEG) / 15),
    decDegrees: toDegrees(decRadians),
  };
}

function applyPrecessionMatrix(
  vector: [number, number, number],
  matrix: Matrix3,
  transpose: boolean,
): [number, number, number] {
  if (transpose) {
    return [
      matrix[0][0] * vector[0] +
        matrix[1][0] * vector[1] +
        matrix[2][0] * vector[2],
      matrix[0][1] * vector[0] +
        matrix[1][1] * vector[1] +
        matrix[2][1] * vector[2],
      matrix[0][2] * vector[0] +
        matrix[1][2] * vector[1] +
        matrix[2][2] * vector[2],
    ];
  }

  return [
    matrix[0][0] * vector[0] +
      matrix[0][1] * vector[1] +
      matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] +
      matrix[1][1] * vector[1] +
      matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] +
      matrix[2][1] * vector[1] +
      matrix[2][2] * vector[2],
  ];
}

function precessRaDec(
  rightAscensionHours: number,
  declinationDegrees: number,
  matrix: Matrix3,
  transpose: boolean,
): EquatorialCoordinates {
  const vector = equatorialToUnitVector(
    rightAscensionHours,
    declinationDegrees,
  );
  const [x, y, z] = applyPrecessionMatrix(vector, matrix, transpose);

  return unitVectorToEquatorial(x, y, z);
}

export function j2000ToB1875(
  rightAscensionHours: number,
  declinationDegrees: number,
): EquatorialCoordinates {
  return precessRaDec(
    rightAscensionHours,
    declinationDegrees,
    J2000_TO_B1875_MATRIX,
    false,
  );
}

export function b1875ToJ2000(
  rightAscensionHours: number,
  declinationDegrees: number,
): EquatorialCoordinates {
  return precessRaDec(
    rightAscensionHours,
    declinationDegrees,
    J2000_TO_B1875_MATRIX,
    true,
  );
}

/** Mean obliquity of the ecliptic at J2000.0 (degrees). */
export const OBLIQUITY_J2000_DEG = 23.4393;

export function eclipticToEquatorial(
  eclipticLongitudeDeg: number,
  obliquityDeg: number = OBLIQUITY_J2000_DEG,
): EquatorialCoordinates {
  return eclipticLatLonToEquatorial(eclipticLongitudeDeg, 0, obliquityDeg);
}

export function eclipticLatLonToEquatorial(
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
  const sinElev =
    Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle);
  const elevation = Math.asin(sinElev);

  const cosAz =
    (Math.sin(dec) - Math.sin(elevation) * Math.sin(lat)) /
    (Math.cos(elevation) * Math.cos(lat));

  let azimuth = Math.acos(Math.min(1, Math.max(-1, cosAz)));

  if (Math.sin(hourAngle) > 0) {
    azimuth = 2 * Math.PI - azimuth;
  }

  return {
    elevation: toDegrees(elevation),
    azimuth: normalizeDegrees(toDegrees(azimuth)),
  };
}
