import { useCallback, useEffect, useRef, useState } from "react";

import { useSettings } from "@/context/SettingsContext";
import { useInterval } from "@/hooks/useInterval";
import {
  equatorialToHorizontal,
  getJulianDate,
  getLocalSiderealTime,
} from "@/lib/astronomy";
import {
  projectAltitudeAzimuth,
  projectAltitudeCircle,
} from "@/lib/projection";
import { filterStarsByMagnitude, getStarRadius } from "@/lib/starData";

const REFRESH_INTERVAL_MS = 15_000;

export function Planisphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());

  const refresh = useCallback(() => {
    setNow(new Date());
  }, []);

  useInterval(refresh, REFRESH_INTERVAL_MS);

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
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      const dpr = window.devicePixelRatio || 1;

      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size * 0.46;

      context.fillStyle = "#050814";
      context.fillRect(0, 0, size, size);

      context.save();
      context.translate(centerX, centerY);

      drawAltitudeCircle(context, radius, 60, "rgba(148, 163, 184, 0.25)");
      drawAltitudeCircle(context, radius, 30, "rgba(148, 163, 184, 0.35)");

      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.strokeStyle = "rgba(226, 232, 240, 0.7)";
      context.lineWidth = 1.5;
      context.stroke();

      drawZenithCross(context);
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

        const starRadius = getStarRadius(star.m);
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
        drawStarLabels(context, labelCandidates);
      }

      context.restore();
    };

    draw();

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [now, settings]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        className="touch-none"
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
) {
  const circleRadius = projectAltitudeCircle(altitude, radius);
  context.beginPath();
  context.arc(0, 0, circleRadius, 0, Math.PI * 2);
  context.strokeStyle = strokeStyle;
  context.lineWidth = 1;
  context.setLineDash([4, 6]);
  context.stroke();
  context.setLineDash([]);
}

function drawZenithCross(context: CanvasRenderingContext2D) {
  const size = 8;
  context.strokeStyle = "rgba(226, 232, 240, 0.8)";
  context.lineWidth = 1.5;
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
) {
  const sorted = [...labels]
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, 40);

  context.font = "11px system-ui, sans-serif";
  context.fillStyle = "rgba(191, 219, 254, 0.9)";
  context.textAlign = "left";
  context.textBaseline = "middle";

  for (const label of sorted) {
    context.fillText(label.name, label.x + 6, label.y - 6);
  }
}
