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

      let alpha = event.alpha;
      const webkitHeading = (
        event as DeviceOrientationEvent & { webkitCompassHeading?: number }
      ).webkitCompassHeading;
      if (typeof webkitHeading === "number" && Number.isFinite(webkitHeading)) {
        alpha = 360 - webkitHeading;
      }

      const raw = deviceOrientationToLook(alpha, event.beta, event.gamma);
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

    window.addEventListener("deviceorientation", onOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
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
