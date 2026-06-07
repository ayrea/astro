import { toRadians } from "@/lib/astronomy";

export interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

export function projectAltitudeAzimuth(
  altitudeDegrees: number,
  azimuthDegrees: number,
  radius: number,
  mirrorEastWest: boolean,
): ProjectedPoint {
  if (altitudeDegrees < 0) {
    return { x: 0, y: 0, visible: false };
  }

  const azimuth = toRadians(azimuthDegrees);
  const r = ((90 - altitudeDegrees) / 90) * radius;

  let x = r * Math.sin(azimuth);
  const y = -r * Math.cos(azimuth);

  if (mirrorEastWest) {
    x = -x;
  }

  return { x, y, visible: true };
}

export function projectAltitudeCircle(
  altitudeDegrees: number,
  radius: number,
): number {
  return ((90 - altitudeDegrees) / 90) * radius;
}
