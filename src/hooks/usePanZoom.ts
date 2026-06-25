import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  clampScale,
  DEFAULT_VIEWPORT,
  MIN_SCALE,
  normalizeViewport,
  zoomToPoint,
  type CanvasMetrics,
  type Viewport,
} from "@/lib/viewport";

const WHEEL_ZOOM_FACTOR = 1.1;
const TAP_THRESHOLD_PX = 6;

interface PointerPosition {
  x: number;
  y: number;
}

interface DragState {
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface PinchState {
  distance: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface TapState {
  pointerId: number;
  startX: number;
  startY: number;
  hadPinch: boolean;
}

function getCanvasCenter(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return {
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  };
}

function getAnchorFromClient(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
) {
  const { centerX, centerY } = getCanvasCenter(canvas);
  return {
    anchorX: clientX - centerX,
    anchorY: clientY - centerY,
  };
}

function getPinchMetrics(
  canvas: HTMLCanvasElement,
  pointers: Map<number, PointerPosition>,
) {
  const values = [...pointers.values()];
  if (values.length < 2) {
    return null;
  }

  const [first, second] = values;
  const { centerX, centerY } = getCanvasCenter(canvas);

  return {
    anchorX: (first.x + second.x) / 2 - centerX,
    anchorY: (first.y + second.y) / 2 - centerY,
    distance: Math.hypot(second.x - first.x, second.y - first.y),
  };
}

export function usePanZoom(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  getCanvasMetrics: () => CanvasMetrics,
  requestRedraw: () => void,
  onTap?: (clientX: number, clientY: number) => void,
) {
  const viewportRef = useRef<Viewport>(DEFAULT_VIEWPORT);
  const pointersRef = useRef(new Map<number, PointerPosition>());
  const dragStateRef = useRef<DragState | null>(null);
  const pinchStateRef = useRef<PinchState | null>(null);
  const tapStateRef = useRef<TapState | null>(null);
  const onTapRef = useRef(onTap);
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  const getViewport = useCallback(() => viewportRef.current, []);

  const applyViewport = useCallback(
    (next: Viewport) => {
      const normalized = normalizeViewport(
        next.scale,
        next.offsetX,
        next.offsetY,
        getCanvasMetrics(),
      );
      viewportRef.current = normalized;
      setIsZoomed(normalized.scale > MIN_SCALE);
      requestRedraw();
    },
    [getCanvasMetrics, requestRedraw],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      const { anchorX, anchorY } = getAnchorFromClient(
        canvas,
        event.clientX,
        event.clientY,
      );
      const { scale, offsetX, offsetY } = viewportRef.current;
      const factor =
        event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
      const nextScale = clampScale(scale * factor);

      if (nextScale === scale) {
        return;
      }

      const zoomedOffset = zoomToPoint(
        offsetX,
        offsetY,
        scale,
        nextScale,
        anchorX,
        anchorY,
      );

      applyViewport({
        scale: nextScale,
        offsetX: zoomedOffset.offsetX,
        offsetY: zoomedOffset.offsetY,
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (pointersRef.current.size === 1) {
        tapStateRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          hadPinch: false,
        };
      }

      if (pointersRef.current.size === 2) {
        dragStateRef.current = null;
        setIsDragging(false);

        if (tapStateRef.current) {
          tapStateRef.current.hadPinch = true;
        }

        const pinchMetrics = getPinchMetrics(canvas, pointersRef.current);
        if (!pinchMetrics || pinchMetrics.distance === 0) {
          return;
        }

        const { scale, offsetX, offsetY } = viewportRef.current;
        pinchStateRef.current = {
          distance: pinchMetrics.distance,
          scale,
          offsetX,
          offsetY,
        };
        return;
      }

      if (viewportRef.current.scale <= MIN_SCALE) {
        return;
      }

      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        offsetX: viewportRef.current.offsetX,
        offsetY: viewportRef.current.offsetY,
      };
      setIsDragging(true);
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return;
      }

      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (pointersRef.current.size === 2 && pinchStateRef.current) {
        const pinchMetrics = getPinchMetrics(canvas, pointersRef.current);
        if (!pinchMetrics || pinchMetrics.distance === 0) {
          return;
        }

        const ratio = pinchMetrics.distance / pinchStateRef.current.distance;
        const nextScale = pinchStateRef.current.scale * ratio;
        const zoomedOffset = zoomToPoint(
          pinchStateRef.current.offsetX,
          pinchStateRef.current.offsetY,
          pinchStateRef.current.scale,
          nextScale,
          pinchMetrics.anchorX,
          pinchMetrics.anchorY,
        );

        applyViewport({
          scale: nextScale,
          offsetX: zoomedOffset.offsetX,
          offsetY: zoomedOffset.offsetY,
        });
        return;
      }

      const dragState = dragStateRef.current;
      if (!dragState || pointersRef.current.size !== 1) {
        return;
      }

      applyViewport({
        scale: viewportRef.current.scale,
        offsetX: dragState.offsetX + (event.clientX - dragState.startX),
        offsetY: dragState.offsetY + (event.clientY - dragState.startY),
      });
    };

    const clearPointer = (event: PointerEvent) => {
      pointersRef.current.delete(event.pointerId);

      if (pointersRef.current.size < 2) {
        pinchStateRef.current = null;
      }

      if (pointersRef.current.size === 0) {
        dragStateRef.current = null;
        setIsDragging(false);
      }

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const tryInvokeTap = (event: PointerEvent) => {
      const tapState = tapStateRef.current;

      if (
        !tapState ||
        tapState.pointerId !== event.pointerId ||
        tapState.hadPinch ||
        pointersRef.current.size !== 1
      ) {
        return;
      }

      const distance = Math.hypot(
        event.clientX - tapState.startX,
        event.clientY - tapState.startY,
      );

      if (distance <= TAP_THRESHOLD_PX) {
        onTapRef.current?.(event.clientX, event.clientY);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      tryInvokeTap(event);
      clearPointer(event);

      if (pointersRef.current.size === 0) {
        tapStateRef.current = null;
      }
    };

    const onPointerCancel = (event: PointerEvent) => {
      clearPointer(event);

      if (pointersRef.current.size === 0) {
        tapStateRef.current = null;
      }
    };

    const onDoubleClick = () => {
      viewportRef.current = DEFAULT_VIEWPORT;
      setIsZoomed(false);
      setIsDragging(false);
      dragStateRef.current = null;
      pinchStateRef.current = null;
      tapStateRef.current = null;
      pointersRef.current.clear();
      requestRedraw();
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("dblclick", onDoubleClick);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("dblclick", onDoubleClick);
    };
  }, [applyViewport, canvasRef, getCanvasMetrics, requestRedraw]);

  return {
    getViewport,
    isDragging,
    isZoomed,
  };
}
