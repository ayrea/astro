import starsJson from "@/data/stars.json";

export interface StarRecord {
  r: number;
  d: number;
  m: number;
  n?: string;
}

export const stars = starsJson as StarRecord[];

stars.sort((a, b) => a.m - b.m);

let cachedCutoff = -Infinity;
let cachedEndIndex = 0;

function binarySearchCutoff(cutoff: number): number {
  let lo = 0;
  let hi = stars.length;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (stars[mid].m <= cutoff) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

export function getStarCountForMagnitude(cutoff: number): number {
  if (cutoff !== cachedCutoff) {
    cachedCutoff = cutoff;
    cachedEndIndex = binarySearchCutoff(cutoff);
  }

  return cachedEndIndex;
}

export function filterStarsByMagnitude(magnitudeCutoff: number): StarRecord[] {
  return stars.slice(0, getStarCountForMagnitude(magnitudeCutoff));
}

export function getStarRadius(magnitude: number): number {
  return Math.max(0.5, 3.5 - magnitude * 0.4);
}

export function getScreenStarRadius(magnitude: number, scale: number): number {
  return getStarRadius(magnitude) / scale;
}
