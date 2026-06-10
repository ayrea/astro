import linesJson from "@/data/constellationLines.json";
import boundsJson from "@/data/constellationBounds.json";
import { b1875ToJ2000, j2000ToB1875 } from "@/lib/astronomy";

export interface ConstellationSegment {
  points: Array<{ ra: number; dec: number }>;
}

export interface ConstellationLines {
  id: string;
  name: string;
  segments: ConstellationSegment[];
}

export interface BoundaryVertex {
  ra: number;
  dec: number;
}

export interface ConstellationBoundary {
  id: string;
  name: string;
  vertices: BoundaryVertex[];
}

export interface ConstellationBoundaryEdge {
  points: BoundaryVertex[];
}

const VERTEX_QUANTIZE_DECIMALS = 4;
const BOUNDARY_SEGMENT_MIN_SAMPLES = 4;
const BOUNDARY_SEGMENT_MAX_SAMPLES = 120;
const BOUNDARY_SEGMENT_SAMPLES_PER_DEGREE = 2;

interface GeoJsonFeature {
  id: string;
  properties?: { name?: string };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJsonCollection {
  features: GeoJsonFeature[];
}

interface RawBoundaryEdge {
  start: BoundaryVertex;
  end: BoundaryVertex;
}

function lonToRaHours(lon: number): number {
  return (((lon % 360) + 360) % 360) / 15;
}

function parseLines(data: GeoJsonCollection): ConstellationLines[] {
  return data.features.map((feature) => {
    const coords = feature.geometry.coordinates as number[][][];
    const segments: ConstellationSegment[] = coords.map((polyline) => ({
      points: polyline.map(([lon, lat]) => ({
        ra: lonToRaHours(lon),
        dec: lat,
      })),
    }));
    return {
      id: feature.id,
      name: feature.properties?.name ?? feature.id,
      segments,
    };
  });
}

function parseBounds(data: GeoJsonCollection): ConstellationBoundary[] {
  return data.features.map((feature) => {
    const coords = feature.geometry.coordinates as number[][][];
    const ring = coords[0];
    const vertices = ring.map(([lon, lat]) => ({
      ra: lonToRaHours(lon),
      dec: lat,
    }));
    return {
      id: feature.id,
      name: feature.properties?.name ?? feature.id,
      vertices,
    };
  });
}

export const constellationLines: ConstellationLines[] = parseLines(
  linesJson as unknown as GeoJsonCollection,
);

export const constellationBoundaries: ConstellationBoundary[] = parseBounds(
  boundsJson as unknown as GeoJsonCollection,
);

function quantizeCoordinate(value: number): number {
  const factor = 10 ** VERTEX_QUANTIZE_DECIMALS;
  return Math.round(value * factor) / factor;
}

function vertexKey(ra: number, dec: number): string {
  return `${quantizeCoordinate(ra).toFixed(VERTEX_QUANTIZE_DECIMALS)},${quantizeCoordinate(dec).toFixed(VERTEX_QUANTIZE_DECIMALS)}`;
}

function getCanonicalVertex(
  ra: number,
  dec: number,
  canonicalVertices: Map<string, BoundaryVertex>,
): BoundaryVertex {
  const key = vertexKey(ra, dec);
  const existing = canonicalVertices.get(key);

  if (existing) {
    return existing;
  }

  const vertex: BoundaryVertex = { ra, dec };
  canonicalVertices.set(key, vertex);
  return vertex;
}

function normalizeRaDeltaHours(startRa: number, endRa: number): number {
  let delta = endRa - startRa;

  if (delta > 12) {
    delta -= 24;
  } else if (delta < -12) {
    delta += 24;
  }

  return delta;
}

function interpolateBoundaryRa(
  startRa: number,
  endRa: number,
  progress: number,
): number {
  let rightAscension =
    startRa + normalizeRaDeltaHours(startRa, endRa) * progress;
  rightAscension %= 24;

  if (rightAscension < 0) {
    rightAscension += 24;
  }

  return rightAscension;
}

function getBoundaryEdgeSampleCount(
  raSpanDegrees: number,
  decSpanDegrees: number,
): number {
  const spanDegrees = Math.max(raSpanDegrees, decSpanDegrees);

  if (spanDegrees === 0) {
    return 1;
  }

  return Math.min(
    BOUNDARY_SEGMENT_MAX_SAMPLES,
    Math.max(
      BOUNDARY_SEGMENT_MIN_SAMPLES,
      Math.ceil(spanDegrees * BOUNDARY_SEGMENT_SAMPLES_PER_DEGREE),
    ),
  );
}

function densifyEdgeViaB1875(
  startJ2000: BoundaryVertex,
  endJ2000: BoundaryVertex,
): BoundaryVertex[] {
  const startB1875 = j2000ToB1875(startJ2000.ra, startJ2000.dec);
  const endB1875 = j2000ToB1875(endJ2000.ra, endJ2000.dec);
  const raDeltaHours = normalizeRaDeltaHours(
    startB1875.raHours,
    endB1875.raHours,
  );
  const decDelta = endB1875.decDegrees - startB1875.decDegrees;
  const raSpanDegrees = Math.abs(raDeltaHours) * 15;
  const decSpanDegrees = Math.abs(decDelta);
  const alongConstantRa = decSpanDegrees >= raSpanDegrees;
  const sampleCount = getBoundaryEdgeSampleCount(raSpanDegrees, decSpanDegrees);
  const points: BoundaryVertex[] = [];

  for (let index = 0; index <= sampleCount; index++) {
    const progress = index / sampleCount;
    const b1875Sample = alongConstantRa
      ? {
          raHours: (startB1875.raHours + endB1875.raHours) / 2,
          decDegrees: startB1875.decDegrees + decDelta * progress,
        }
      : {
          raHours: interpolateBoundaryRa(
            startB1875.raHours,
            endB1875.raHours,
            progress,
          ),
          decDegrees: (startB1875.decDegrees + endB1875.decDegrees) / 2,
        };
    const j2000Sample = b1875ToJ2000(
      b1875Sample.raHours,
      b1875Sample.decDegrees,
    );

    points.push({
      ra: j2000Sample.raHours,
      dec: j2000Sample.decDegrees,
    });
  }

  return points;
}

function buildRawBoundaryEdges(
  boundaries: ConstellationBoundary[],
): RawBoundaryEdge[] {
  const canonicalVertices = new Map<string, BoundaryVertex>();
  const seenEdges = new Set<string>();
  const edges: RawBoundaryEdge[] = [];

  for (const boundary of boundaries) {
    const { vertices } = boundary;

    if (vertices.length < 2) {
      continue;
    }

    for (
      let vertexIndex = 0;
      vertexIndex < vertices.length - 1;
      vertexIndex++
    ) {
      const startVertex = vertices[vertexIndex];
      const endVertex = vertices[vertexIndex + 1];
      const start = getCanonicalVertex(
        startVertex.ra,
        startVertex.dec,
        canonicalVertices,
      );
      const end = getCanonicalVertex(
        endVertex.ra,
        endVertex.dec,
        canonicalVertices,
      );
      const startKey = vertexKey(start.ra, start.dec);
      const endKey = vertexKey(end.ra, end.dec);

      if (startKey === endKey) {
        continue;
      }

      const edgeKey =
        startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;

      if (seenEdges.has(edgeKey)) {
        continue;
      }

      seenEdges.add(edgeKey);
      edges.push({ start, end });
    }
  }

  return edges;
}

function buildBoundaryEdges(
  boundaries: ConstellationBoundary[],
): ConstellationBoundaryEdge[] {
  return buildRawBoundaryEdges(boundaries).map((edge) => ({
    points: densifyEdgeViaB1875(edge.start, edge.end),
  }));
}

export const constellationBoundaryEdges: ConstellationBoundaryEdge[] =
  buildBoundaryEdges(constellationBoundaries);
