import { screenToEquatorial } from "@/lib/astronomy";
import type { ConstellationBoundary } from "@/lib/constellationData";
import type { CanvasMetrics, Viewport } from "@/lib/viewport";

export type HitTargetType =
  | "star"
  | "planet"
  | "sun"
  | "moon"
  | "constellation";

export interface PointHitTarget {
  x: number;
  y: number;
  name: string;
  type: HitTargetType;
}

export interface HitTestIndex {
  pointTargets: PointHitTarget[];
}

export interface HitTestContext {
  radius: number;
  latitudeDegrees: number;
  localSiderealTimeHours: number;
  mirrorEastWest: boolean;
}

export const TAP_TOLERANCE_PX = 14;

export function createEmptyHitTestIndex(): HitTestIndex {
  return {
    pointTargets: [],
  };
}

export function clientToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  metrics: CanvasMetrics,
  viewport: Viewport,
): { x: number; y: number } {
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const { centerX, centerY } = metrics;
  const { scale, offsetX, offsetY } = viewport;

  return {
    x: (localX - centerX - offsetX) / scale,
    y: (localY - centerY - offsetY) / scale,
  };
}

export function findNearestPointTarget(
  worldX: number,
  worldY: number,
  targets: PointHitTarget[],
  toleranceWorld: number,
): PointHitTarget | null {
  let nearest: PointHitTarget | null = null;
  let nearestDistanceSq = toleranceWorld * toleranceWorld;

  for (const target of targets) {
    const dx = worldX - target.x;
    const dy = worldY - target.y;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq <= nearestDistanceSq) {
      nearestDistanceSq = distanceSq;
      nearest = target;
    }
  }

  return nearest;
}

function unwrapRaHours(raHours: number, referenceRaHours: number): number {
  let ra = raHours;

  while (ra - referenceRaHours > 12) {
    ra -= 24;
  }

  while (ra - referenceRaHours < -12) {
    ra += 24;
  }

  return ra;
}

export function isPointInRaDecPolygon(
  raHours: number,
  decDegrees: number,
  vertices: Array<{ ra: number; dec: number }>,
): boolean {
  if (vertices.length < 3) {
    return false;
  }

  const testRa = unwrapRaHours(raHours, raHours);
  const unwrapped = vertices.map((vertex) => ({
    ra: unwrapRaHours(vertex.ra, raHours),
    dec: vertex.dec,
  }));

  let inside = false;

  for (let i = 0, j = unwrapped.length - 1; i < unwrapped.length; j = i++) {
    const xi = unwrapped[i].ra;
    const yi = unwrapped[i].dec;
    const xj = unwrapped[j].ra;
    const yj = unwrapped[j].dec;
    const intersects =
      yi > decDegrees !== yj > decDegrees &&
      testRa < ((xj - xi) * (decDegrees - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getRaDecBoundingBoxArea(
  raHours: number,
  vertices: Array<{ ra: number; dec: number }>,
): number {
  let minRa = Infinity;
  let maxRa = -Infinity;
  let minDec = Infinity;
  let maxDec = -Infinity;

  for (const vertex of vertices) {
    const unwrappedRa = unwrapRaHours(vertex.ra, raHours);
    minRa = Math.min(minRa, unwrappedRa);
    maxRa = Math.max(maxRa, unwrappedRa);
    minDec = Math.min(minDec, vertex.dec);
    maxDec = Math.max(maxDec, vertex.dec);
  }

  return (maxRa - minRa) * (maxDec - minDec);
}

export function findConstellationAtEquatorial(
  raHours: number,
  decDegrees: number,
  boundaries: ConstellationBoundary[],
): { name: string } | null {
  let bestMatch: { name: string; area: number } | null = null;

  for (const boundary of boundaries) {
    if (!isPointInRaDecPolygon(raHours, decDegrees, boundary.vertices)) {
      continue;
    }

    const area = getRaDecBoundingBoxArea(raHours, boundary.vertices);

    if (!bestMatch || area < bestMatch.area) {
      bestMatch = { name: boundary.name, area };
    }
  }

  return bestMatch ? { name: bestMatch.name } : null;
}

export function findHitAt(
  worldX: number,
  worldY: number,
  index: HitTestIndex,
  toleranceWorld: number,
  context: HitTestContext,
  boundaries: ConstellationBoundary[],
): { name: string; type: HitTargetType } | null {
  const pointTarget = findNearestPointTarget(
    worldX,
    worldY,
    index.pointTargets,
    toleranceWorld,
  );

  if (pointTarget) {
    return { name: pointTarget.name, type: pointTarget.type };
  }

  const equatorial = screenToEquatorial(
    worldX,
    worldY,
    context.radius,
    context.mirrorEastWest,
    context.latitudeDegrees,
    context.localSiderealTimeHours,
  );

  if (!equatorial) {
    return null;
  }

  const constellation = findConstellationAtEquatorial(
    equatorial.raHours,
    equatorial.decDegrees,
    boundaries,
  );

  if (constellation) {
    return { name: constellation.name, type: "constellation" };
  }

  return null;
}
