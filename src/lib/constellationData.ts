import linesJson from "@/data/constellationLines.json";
import boundsJson from "@/data/constellationBounds.json";

export interface ConstellationSegment {
  points: Array<{ ra: number; dec: number }>;
}

export interface ConstellationLines {
  id: string;
  name: string;
  segments: ConstellationSegment[];
}

export interface ConstellationBoundary {
  id: string;
  name: string;
  vertices: Array<{ ra: number; dec: number }>;
}

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
