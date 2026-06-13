export const MIN_SCALE = 1;
export const MAX_SCALE = 32;

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface CanvasMetrics {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  radius: number;
}

export const DEFAULT_VIEWPORT: Viewport = {
  scale: MIN_SCALE,
  offsetX: 0,
  offsetY: 0,
};

export function getCanvasMetrics(rect: DOMRect): CanvasMetrics {
  const width = rect.width;
  const height = rect.height;
  const radius = Math.min(width, height) * 0.46;

  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2,
    radius,
  };
}

export function clampScale(
  scale: number,
  min = MIN_SCALE,
  max = MAX_SCALE,
): number {
  return Math.max(min, Math.min(max, scale));
}

export function zoomToPoint(
  offsetX: number,
  offsetY: number,
  oldScale: number,
  newScale: number,
  anchorX: number,
  anchorY: number,
): { offsetX: number; offsetY: number } {
  const ratio = newScale / oldScale;
  return {
    offsetX: anchorX - (anchorX - offsetX) * ratio,
    offsetY: anchorY - (anchorY - offsetY) * ratio,
  };
}

export function clampPan(
  offsetX: number,
  offsetY: number,
  scale: number,
  metrics: CanvasMetrics,
): { offsetX: number; offsetY: number } {
  if (scale <= MIN_SCALE) {
    return { offsetX: 0, offsetY: 0 };
  }

  const { centerX, centerY, radius } = metrics;
  const margin = radius * 0.1;
  const maxOffsetX =
    radius * (scale - 1) + Math.max(0, centerX - radius) + margin;
  const maxOffsetY =
    radius * (scale - 1) + Math.max(0, centerY - radius) + margin;

  return {
    offsetX: Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX)),
    offsetY: Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY)),
  };
}

export function normalizeViewport(
  scale: number,
  offsetX: number,
  offsetY: number,
  metrics: CanvasMetrics,
): Viewport {
  const clampedScale = clampScale(scale);

  if (clampedScale <= MIN_SCALE) {
    return DEFAULT_VIEWPORT;
  }

  const clampedPan = clampPan(offsetX, offsetY, clampedScale, metrics);

  return {
    scale: clampedScale,
    offsetX: clampedPan.offsetX,
    offsetY: clampedPan.offsetY,
  };
}
