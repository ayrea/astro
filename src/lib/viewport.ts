export const MIN_SCALE = 1;
export const MAX_SCALE = 32;

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
  /** Radians; positive rotates the chart clockwise on the canvas (Y-down). */
  rotation: number;
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
  rotation: 0,
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

/** Rotate a world-space point by viewport rotation (canvas Y-down convention). */
export function rotateWorldPoint(
  x: number,
  y: number,
  rotation: number,
): { x: number; y: number } {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

/**
 * Viewport that centers `worldX`/`worldY` on screen and rotates so the
 * chart direction toward the horizon (away from zenith) aligns with
 * `horizonAngleCanvas` on the display.
 *
 * `horizonAngleCanvas` uses canvas coords (+X right, +Y down): 0 = toward
 * bottom, π/2 = toward right. Pass `null` when gravity-on-screen is
 * unavailable (phone flat) to freeze roll at `previousRotation`.
 */
export function viewportForLookPoint(
  worldX: number,
  worldY: number,
  scale: number,
  previousRotation = 0,
  horizonAngleCanvas: number | null = 0,
): Viewport {
  const clampedScale = clampScale(scale);
  const distance = Math.hypot(worldX, worldY);

  let rotation: number;
  if (horizonAngleCanvas === null) {
    rotation = distance < 1e-6 ? previousRotation : Math.atan2(worldX, worldY);
  } else if (distance < 1e-6) {
    // At zenith, radial horizon direction is undefined — roll from gravity only.
    rotation = -horizonAngleCanvas;
  } else {
    // After rotate(θ), angle of W becomes atan2(Wx,Wy) − θ; match horizon angle.
    rotation = Math.atan2(worldX, worldY) - horizonAngleCanvas;
  }

  const rotated = rotateWorldPoint(worldX, worldY, rotation);

  return {
    scale: clampedScale,
    offsetX: -clampedScale * rotated.x,
    offsetY: -clampedScale * rotated.y,
    rotation,
  };
}

export function clampPan(
  offsetX: number,
  offsetY: number,
  scale: number,
  metrics: CanvasMetrics,
  allowPanAtMinScale = false,
): { offsetX: number; offsetY: number } {
  if (scale <= MIN_SCALE && !allowPanAtMinScale) {
    return { offsetX: 0, offsetY: 0 };
  }

  const { centerX, centerY, radius } = metrics;
  const margin = radius * 0.1;
  const scaleFactor = Math.max(0, scale - 1);
  const maxOffsetX =
    radius * scaleFactor + Math.max(0, centerX - radius) + margin;
  const maxOffsetY =
    radius * scaleFactor + Math.max(0, centerY - radius) + margin;

  // When panning at min scale (sky-align), still allow offsets up to the rim.
  const minScalePad = allowPanAtMinScale && scale <= MIN_SCALE ? radius : 0;

  return {
    offsetX: Math.max(
      -(maxOffsetX + minScalePad),
      Math.min(maxOffsetX + minScalePad, offsetX),
    ),
    offsetY: Math.max(
      -(maxOffsetY + minScalePad),
      Math.min(maxOffsetY + minScalePad, offsetY),
    ),
  };
}

export function normalizeViewport(
  scale: number,
  offsetX: number,
  offsetY: number,
  metrics: CanvasMetrics,
  rotation = 0,
  allowPanAtMinScale = false,
): Viewport {
  const clampedScale = clampScale(scale);

  if (clampedScale <= MIN_SCALE && !allowPanAtMinScale) {
    return { ...DEFAULT_VIEWPORT, rotation: 0 };
  }

  const clampedPan = clampPan(
    offsetX,
    offsetY,
    clampedScale,
    metrics,
    allowPanAtMinScale,
  );

  return {
    scale: clampedScale,
    offsetX: clampedPan.offsetX,
    offsetY: clampedPan.offsetY,
    rotation,
  };
}
