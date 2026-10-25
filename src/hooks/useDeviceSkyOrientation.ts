import { useCallback, useEffect, useRef, useState } from "react";

import {
  deviceHorizonToCanvasRadians,
  deviceOrientationToLook,
  getScreenOrientationDegrees,
  hasDeviceOrientationPermissionThisSession,
  isDeviceOrientationPermissionRequired,
  isDeviceOrientationSupported,
  markDeviceOrientationPermissionGranted,
  requestDeviceOrientationPermission,
  subscribeDeviceOrientationPermissionGranted,
  smoothAngleDegrees,
  smoothScalar,
  type LookDirection,
} from "@/lib/deviceOrientation";

const SMOOTHING = 0.18;

export type SkyOrientationPermission =
  | "idle"
  | "pending"
  | "granted"
  | "denied"
  | "unsupported";

/** Look direction plus canvas-space horizon angle for viewport roll. */
export interface SkyLookSample extends LookDirection {
  /** Radians; 0 = horizon toward canvas bottom. Null when phone is flat. */
  horizonAngleCanvasRadians: number | null;
}

export interface DeviceSkyOrientation {
  look: SkyLookSample | null;
  permission: SkyOrientationPermission;
  supported: boolean;
  /**
   * True when Sky Align is on but iOS-style permission has not been granted
   * this page session — show a tap UI so requestPermission can run from a gesture.
   */
  needsPermissionPrompt: boolean;
  /** Call from a user gesture after enabling the setting (needed on iOS). */
  requestPermission: () => Promise<SkyOrientationPermission>;
}

