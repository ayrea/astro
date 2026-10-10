import { useCallback, useEffect, useRef, useState } from "react";

import {
  deviceOrientationToLook,
  isDeviceOrientationSupported,
  requestDeviceOrientationPermission,
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

export interface DeviceSkyOrientation {
  look: LookDirection | null;
  permission: SkyOrientationPermission;
  supported: boolean;
  /** Call from a user gesture after enabling the setting (needed on iOS). */
  requestPermission: () => Promise<SkyOrientationPermission>;
}

export function useDeviceSkyOrientation(
  enabled: boolean,
  onLook?: (look: LookDirection) => void,
): DeviceSkyOrientation {
  const supported = isDeviceOrientationSupported();
  const [permission, setPermission] =
    useState<SkyOrientationPermission>("idle");
  const [look, setLook] = useState<LookDirection | null>(null);
  const smoothedRef = useRef<LookDirection | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<LookDirection | null>(null);
  const sawEventRef = useRef(false);
  const onLookRef = useRef(onLook);

  useEffect(() => {
    onLookRef.current = onLook;
  }, [onLook]);

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
      setPermission(result);
      return result;
    }, [supported]);

  useEffect(() => {
    if (!enabled || !supported) {
      smoothedRef.current = null;
      pendingRef.current = null;
      sawEventRef.current = false;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

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
      const previous = smoothedRef.current;

      const next: LookDirection = previous
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
          }
        : raw;

      smoothedRef.current = next;
      pendingRef.current = next;

      if (!sawEventRef.current) {
        sawEventRef.current = true;
        setPermission("granted");
      }

      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(flushLook);
      }
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

  return {
    look: enabled ? look : null,
    permission: effectivePermission,
    supported,
    requestPermission,
  };
}
