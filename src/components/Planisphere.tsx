import { useCallback, useEffect, useRef, useState } from "react";

import { useSettings } from "@/context/SettingsContext";
import { useInterval } from "@/hooks/useInterval";
import { usePanZoom } from "@/hooks/usePanZoom";
import {
  equatorialToHorizontal,
  getJulianDate,
  getLocalSiderealTime,
} from "@/lib/astronomy";
import {
  projectAltitudeAzimuth,
  projectAltitudeCircle,
} from "@/lib/projection";
import { filterStarsByMagnitude, getScreenStarRadius } from "@/lib/starData";
import { getCanvasMetrics } from "@/lib/viewport";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL_MS = 15_000;

export function Planisphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());

  const refresh = useCallback(() => {
    setNow(new Date());
  }, []);

  useInterval(refresh, REFRESH_INTERVAL_MS);

  const getMetrics = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return getCanvasMetrics(new DOMRect(0, 0, 0, 0));
    }

    return getCanvasMetrics(container.getBoundingClientRect());
  }, []);

  const requestRedraw = useCallback(() => {
    drawRef.current?.();
  }, []);

  const { getViewport, isDragging, isZoomed } = usePanZoom(
    canvasRef,
    getMetrics,
    requestRedraw,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const draw = () => {
      const viewport = getViewport();
      const metrics = getCanvasMetrics(container.getBoundingClientRect());
      const { width, height, centerX, centerY, radius } = metrics;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      context.fillStyle = "#050814";
      context.fillRect(0, 0, width, height);

      context.save();
      context.translate(centerX + viewport.offsetX, centerY + viewport.offsetY);
      context.scale(viewport.scale, viewport.scale);

      drawAltitudeCircle(
        context,
        radius,
        60,
        "rgba(148, 163, 184, 0.25)",
        viewport.scale,
      );
      drawAltitudeCircle(
        context,
        radius,
        30,
        "rgba(148, 163, 184, 0.35)",
        viewport.scale,
      );

      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.strokeStyle = "rgba(226, 232, 240, 0.7)";
      context.lineWidth = 1.5;
      context.stroke();

      drawZenithCross(context, viewport.scale);
      drawCompassLabels(context, radius, settings.mirrorEastWest);

      const julianDate = getJulianDate(now);
      const lst = getLocalSiderealTime(julianDate, settings.longitude);
      const visibleStars = filterStarsByMagnitude(settings.magnitudeCutoff);
      const labelCandidates: Array<{
        x: number;
        y: number;
        name: string;
        magnitude: number;
      }> = [];

      for (const star of visibleStars) {
        const horizontal = equatorialToHorizontal(
          star.r,
          star.d,
          settings.latitude,
          lst,
        );

        const projected = projectAltitudeAzimuth(
          horizontal.altitude,
          horizontal.azimuth,
          radius,
          settings.mirrorEastWest,
        );

        if (!projected.visible) {
          continue;
        }

        const starRadius = getScreenStarRadius(star.m, viewport.scale);
        const alpha = Math.max(0.35, 1 - star.m / 10);

        context.beginPath();
        context.arc(projected.x, projected.y, starRadius, 0, Math.PI * 2);
        context.fillStyle = `rgba(248, 250, 252, ${alpha})`;
        context.fill();

        if (settings.showLabels && star.n) {
          labelCandidates.push({
            x: projected.x,
            y: projected.y,
            name: star.n,
            magnitude: star.m,
          });
        }
      }

      if (settings.showLabels) {
        drawStarLabels(context, labelCandidates, viewport.scale);
      }

      context.restore();
    };

    drawRef.current = draw;
    draw();

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      drawRef.current = null;
    };
  }, [getViewport, now, settings]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas
        ref={canvasRef}
        className={cn(
          "block h-full w-full touch-none",
          isZoomed && !isDragging && "cursor-grab",
          isDragging && "cursor-grabbing",
        )}
        aria-label="Night sky planisphere"
      />
    </div>
  );
}

function drawAltitudeCircle(
  context: CanvasRenderingContext2D,
  radius: number,
  altitude: number,
  strokeStyle: string,
  scale: number,
) {
  const circleRadius = projectAltitudeCircle(altitude, radius);
  context.beginPath();
  context.arc(0, 0, circleRadius, 0, Math.PI * 2);
  context.strokeStyle = strokeStyle;
  context.lineWidth = 1 / scale;
  context.setLineDash([4 / scale, 6 / scale]);
  context.stroke();
  context.setLineDash([]);
}

function drawZenithCross(context: CanvasRenderingContext2D, scale: number) {
  const size = 8;
  context.strokeStyle = "rgba(226, 232, 240, 0.8)";
  context.lineWidth = 1.5 / scale;
  context.beginPath();
  context.moveTo(-size, 0);
  context.lineTo(size, 0);
  context.moveTo(0, -size);
  context.lineTo(0, size);
  context.stroke();
}

function drawCompassLabels(
  context: CanvasRenderingContext2D,
  radius: number,
  mirrorEastWest: boolean,
) {
  const labelOffset = 18;
  const fontSize = 14;

  context.font = `600 ${fontSize}px system-ui, sans-serif`;
  context.fillStyle = "rgba(226, 232, 240, 0.95)";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const labels: Array<{ text: string; x: number; y: number }> = [
    { text: "N", x: 0, y: -(radius + labelOffset) },
    { text: "S", x: 0, y: radius + labelOffset },
    {
      text: mirrorEastWest ? "W" : "E",
      x: radius + labelOffset,
      y: 0,
    },
    {
      text: mirrorEastWest ? "E" : "W",
      x: -(radius + labelOffset),
      y: 0,
    },
  ];

  for (const label of labels) {
    context.fillText(label.text, label.x, label.y);
  }
}

function drawStarLabels(
  context: CanvasRenderingContext2D,
  labels: Array<{ x: number; y: number; name: string; magnitude: number }>,
  scale: number,
) {
  const sorted = [...labels]
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, 40);

  context.font = "11px system-ui, sans-serif";
  context.fillStyle = "rgba(191, 219, 254, 0.9)";
  context.textAlign = "left";
  context.textBaseline = "middle";

  for (const label of sorted) {
    context.save();
    context.translate(label.x, label.y);
    context.scale(1 / scale, 1 / scale);
    context.fillText(label.name, 6, -6);
    context.restore();
  }
}
