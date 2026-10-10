import { toDegrees, toRadians } from "@/lib/astronomy";

export interface LookDirection {
  /** Degrees above the horizon; 90 = zenith. */
  elevationDegrees: number;
  /** Degrees clockwise from north toward east. */
  azimuthDegrees: number;
}

/**
 * Convert DeviceOrientationEvent angles to the look direction of the
 * device back (−Z), in a local Earth frame (X east, Y north, Z up).
 *
 * Uses the ZXY rotation matrix from the Device Orientation spec worked example.
 * Compass heading is magnetic north unless the browser provides absolute orientation.
 */
export function deviceOrientationToLook(
  alphaDegrees: number,
  betaDegrees: number,
  gammaDegrees: number,
): LookDirection {
  const x = toRadians(betaDegrees);
  const y = toRadians(gammaDegrees);
  const z = toRadians(alphaDegrees);

  const cX = Math.cos(x);
  const sX = Math.sin(x);
  const cY = Math.cos(y);
  const sY = Math.sin(y);
  const cZ = Math.cos(z);
  const sZ = Math.sin(z);

  // Columns of R (device → Earth). Look vector is R * [0, 0, −1].
  const east = -(cY * sZ * sX + cZ * sY);
  const north = -(sZ * sY - cZ * cY * sX);
  const up = -(cX * cY);

  const horizontal = Math.hypot(east, north);
  const elevationDegrees = toDegrees(Math.atan2(up, horizontal));
  let azimuthDegrees = toDegrees(Math.atan2(east, north));
  if (azimuthDegrees < 0) {
    azimuthDegrees += 360;
  }

  return { elevationDegrees, azimuthDegrees };
}

export function isDeviceOrientationSupported(): boolean {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

export type DeviceOrientationPermissionResult =
  | "granted"
  | "denied"
  | "unsupported";

/**
 * Request permission for device orientation where required (iOS 13+).
 * Returns the resulting permission state.
 */
export async function requestDeviceOrientationPermission(): Promise<DeviceOrientationPermissionResult> {
  if (!isDeviceOrientationSupported()) {
    return "unsupported";
  }

  const DeviceOrientationEventWithPermission =
    DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

  if (
    typeof DeviceOrientationEventWithPermission.requestPermission === "function"
  ) {
    try {
      const result =
        await DeviceOrientationEventWithPermission.requestPermission();
      return result === "granted" ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }

  return "granted";
}

export function smoothAngleDegrees(
  previous: number,
  next: number,
  alpha: number,
): number {
  let delta = next - previous;
  while (delta > 180) {
    delta -= 360;
  }
  while (delta < -180) {
    delta += 360;
  }
  let result = previous + delta * alpha;
  while (result < 0) {
    result += 360;
  }
  while (result >= 360) {
    result -= 360;
  }
  return result;
}

export function smoothScalar(
  previous: number,
  next: number,
  alpha: number,
): number {
  return previous + (next - previous) * alpha;
}
