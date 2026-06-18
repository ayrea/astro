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
import { findCrossings, type CrossingsDetail } from "@/lib/crossings";
import { getSunEclipticLongitude } from "@/lib/sun";

export interface PlanetPosition {
  name: string;
  color: string;
  raHours: number;
  decDegrees: number;
  magnitude: number;
}

interface OrbitalElements {
  name: string;
  color: string;
  n0: number;
  nRate: number;
  i0: number;
  iRate: number;
  w0: number;
  wRate: number;
  a: number;
  e0: number;
  eRate: number;
  m0: number;
  mRate: number;
  /** Outer planets use log10(r) in magnitude; inner use log10(r*R). */
  outerPlanet: boolean;
  magnitudeBase: number;
  magnitudePhaseCoeff: number;
  magnitudePhasePower?: number;
  magnitudePhasePowerCoeff?: number;
}

/** Paul Schlyter low-precision orbital elements (degrees / AU). */
const ORBITAL_ELEMENTS: OrbitalElements[] = [
  {
    name: "Mercury",
    color: "rgba(176, 168, 160, 1)",
    n0: 48.3313,
    nRate: 3.24587e-5,
    i0: 7.0047,
    iRate: 5.0e-8,
    w0: 29.1241,
    wRate: 1.01444e-5,
    a: 0.387098,
    e0: 0.205635,
    eRate: 5.59e-10,
    m0: 168.6562,
    mRate: 4.0923344368,
    outerPlanet: false,
    magnitudeBase: -0.36,
    magnitudePhaseCoeff: 0.027,
    magnitudePhasePower: 6,
    magnitudePhasePowerCoeff: 2.2e-13,
  },
  {
    name: "Venus",
    color: "rgba(245, 222, 179, 1)",
    n0: 76.6799,
    nRate: 2.4659e-5,
    i0: 3.3946,
    iRate: 2.75e-8,
    w0: 54.891,
    wRate: 1.38374e-5,
    a: 0.72333,
    e0: 0.006773,
    eRate: -1.302e-9,
    m0: 48.0052,
    mRate: 1.6021302244,
    outerPlanet: false,
    magnitudeBase: -4.34,
    magnitudePhaseCoeff: 0.013,
    magnitudePhasePower: 3,
    magnitudePhasePowerCoeff: 4.2e-7,
  },
  {
    name: "Earth",
    color: "rgba(0, 0, 0, 0)",
    n0: 0,
    nRate: 0,
    i0: 0,
    iRate: 0,
    w0: 282.9404,
    wRate: 4.46967e-5,
    a: 1.0,
    e0: 0.016709,
    eRate: -1.151e-9,
    m0: 356.047,
    mRate: 0.9856002585,
    outerPlanet: false,
    magnitudeBase: 0,
    magnitudePhaseCoeff: 0,
  },
  {
    name: "Mars",
    color: "rgba(255, 110, 70, 1)",
    n0: 49.5574,
    nRate: 2.11081e-5,
    i0: 1.8497,
    iRate: -1.78e-8,
    w0: 286.5016,
    wRate: 2.92961e-5,
    a: 1.523688,
    e0: 0.093405,
    eRate: 2.516e-9,
    m0: 18.6021,
    mRate: 0.5240207766,
    outerPlanet: false,
    magnitudeBase: -1.51,
    magnitudePhaseCoeff: 0.016,
  },
  {
    name: "Jupiter",
    color: "rgba(214, 184, 140, 1)",
    n0: 100.4542,
    nRate: 2.76854e-5,
    i0: 1.303,
    iRate: -1.557e-7,
    w0: 273.8777,
    wRate: 1.64505e-5,
    a: 5.20256,
    e0: 0.048498,
    eRate: 4.469e-9,
    m0: 19.895,
    mRate: 0.0830853001,
    outerPlanet: true,
    magnitudeBase: -9.4,
    magnitudePhaseCoeff: 0.005,
  },
  {
    name: "Saturn",
    color: "rgba(230, 207, 150, 1)",
    n0: 113.6634,
    nRate: 2.3898e-5,
    i0: 2.4886,
    iRate: -1.081e-7,
    w0: 339.3939,
    wRate: 2.97661e-5,
    a: 9.55475,
    e0: 0.055546,
    eRate: -9.499e-9,
    m0: 316.967,
    mRate: 0.0334442282,
    outerPlanet: true,
    magnitudeBase: -8.88,
    magnitudePhaseCoeff: 0.044,
  },
];

