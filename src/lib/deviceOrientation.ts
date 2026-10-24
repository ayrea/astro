import { toDegrees, toRadians } from "@/lib/astronomy";

export interface LookDirection {
  /** Degrees above the horizon; 90 = zenith. */
  elevationDegrees: number;
  /** Degrees clockwise from north toward east. */
  azimuthDegrees: number;
  /**
   * Angle of gravity-down (toward physical horizon) in the device screen
   * plane, in degrees. 0 = toward device top (+Y), 90 = toward device right
   * (+X). Null when the phone is nearly flat (screen plane ≈ horizontal).
   */
  horizonAngleDeviceDegrees: number | null;
}

interface Vec3 {
  east: number;
  north: number;
  up: number;
}

/**
 * Device → Earth rotation matrix (W3C Device Orientation worked example, ZXY)
 * applied to a device-frame vector.
 */
function deviceVectorToEarth(
  alphaDegrees: number,
  betaDegrees: number,
  gammaDegrees: number,
  deviceX: number,
  deviceY: number,
  deviceZ: number,
): Vec3 {
  const x = toRadians(betaDegrees);
  const y = toRadians(gammaDegrees);
  const z = toRadians(alphaDegrees);

  const cX = Math.cos(x);
  const sX = Math.sin(x);
  const cY = Math.cos(y);
  const sY = Math.sin(y);
  const cZ = Math.cos(z);
  const sZ = Math.sin(z);

  const m11 = cZ * cY - sZ * sX * sY;
  const m12 = -cX * sZ;
  const m13 = cY * sZ * sX + cZ * sY;

  const m21 = cY * sZ + cZ * sX * sY;
  const m22 = cZ * cX;
  const m23 = sZ * sY - cZ * cY * sX;

  const m31 = -cX * sY;
  const m32 = sX;
  const m33 = cX * cY;

  return {
    east: m11 * deviceX + m12 * deviceY + m13 * deviceZ,
    north: m21 * deviceX + m22 * deviceY + m23 * deviceZ,
    up: m31 * deviceX + m32 * deviceY + m33 * deviceZ,
  };
}

function horizontalHeadingDegrees(east: number, north: number): number | null {
  const horizontal = Math.hypot(east, north);
  if (horizontal < 1e-6) {
    return null;
  }

  let heading = toDegrees(Math.atan2(east, north));
  if (heading < 0) {
    heading += 360;
  }
  return heading;
}

function normalizeDegrees(degrees: number): number {
  let value = degrees % 360;
  if (value < 0) {
    value += 360;
  }
  return value;
}

function shortestAngleDeltaDegrees(from: number, to: number): number {
  let delta = to - from;
  while (delta > 180) {
    delta -= 360;
  }
  while (delta < -180) {
    delta += 360;
  }
  return delta;
}

const FLAT_SCREEN_GRAVITY_EPSILON = 1e-3;

/**
 * Convert DeviceOrientationEvent angles to the look direction of the
 * device back (−Z), in a local Earth frame (X east, Y north, Z up), plus
 * the gravity-down direction in the device screen plane (X/Y).
 *
 * Uses the ZXY rotation matrix from the Device Orientation spec worked example.
 *
 * Optional `compassHeadingDegrees` (e.g. iOS `webkitCompassHeading`) is the
 * magnetic heading of the device *top* (+Y). It is applied only as an absolute
 * yaw correction — never substituted for alpha — so tilted sky-view poses keep
 * the correct north/south sense.
 */
export function deviceOrientationToLook(
  alphaDegrees: number,
  betaDegrees: number,
  gammaDegrees: number,
  compassHeadingDegrees?: number | null,
): LookDirection {
  // Look vector is out the back of the device: R * [0, 0, −1]
  const look = deviceVectorToEarth(
    alphaDegrees,
    betaDegrees,
    gammaDegrees,
    0,
    0,
    -1,
  );

  // Gravity (0,0,−1) projected onto device +X / +Y (screen plane).
  // g · deviceAxis = −(R · deviceAxis).up
  const deviceRight = deviceVectorToEarth(
    alphaDegrees,
    betaDegrees,
    gammaDegrees,
    1,
    0,
    0,
  );
  const deviceTop = deviceVectorToEarth(
    alphaDegrees,
    betaDegrees,
    gammaDegrees,
    0,
    1,
    0,
  );
  const gDeviceX = -deviceRight.up;
  const gDeviceY = -deviceTop.up;
  const gScreen = Math.hypot(gDeviceX, gDeviceY);

  let horizonAngleDeviceDegrees: number | null = null;
  if (gScreen >= FLAT_SCREEN_GRAVITY_EPSILON) {
    // atan2(x, y): 0 = toward device top, 90 = toward device right.
    horizonAngleDeviceDegrees = toDegrees(Math.atan2(gDeviceX, gDeviceY));
  }

  if (
    typeof compassHeadingDegrees === "number" &&
    Number.isFinite(compassHeadingDegrees)
  ) {
    const topHeading = horizontalHeadingDegrees(
      deviceTop.east,
      deviceTop.north,
    );
    if (topHeading !== null) {
      const yawError = shortestAngleDeltaDegrees(
        topHeading,
        normalizeDegrees(compassHeadingDegrees),
      );
      const cosYaw = Math.cos(toRadians(yawError));
      const sinYaw = Math.sin(toRadians(yawError));
      const rotatedEast = look.east * cosYaw + look.north * sinYaw;
      const rotatedNorth = look.north * cosYaw - look.east * sinYaw;
      look.east = rotatedEast;
      look.north = rotatedNorth;
    }
  }

  const horizontal = Math.hypot(look.east, look.north);
  const elevationDegrees = toDegrees(Math.atan2(look.up, horizontal));
  const azimuth = horizontalHeadingDegrees(look.east, look.north);

  return {
    elevationDegrees,
    azimuthDegrees: azimuth ?? 0,
    horizonAngleDeviceDegrees,
  };
}

/**
 * Map device-plane horizon angle to canvas coordinates (CSS: +X right, +Y down).
 * Result: 0 = horizon toward canvas bottom, π/2 = toward canvas right.
 */
export function deviceHorizonToCanvasRadians(
  horizonAngleDeviceDegrees: number,
  screenOrientationDegrees = 0,
): number {
  return (
    Math.PI -
    toRadians(horizonAngleDeviceDegrees) -
    toRadians(screenOrientationDegrees)
  );
}

export function getScreenOrientationDegrees(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const screenOrientation = window.screen?.orientation?.angle;
  if (
    typeof screenOrientation === "number" &&
    Number.isFinite(screenOrientation)
  ) {
    return screenOrientation;
  }

  const legacy = (window as Window & { orientation?: number }).orientation;
  if (typeof legacy === "number" && Number.isFinite(legacy)) {
    return legacy;
  }

  return 0;
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