export function useDeviceSkyOrientation(
  enabled: boolean,
  onLook?: (look: SkyLookSample) => void,
): DeviceSkyOrientation {
  const supported = isDeviceOrientationSupported();
  const permissionRequired = isDeviceOrientationPermissionRequired();
  const [permission, setPermission] =
    useState<SkyOrientationPermission>("idle");
  const [look, setLook] = useState<SkyLookSample | null>(null);
  /** Bumps when session grant changes so needsPermissionPrompt re-renders. */
  const [sessionGrantEpoch, setSessionGrantEpoch] = useState(0);
  const smoothedRef = useRef<SkyLookSample | null>(null);
  const lastDeviceHorizonRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<SkyLookSample | null>(null);
  const sawEventRef = useRef(false);
  const onLookRef = useRef(onLook);

  useEffect(() => {
    onLookRef.current = onLook;
  }, [onLook]);

  useEffect(() => {
    return subscribeDeviceOrientationPermissionGranted(() => {
      setSessionGrantEpoch((epoch) => epoch + 1);
    });
  }, []);

  const noteSessionGranted = useCallback(() => {
    markDeviceOrientationPermissionGranted();
    setSessionGrantEpoch((epoch) => epoch + 1);
  }, []);

  const flushLook = useCallback(() => {
    rafRef.current = null;
    const pending = pendingRef.current;
    if (!pending) {
      return;
    }
    setLook(pending);
    onLookRef.current?.(pending);
  }, []);

  const requestPermission =
    useCallback(async (): Promise<SkyOrientationPermission> => {
      if (!supported) {
        setPermission("unsupported");
        return "unsupported";
      }

      setPermission("pending");
      const result = await requestDeviceOrientationPermission();
      if (result === "granted") {
        noteSessionGranted();
      }
      setPermission(result);
      return result;
    }, [noteSessionGranted, supported]);

  useEffect(() => {
    if (!enabled || !supported) {
      smoothedRef.current = null;
      pendingRef.current = null;
      lastDeviceHorizonRef.current = null;
      sawEventRef.current = false;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const canvasHorizon = (deviceHorizon: number | null) =>
      deviceHorizon === null
        ? null
        : deviceHorizonToCanvasRadians(
            deviceHorizon,
            getScreenOrientationDegrees(),
          );

    const publishLook = (next: SkyLookSample) => {
      smoothedRef.current = next;
      pendingRef.current = next;

      if (!sawEventRef.current) {
        sawEventRef.current = true;
        markDeviceOrientationPermissionGranted();
        setPermission("granted");
        setSessionGrantEpoch((epoch) => epoch + 1);
      }

      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(flushLook);
      }
    };

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) {
        return;
      }

      const webkitHeading = (
        event as DeviceOrientationEvent & { webkitCompassHeading?: number }
      ).webkitCompassHeading;

      // Never substitute compass heading for alpha — that inverts N/S when the
      // phone is leaned back (sky-view pose) because the top of the device then
      // points roughly opposite the look direction. Use heading only to correct
      // absolute yaw (iOS).
      const raw = deviceOrientationToLook(
        event.alpha,
        event.beta,
        event.gamma,
        typeof webkitHeading === "number" ? webkitHeading : null,
      );

      let deviceHorizon = raw.horizonAngleDeviceDegrees;
      if (deviceHorizon === null) {
        deviceHorizon = lastDeviceHorizonRef.current;
      } else {
        const previousHorizon = lastDeviceHorizonRef.current;
        if (previousHorizon !== null) {
          deviceHorizon = smoothAngleDegrees(
            previousHorizon,
            deviceHorizon,
            SMOOTHING,
          );
        }
        lastDeviceHorizonRef.current = deviceHorizon;
      }

      const previous = smoothedRef.current;

      const next: SkyLookSample = previous
        ? {
            elevationDegrees: smoothScalar(
              previous.elevationDegrees,
              raw.elevationDegrees,
              SMOOTHING,
            ),
            azimuthDegrees: smoothAngleDegrees(
              previous.azimuthDegrees,
              raw.azimuthDegrees,
              SMOOTHING,
            ),
            horizonAngleDeviceDegrees: deviceHorizon,
            horizonAngleCanvasRadians: canvasHorizon(deviceHorizon),
          }
        : {
            ...raw,
            horizonAngleDeviceDegrees: deviceHorizon,
            horizonAngleCanvasRadians: canvasHorizon(deviceHorizon),
          };

      publishLook(next);
    };

    // Screen angle is otherwise sampled only on a motion event. Re-apply the
    // last device-frame horizon when the viewport rotates so landscape roll
    // updates even if the phone is then held still. Keep the smoothed look.
    const onScreenOrientation = () => {
      const previous = smoothedRef.current;
      const deviceHorizon = lastDeviceHorizonRef.current;
      if (!previous || deviceHorizon === null) {
        return;
      }

      publishLook({
        ...previous,
        horizonAngleDeviceDegrees: deviceHorizon,
        horizonAngleCanvasRadians: canvasHorizon(deviceHorizon),
      });
    };

    // Prefer absolute compass-referenced orientation when available; fall back
    // to deviceorientation so iOS / older browsers still work.
    const absoluteSupported = "ondeviceorientationabsolute" in window;
    let listeningRelative = false;
    let fallbackTimer: number | null = null;

    const startRelative = () => {
      if (listeningRelative) {
        return;
      }
      listeningRelative = true;
      window.addEventListener("deviceorientation", onOrientation, true);
    };

    const stopRelative = () => {
      if (!listeningRelative) {
        return;
      }
      listeningRelative = false;
      window.removeEventListener("deviceorientation", onOrientation, true);
    };

    const onAbsoluteOrientation = (event: Event) => {
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      stopRelative();
      onOrientation(event as DeviceOrientationEvent);
    };

    const screenOrientation = window.screen?.orientation;
    screenOrientation?.addEventListener("change", onScreenOrientation);
    window.addEventListener("orientationchange", onScreenOrientation);

    if (absoluteSupported) {
      window.addEventListener(
        "deviceorientationabsolute",
        onAbsoluteOrientation,
        true,
      );
      fallbackTimer = window.setTimeout(() => {
        fallbackTimer = null;
        startRelative();
      }, 500);
    } else {
      startRelative();
    }

    return () => {
      screenOrientation?.removeEventListener("change", onScreenOrientation);
      window.removeEventListener("orientationchange", onScreenOrientation);
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      if (absoluteSupported) {
        window.removeEventListener(
          "deviceorientationabsolute",
          onAbsoluteOrientation,
          true,
        );
      }
      stopRelative();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, flushLook, supported]);

  const effectivePermission: SkyOrientationPermission = !supported
    ? "unsupported"
    : !enabled
      ? "idle"
      : permission;

  // sessionGrantEpoch forces a re-render when Settings (or a first event)
  // marks this session granted via the module-level flag.
  const needsPermissionPrompt =
    enabled &&
    supported &&
    permissionRequired &&
    sessionGrantEpoch >= 0 &&
    !hasDeviceOrientationPermissionThisSession();

  return {
    look: enabled ? look : null,
    permission: effectivePermission,
    supported,
    needsPermissionPrompt,
    requestPermission,
  };
}