const NAKED_EYE_PLANETS = new Set([
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
]);

export const PLANET_NAMES = [
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
] as const;

export type PlanetName = (typeof PLANET_NAMES)[number];

/** Geometric horizon for planet rise/set (degrees). */
const HORIZON_ELEVATION = 0;

const SAMPLE_STEP_MS = 15 * 60 * 1000;
const SEARCH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

interface HeliocentricRectangular {
  x: number;
  y: number;
  z: number;
  r: number;
}

function solveKepler(meanAnomalyRad: number, eccentricity: number): number {
  let eccentricAnomaly =
    meanAnomalyRad +
    eccentricity *
      Math.sin(meanAnomalyRad) *
      (1 + eccentricity * Math.cos(meanAnomalyRad));

  for (let iteration = 0; iteration < 5; iteration++) {
    eccentricAnomaly =
      meanAnomalyRad + eccentricity * Math.sin(eccentricAnomaly);
  }

  return eccentricAnomaly;
}

function getHeliocentricRectangular(
  elements: OrbitalElements,
  daysSinceEpoch: number,
): HeliocentricRectangular {
  const n = elements.n0 + elements.nRate * daysSinceEpoch;
  const inclination = toRadians(elements.i0 + elements.iRate * daysSinceEpoch);
  const argumentOfPerihelion = toRadians(
    elements.w0 + elements.wRate * daysSinceEpoch,
  );
  const eccentricity = elements.e0 + elements.eRate * daysSinceEpoch;
  const meanAnomaly = toRadians(
    normalizeDegrees(elements.m0 + elements.mRate * daysSinceEpoch),
  );
  const ascendingNode = toRadians(n);

  const eccentricAnomaly = solveKepler(meanAnomaly, eccentricity);
  const xv = elements.a * (Math.cos(eccentricAnomaly) - eccentricity);
  const yv =
    elements.a *
    Math.sqrt(1 - eccentricity * eccentricity) *
    Math.sin(eccentricAnomaly);
  const trueAnomaly = Math.atan2(yv, xv);
  const radius = Math.hypot(xv, yv);
  const vw = trueAnomaly + argumentOfPerihelion;

  const cosN = Math.cos(ascendingNode);
  const sinN = Math.sin(ascendingNode);
  const cosVw = Math.cos(vw);
  const sinVw = Math.sin(vw);
  const cosI = Math.cos(inclination);

  return {
    x: radius * (cosN * cosVw - sinN * sinVw * cosI),
    y: radius * (sinN * cosVw + cosN * sinVw * cosI),
    z: radius * (sinVw * Math.sin(inclination)),
    r: radius,
  };
}

function rectangularEclipticToEquatorial(
  x: number,
  y: number,
  z: number,
): EquatorialCoordinates {
  const obliquity = toRadians(OBLIQUITY_J2000_DEG);
  const equatorialY = y * Math.cos(obliquity) - z * Math.sin(obliquity);
  const equatorialZ = y * Math.sin(obliquity) + z * Math.cos(obliquity);
  const ra = Math.atan2(equatorialY, x);
  const dec = Math.atan2(equatorialZ, Math.hypot(x, equatorialY));

  return {
    raHours: normalizeHours(toDegrees(ra) / 15),
    decDegrees: toDegrees(dec),
  };
}

function getSunGeocentricEcliptic(
  julianDate: number,
  earthSunDistance: number,
): { x: number; y: number; z: number } {
  const sunLongitude = toRadians(getSunEclipticLongitude(julianDate));

  return {
    x: earthSunDistance * Math.cos(sunLongitude),
    y: earthSunDistance * Math.sin(sunLongitude),
    z: 0,
  };
}

function applyJupiterPerturbations(
  longitudeDeg: number,
  latitudeDeg: number,
  daysSinceEpoch: number,
): { longitude: number; latitude: number } {
  const mj = normalizeDegrees(19.895 + 0.0830853001 * daysSinceEpoch);
  const ms = normalizeDegrees(356.047 + 0.9856002585 * daysSinceEpoch);
  const mjRad = toRadians(mj);
  const msRad = toRadians(ms);

  const longitude =
    longitudeDeg -
    0.332 * Math.sin(2 * mjRad - 5 * msRad - toRadians(67.6)) -
    0.056 * Math.sin(2 * mjRad - 2 * msRad + toRadians(21)) +
    0.042 * Math.sin(3 * mjRad - 5 * msRad + toRadians(21)) -
    0.036 * Math.sin(mjRad - 2 * msRad) +
    0.022 * Math.cos(mjRad - msRad) +
    0.023 * Math.sin(2 * mjRad - 3 * msRad + toRadians(52)) -
    0.016 * Math.sin(mjRad - 5 * msRad - toRadians(69));

  return { longitude, latitude: latitudeDeg };
}

