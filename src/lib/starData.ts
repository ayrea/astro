import starsJson from "@/data/stars.json";

export interface StarRecord {
  r: number;
  d: number;
  m: number;
  n?: string;
}

export const stars = starsJson as StarRecord[];

export function filterStarsByMagnitude(magnitudeCutoff: number): StarRecord[] {
  return stars.filter((star) => star.m <= magnitudeCutoff);
}

export function getStarRadius(magnitude: number): number {
  return Math.max(0.5, 3.5 - magnitude * 0.4);
}