function applySaturnPerturbations(
  longitudeDeg: number,
  latitudeDeg: number,
  daysSinceEpoch: number,
): { longitude: number; latitude: number } {
  const mj = normalizeDegrees(19.895 + 0.0830853001 * daysSinceEpoch);
  const ms = normalizeDegrees(356.047 + 0.9856002585 * daysSinceEpoch);
  const mjRad = toRadians(mj);
  const msRad = toRadians(ms);

  const longitude =
    longitudeDeg +
    0.812 * Math.sin(2 * mjRad - 5 * msRad - toRadians(67.6)) -
    0.229 * Math.cos(2 * mjRad - 4 * msRad - toRadians(2)) +
    0.119 * Math.sin(mjRad - 2 * msRad - toRadians(3)) +
    0.046 * Math.sin(2 * mjRad - 6 * msRad - toRadians(49)) +
    0.014 * Math.sin(mjRad - 3 * msRad + toRadians(11));

  const latitude =
    latitudeDeg -
    0.02 * Math.cos(2 * mjRad - 4 * msRad - toRadians(2)) +
    0.018 * Math.sin(2 * mjRad - 6 * msRad - toRadians(49));

  return { longitude, latitude };
}

function heliocentricEclipticToRectangular(
  longitudeDeg: number,
  latitudeDeg: number,
  radius: number,
): HeliocentricRectangular {
  const longitude = toRadians(longitudeDeg);
  const latitude = toRadians(latitudeDeg);
  const cosLat = Math.cos(latitude);

  return {
    x: radius * Math.cos(longitude) * cosLat,
    y: radius * Math.sin(longitude) * cosLat,
    z: radius * Math.sin(latitude),
    r: radius,
  };
}
function rectangularToEcliptic(
  x: number,
  y: number,
  z: number,
): { longitude: number; latitude: number; distance: number } {
  const distance = Math.hypot(x, y, z);
  const longitude = normalizeDegrees(toDegrees(Math.atan2(y, x)));
  const latitude = toDegrees(Math.atan2(z, Math.hypot(x, y)));

  return { longitude, latitude, distance };
}

function applyHeliocentricPerturbations(
  elements: OrbitalElements,
  planet: HeliocentricRectangular,
  daysSinceEpoch: number,
): HeliocentricRectangular {
  let { longitude, latitude } = rectangularToEcliptic(
    planet.x,
    planet.y,
    planet.z,
  );

  if (elements.name === "Jupiter") {
    ({ longitude, latitude } = applyJupiterPerturbations(
      longitude,
      latitude,
      daysSinceEpoch,
    ));
  } else if (elements.name === "Saturn") {
    ({ longitude, latitude } = applySaturnPerturbations(
      longitude,
      latitude,
      daysSinceEpoch,
    ));
  }

  return heliocentricEclipticToRectangular(longitude, latitude, planet.r);
}

function getPhaseAngleDegrees(
  planet: HeliocentricRectangular,
  geocentricX: number,
  geocentricY: number,
  geocentricZ: number,
  geocentricDistance: number,
): number {
  const cosPhase =
    (planet.x * geocentricX + planet.y * geocentricY + planet.z * geocentricZ) /
    (planet.r * geocentricDistance);

  return toDegrees(Math.acos(Math.min(1, Math.max(-1, cosPhase))));
}

function getApparentMagnitude(
  elements: OrbitalElements,
  heliocentricDistance: number,
  geocentricDistance: number,
  phaseAngleDeg: number,
): number {
  const distanceTerm = elements.outerPlanet
    ? 5 * Math.log10(heliocentricDistance)
    : 5 * Math.log10(heliocentricDistance * geocentricDistance);

  let magnitude =
    elements.magnitudeBase +
    distanceTerm +
    elements.magnitudePhaseCoeff * phaseAngleDeg;

  if (
    elements.magnitudePhasePower !== undefined &&
    elements.magnitudePhasePowerCoeff !== undefined
  ) {
    magnitude +=
      elements.magnitudePhasePowerCoeff *
      phaseAngleDeg ** elements.magnitudePhasePower;
  }

  return magnitude;
}

function computePlanetEquatorial(
  elements: OrbitalElements,
  sunGeocentric: { x: number; y: number; z: number },
  daysSinceEpoch: number,
): EquatorialCoordinates & { magnitude: number } {
  const planet = applyHeliocentricPerturbations(
    elements,
    getHeliocentricRectangular(elements, daysSinceEpoch),
    daysSinceEpoch,
  );
  const geocentricX = planet.x + sunGeocentric.x;
  const geocentricY = planet.y + sunGeocentric.y;
  const geocentricZ = planet.z + sunGeocentric.z;
  const geocentricDistance = Math.hypot(geocentricX, geocentricY, geocentricZ);
  const phaseAngleDeg = getPhaseAngleDegrees(
    planet,
    geocentricX,
    geocentricY,
    geocentricZ,
    geocentricDistance,
  );
  const { raHours, decDegrees } = rectangularEclipticToEquatorial(
    geocentricX,
    geocentricY,
    geocentricZ,
  );

  return {
    raHours,
    decDegrees,
    magnitude: getApparentMagnitude(
      elements,
      planet.r,
      geocentricDistance,
      phaseAngleDeg,
    ),
  };
}

function getPlanetContext(julianDate: number) {
  const daysSinceEpoch = julianDate - 2_451_543.5;
  const earthElements = ORBITAL_ELEMENTS.find(
    (element) => element.name === "Earth",
  );

  if (!earthElements) {
    return null;
  }

  const earthOrbit = getHeliocentricRectangular(earthElements, daysSinceEpoch);
  const sunGeocentric = getSunGeocentricEcliptic(julianDate, earthOrbit.r);

  return { daysSinceEpoch, sunGeocentric };
}

export function getPlanetEquatorial(
  julianDate: number,
  planetName: PlanetName,
): EquatorialCoordinates {
  const context = getPlanetContext(julianDate);
  const elements = ORBITAL_ELEMENTS.find(
    (element) => element.name === planetName,
  );

  if (!context || !elements || !NAKED_EYE_PLANETS.has(elements.name)) {
    return { raHours: 0, decDegrees: 0 };
  }

  const { raHours, decDegrees } = computePlanetEquatorial(
    elements,
    context.sunGeocentric,
    context.daysSinceEpoch,
  );

  return { raHours, decDegrees };
}

export function getPlanetHorizontal(
  date: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
  planetName: PlanetName,
): HorizontalCoordinates {
  const julianDate = getJulianDate(date);
  const { raHours, decDegrees } = getPlanetEquatorial(julianDate, planetName);
  const lst = getLocalSiderealTime(julianDate, longitudeDegrees);

  return equatorialToHorizontal(raHours, decDegrees, latitudeDegrees, lst);
}

function getPlanetElevation(
  date: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
  planetName: PlanetName,
): number {
  return getPlanetHorizontal(
    date,
    latitudeDegrees,
    longitudeDegrees,
    planetName,
  ).elevation;
}

export function findPlanetCrossings(
  now: Date,
  latitudeDegrees: number,
  longitudeDegrees: number,
  planetName: PlanetName,
): CrossingsDetail {
  return findCrossings(now, latitudeDegrees, longitudeDegrees, {
    getElevation: (date, lat, lon) =>
      getPlanetElevation(date, lat, lon, planetName),
    horizonElevation: HORIZON_ELEVATION,
    searchWindowMs: SEARCH_WINDOW_MS,
    sampleStepMs: SAMPLE_STEP_MS,
  });
}

export function getPlanetPositions(julianDate: number): PlanetPosition[] {
  const context = getPlanetContext(julianDate);

  if (!context) {
    return [];
  }

  const { daysSinceEpoch, sunGeocentric } = context;
  const positions: PlanetPosition[] = [];

  for (const elements of ORBITAL_ELEMENTS) {
    if (!NAKED_EYE_PLANETS.has(elements.name)) {
      continue;
    }

    const { raHours, decDegrees, magnitude } = computePlanetEquatorial(
      elements,
      sunGeocentric,
      daysSinceEpoch,
    );

    positions.push({
      name: elements.name,
      color: elements.color,
      raHours,
      decDegrees,
      magnitude,
    });
  }

  return positions;
}
