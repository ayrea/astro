import { useCallback, useEffect, useRef, useState } from "react";

import {
  type ElevationSpacing,
  type GridDecSpacing,
  type GridRaSpacing,
  useSettings,
} from "@/context/SettingsContext";
import { useInterval } from "@/hooks/useInterval";
import { usePanZoom } from "@/hooks/usePanZoom";
import {
  eclipticToEquatorial,
  equatorialToHorizontal,
  type FrameConstants,
  getJulianDate,
  getLocalSiderealTime,
  prepareFrameConstants,
  equatorialToScreen,
} from "@/lib/astronomy";
import {
  projectElevationAzimuth,
  projectElevationCircle,
} from "@/lib/projection";
import {
  constellationBoundaryEdges,
  constellationLines,
} from "@/lib/constellationData";
import {
  getScreenStarRadius,
  getStarCountForMagnitude,
  stars,
} from "@/lib/starData";
import { getMoonEquatorial } from "@/lib/moon";
import { getSunEquatorial } from "@/lib/sun";
import { getCanvasMetrics } from "@/lib/viewport";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL_MS = 15_000;
const ALPHA_BUCKETS = 10;
const SUN_MAGNITUDE = -26.7;
const MOON_MAGNITUDE = -12.7;

interface StarArc {
  x: number;
  y: number;
  r: number;
}

function applyOpacity(rgbaColor: string, opacity: number): string {
  const match = rgbaColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);

  if (!match) {
    return rgbaColor;
  }

  const [, red, green, blue] = match;
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}
const DECLINATION_SAMPLES = 180;
const ECLIPTIC_SAMPLES = 180;
const RIGHT_ASCENSION_SAMPLES = 180;

function getRightAscensionLines(spacingHours: GridRaSpacing): number[] {
  const lineCount = 24 / spacingHours;
  return Array.from({ length: lineCount }, (_, index) => index * spacingHours);
}

function getDeclinationLines(spacingDegrees: GridDecSpacing): number[] {
  const lineCount = 180 / spacingDegrees + 1;
  return Array.from(
    { length: lineCount },
    (_, index) => -90 + index * spacingDegrees,
  );
}

function getElevationAngles(spacingDegrees: ElevationSpacing): number[] {
  const lineCount = 90 / spacingDegrees;
  return Array.from(
    { length: lineCount },
    (_, index) => (index + 1) * spacingDegrees,
  );
}

export function Planisphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const rafIdRef = useRef(0);
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
    if (rafIdRef.current === 0) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = 0;
        drawRef.current?.();
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== 0) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
    };
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

    const starBuckets: StarArc[][] = Array.from(
      { length: ALPHA_BUCKETS },
      () => [],
    );
    const projectedPoint = { x: 0, y: 0, visible: false };

    const draw = () => {
      const t0 = performance.now();
      const viewport = getViewport();
      const metrics = getCanvasMetrics(container.getBoundingClientRect());
      const { width, height, centerX, centerY, radius } = metrics;
      const dpr = window.devicePixelRatio || 1;

      const targetWidth = width * dpr;
      const targetHeight = height * dpr;

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      context.fillStyle = "#050814";
      context.fillRect(0, 0, width, height);

      context.save();
      context.translate(centerX + viewport.offsetX, centerY + viewport.offsetY);
      context.scale(viewport.scale, viewport.scale);

      if (settings.showElevation) {
        const elevationAngles = getElevationAngles(settings.elevationSpacing);
        const elevationLineColor = applyOpacity(
          settings.elevationLineColor,
          settings.elevationLineOpacity,
        );
        const elevationLabelColor = applyOpacity(
          settings.elevationLabelColor,
          settings.elevationLineOpacity,
        );

        for (const elevation of elevationAngles) {
          const circleRadius = projectElevationCircle(elevation, radius);

          drawElevationCircle(
            context,
            circleRadius,
            elevationLineColor,
            viewport.scale,
            settings.elevationLineThickness,
          );

          if (settings.showElevationLabels) {
            drawInverseScaleLabel(
              context,
              `${elevation}°`,
              0,
              -circleRadius,
              viewport.scale,
              elevationLabelColor,
              settings.elevationLabelFontSize,
            );
          }
        }

        if (settings.showZenithCross) {
          drawZenithCross(
            context,
            viewport.scale,
            elevationLineColor,
            settings.elevationLineThickness,
          );
        }
      }

      const julianDate = getJulianDate(now);
      const lst = getLocalSiderealTime(julianDate, settings.longitude);
      const frameConstants = prepareFrameConstants(settings.latitude, lst);

      if (settings.showGrid) {
        const rightAscensionLines = getRightAscensionLines(
          settings.gridRaSpacing,
        );
        const declinationLines = getDeclinationLines(settings.gridDecSpacing);
        const gridLineColor = applyOpacity(
          settings.gridLineColor,
          settings.gridLineOpacity,
        );
        const gridLabelColor = applyOpacity(
          settings.gridLabelColor,
          settings.gridLineOpacity,
        );

        drawDeclinationLines(
          context,
          radius,
          settings.latitude,
          lst,
          settings.mirrorEastWest,
          viewport.scale,
          declinationLines,
          gridLineColor,
          settings.gridLineThickness,
          gridLabelColor,
          settings.gridLabelFontSize,
        );
        drawRightAscensionLines(
          context,
          radius,
          settings.latitude,
          lst,
          settings.mirrorEastWest,
          viewport.scale,
          rightAscensionLines,
          gridLineColor,
          settings.gridLineThickness,
          gridLabelColor,
          settings.gridLabelFontSize,
        );
      }

      if (settings.showEcliptic) {
        const eclipticLineColor = applyOpacity(
          settings.eclipticLineColor,
          settings.eclipticLineOpacity,
        );
        drawEcliptic(
          context,
          radius,
          settings.latitude,
          lst,
          settings.mirrorEastWest,
          viewport.scale,
          eclipticLineColor,
          settings.eclipticLineThickness,
        );
      }

      if (settings.showConstellationBounds) {
        const boundsColor = applyOpacity(
          settings.constellationBoundsColor,
          settings.constellationBoundsOpacity,
        );
        drawConstellationBoundaries(
          context,
          frameConstants,
          radius,
          settings.mirrorEastWest,
          viewport.scale,
          boundsColor,
          settings.constellationBoundsThickness,
        );
      }

      if (settings.showConstellations) {
        const constLineColor = applyOpacity(
          settings.constellationLineColor,
          settings.constellationLineOpacity,
        );
        drawConstellationLines(
          context,
          frameConstants,
          radius,
          settings.mirrorEastWest,
          viewport.scale,
          constLineColor,
          settings.constellationLineThickness,
        );

        if (settings.showConstellationLabels) {
          const constellationLabelColor = applyOpacity(
            settings.constellationLabelColor,
            settings.constellationLineOpacity,
          );
          drawConstellationLabels(
            context,
            frameConstants,
            radius,
            settings.mirrorEastWest,
            viewport.scale,
            constellationLabelColor,
            settings.constellationLabelFontSize,
          );
        }
      }

      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.strokeStyle = "rgba(226, 232, 240, 0.7)";
      context.lineWidth = 1.5;
      context.stroke();

      drawCompassLabels(context, radius, settings.mirrorEastWest);

      const starCount = getStarCountForMagnitude(settings.magnitudeCutoff);
      const labelCandidates: Array<{
        x: number;
        y: number;
        name: string;
        magnitude: number;
      }> = [];

      for (let i = 0; i < ALPHA_BUCKETS; i++) {
        starBuckets[i].length = 0;
      }

      for (let starIndex = 0; starIndex < starCount; starIndex++) {
        const star = stars[starIndex];

        if (star.n === "Sun") {
          continue;
        }

        equatorialToScreen(
          star.r,
          star.d,
          frameConstants,
          radius,
          settings.mirrorEastWest,
          projectedPoint,
        );

        if (!projectedPoint.visible) {
          continue;
        }

        const starRadius = getScreenStarRadius(star.m, viewport.scale);
        const bucketIndex = Math.min(
          ALPHA_BUCKETS - 1,
          Math.floor((1 - star.m / 10) * ALPHA_BUCKETS),
        );

        starBuckets[bucketIndex].push({
          x: projectedPoint.x,
          y: projectedPoint.y,
          r: starRadius,
        });

        if (settings.showLabels && star.n) {
          labelCandidates.push({
            x: projectedPoint.x,
            y: projectedPoint.y,
            name: star.n,
            magnitude: star.m,
          });
        }
      }

      const { raHours: sunRaHours, decDegrees: sunDecDegrees } =
        getSunEquatorial(julianDate);

      equatorialToScreen(
        sunRaHours,
        sunDecDegrees,
        frameConstants,
        radius,
        settings.mirrorEastWest,
        projectedPoint,
      );

      if (projectedPoint.visible) {
        const sunRadius = getScreenStarRadius(SUN_MAGNITUDE, viewport.scale);
        starBuckets[ALPHA_BUCKETS - 1].push({
          x: projectedPoint.x,
          y: projectedPoint.y,
          r: sunRadius,
        });

        if (settings.showLabels) {
          labelCandidates.push({
            x: projectedPoint.x,
            y: projectedPoint.y,
            name: "Sun",
            magnitude: SUN_MAGNITUDE,
          });
        }
      }

      const { raHours: moonRaHours, decDegrees: moonDecDegrees } =
        getMoonEquatorial(julianDate);

      equatorialToScreen(
        moonRaHours,
        moonDecDegrees,
        frameConstants,
        radius,
        settings.mirrorEastWest,
        projectedPoint,
      );

      if (projectedPoint.visible) {
        const moonRadius = getScreenStarRadius(MOON_MAGNITUDE, viewport.scale);
        starBuckets[ALPHA_BUCKETS - 1].push({
          x: projectedPoint.x,
          y: projectedPoint.y,
          r: moonRadius,
        });

        if (settings.showLabels) {
          labelCandidates.push({
            x: projectedPoint.x,
            y: projectedPoint.y,
            name: "Moon",
            magnitude: MOON_MAGNITUDE,
          });
        }
      }

      for (let bucketIndex = 0; bucketIndex < ALPHA_BUCKETS; bucketIndex++) {
        const bucket = starBuckets[bucketIndex];
        if (bucket.length === 0) {
          continue;
        }

        const alpha = Math.max(0.35, (bucketIndex + 0.5) / ALPHA_BUCKETS);
        context.fillStyle = `rgba(248, 250, 252, ${alpha})`;
        context.beginPath();

        for (const starArc of bucket) {
          context.moveTo(starArc.x + starArc.r, starArc.y);
          context.arc(starArc.x, starArc.y, starArc.r, 0, Math.PI * 2);
        }

        context.fill();
      }

      if (settings.showLabels) {
        drawStarLabels(context, labelCandidates, viewport.scale);
      }

      context.restore();

      console.log(
        `[Planisphere] redraw: ${(performance.now() - t0).toFixed(2)}ms`,
      );
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

function projectEquatorial(
  rightAscensionHours: number,
  declinationDegrees: number,
  latitude: number,
  lst: number,
  radius: number,
  mirrorEastWest: boolean,
) {
  const horizontal = equatorialToHorizontal(
    rightAscensionHours,
    declinationDegrees,
    latitude,
    lst,
  );

  return projectElevationAzimuth(
    horizontal.elevation,
    horizontal.azimuth,
    radius,
    mirrorEastWest,
  );
}

function strokeVisibleSampledPath(
  context: CanvasRenderingContext2D,
  samples: Array<{ x: number; y: number; visible: boolean }>,
) {
  let pathStarted = false;

  for (const point of samples) {
    if (point.visible) {
      if (!pathStarted) {
        context.beginPath();
        context.moveTo(point.x, point.y);
        pathStarted = true;
      } else {
        context.lineTo(point.x, point.y);
      }
    } else if (pathStarted) {
      context.stroke();
      pathStarted = false;
    }
  }

  if (pathStarted) {
    context.stroke();
  }
}

function strokeSampledPath(
  context: CanvasRenderingContext2D,
  samples: Array<{ x: number; y: number; visible: boolean }>,
  strokeStyle: string,
  scale: number,
  lineThickness: number,
) {
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineThickness / scale;
  context.setLineDash([4 / scale, 6 / scale]);
  strokeVisibleSampledPath(context, samples);
  context.setLineDash([]);
}

function drawInverseScaleLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  labelColor: string,
  fontSize: number,
  align: CanvasTextAlign = "center",
) {
  context.save();
  context.translate(x, y);
  context.scale(1 / scale, 1 / scale);
  context.font = `${fontSize}px system-ui, sans-serif`;
  context.fillStyle = labelColor;
  context.textAlign = align;
  context.textBaseline = "middle";
  context.fillText(text, 0, 0);
  context.restore();
}

function formatDeclinationLabel(declination: number): string {
  if (declination === 0) {
    return "0°";
  }

  const sign = declination > 0 ? "+" : "";
  return `${sign}${declination}°`;
}

function drawDeclinationLines(
  context: CanvasRenderingContext2D,
  radius: number,
  latitude: number,
  lst: number,
  mirrorEastWest: boolean,
  scale: number,
  declinationLines: number[],
  lineColor: string,
  lineThickness: number,
  labelColor: string,
  labelFontSize: number,
) {
  for (const declination of declinationLines) {
    if (Math.abs(declination) === 90) {
      continue;
    }

    const samples = Array.from(
      { length: DECLINATION_SAMPLES + 1 },
      (_, index) => {
        const rightAscension = (index / DECLINATION_SAMPLES) * 24;
        return projectEquatorial(
          rightAscension,
          declination,
          latitude,
          lst,
          radius,
          mirrorEastWest,
        );
      },
    );

    strokeSampledPath(context, samples, lineColor, scale, lineThickness);

    const labelPoint = projectEquatorial(
      lst,
      declination,
      latitude,
      lst,
      radius,
      mirrorEastWest,
    );

    if (labelPoint.visible) {
      drawInverseScaleLabel(
        context,
        formatDeclinationLabel(declination),
        labelPoint.x,
        labelPoint.y,
        scale,
        labelColor,
        labelFontSize,
        declination >= 0 ? "left" : "right",
      );
    }
  }
}

function drawEcliptic(
  context: CanvasRenderingContext2D,
  radius: number,
  latitude: number,
  lst: number,
  mirrorEastWest: boolean,
  scale: number,
  color: string,
  lineThickness: number,
) {
  const samples = Array.from({ length: ECLIPTIC_SAMPLES + 1 }, (_, index) => {
    const eclipticLongitude = (index / ECLIPTIC_SAMPLES) * 360;
    const { raHours, decDegrees } = eclipticToEquatorial(eclipticLongitude);
    return projectEquatorial(
      raHours,
      decDegrees,
      latitude,
      lst,
      radius,
      mirrorEastWest,
    );
  });

  strokeSampledPath(context, samples, color, scale, lineThickness);
}

function drawRightAscensionLines(
  context: CanvasRenderingContext2D,
  radius: number,
  latitude: number,
  lst: number,
  mirrorEastWest: boolean,
  scale: number,
  rightAscensionLines: number[],
  lineColor: string,
  lineThickness: number,
  labelColor: string,
  labelFontSize: number,
) {
  for (const rightAscension of rightAscensionLines) {
    const samples = Array.from(
      { length: RIGHT_ASCENSION_SAMPLES + 1 },
      (_, index) => {
        const declination = -90 + (index / RIGHT_ASCENSION_SAMPLES) * 180;
        return projectEquatorial(
          rightAscension,
          declination,
          latitude,
          lst,
          radius,
          mirrorEastWest,
        );
      },
    );

    strokeSampledPath(context, samples, lineColor, scale, lineThickness);

    const labelPoint = projectEquatorial(
      rightAscension,
      0,
      latitude,
      lst,
      radius,
      mirrorEastWest,
    );

    if (labelPoint.visible) {
      drawInverseScaleLabel(
        context,
        `${rightAscension}h`,
        labelPoint.x,
        labelPoint.y,
        scale,
        labelColor,
        labelFontSize,
      );
    }
  }
}

function drawElevationCircle(
  context: CanvasRenderingContext2D,
  circleRadius: number,
  strokeStyle: string,
  scale: number,
  lineThickness: number,
) {
  context.beginPath();
  context.arc(0, 0, circleRadius, 0, Math.PI * 2);
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineThickness / scale;
  context.setLineDash([4 / scale, 6 / scale]);
  context.stroke();
  context.setLineDash([]);
}

function drawZenithCross(
  context: CanvasRenderingContext2D,
  scale: number,
  strokeStyle: string,
  lineThickness: number,
) {
  const size = 8;
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineThickness / scale;
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

const constellationScreenPoint = { x: 0, y: 0, visible: false };

function drawConstellationLines(
  context: CanvasRenderingContext2D,
  frame: FrameConstants,
  radius: number,
  mirrorEastWest: boolean,
  scale: number,
  strokeColor: string,
  lineThickness: number,
) {
  context.strokeStyle = strokeColor;
  context.lineWidth = lineThickness / scale;
  context.setLineDash([]);

  for (const constellation of constellationLines) {
    for (const segment of constellation.segments) {
      let pathStarted = false;

      for (const point of segment.points) {
        equatorialToScreen(
          point.ra,
          point.dec,
          frame,
          radius,
          mirrorEastWest,
          constellationScreenPoint,
        );

        if (constellationScreenPoint.visible) {
          if (!pathStarted) {
            context.beginPath();
            context.moveTo(
              constellationScreenPoint.x,
              constellationScreenPoint.y,
            );
            pathStarted = true;
          } else {
            context.lineTo(
              constellationScreenPoint.x,
              constellationScreenPoint.y,
            );
          }
        } else if (pathStarted) {
          context.stroke();
          pathStarted = false;
        }
      }

      if (pathStarted) {
        context.stroke();
      }
    }
  }
}

function drawConstellationLabels(
  context: CanvasRenderingContext2D,
  frame: FrameConstants,
  radius: number,
  mirrorEastWest: boolean,
  scale: number,
  labelColor: string,
  labelFontSize: number,
) {
  for (const constellation of constellationLines) {
    let sumX = 0;
    let sumY = 0;
    let visibleCount = 0;

    for (const segment of constellation.segments) {
      for (const point of segment.points) {
        equatorialToScreen(
          point.ra,
          point.dec,
          frame,
          radius,
          mirrorEastWest,
          constellationScreenPoint,
        );

        if (constellationScreenPoint.visible) {
          sumX += constellationScreenPoint.x;
          sumY += constellationScreenPoint.y;
          visibleCount++;
        }
      }
    }

    if (visibleCount === 0) {
      continue;
    }

    drawInverseScaleLabel(
      context,
      constellation.name,
      sumX / visibleCount,
      sumY / visibleCount,
      scale,
      labelColor,
      labelFontSize,
    );
  }
}

function drawConstellationBoundaries(
  context: CanvasRenderingContext2D,
  frame: FrameConstants,
  radius: number,
  mirrorEastWest: boolean,
  scale: number,
  strokeColor: string,
  lineThickness: number,
) {
  context.strokeStyle = strokeColor;
  context.lineWidth = lineThickness / scale;
  context.setLineDash([2 / scale, 4 / scale]);

  const projectedSamples: Array<{ x: number; y: number; visible: boolean }> =
    [];

  for (const edge of constellationBoundaryEdges) {
    if (projectedSamples.length > 0) {
      projectedSamples.push({ x: 0, y: 0, visible: false });
    }

    for (const point of edge.points) {
      equatorialToScreen(
        point.ra,
        point.dec,
        frame,
        radius,
        mirrorEastWest,
        constellationScreenPoint,
      );

      projectedSamples.push({
        x: constellationScreenPoint.x,
        y: constellationScreenPoint.y,
        visible: constellationScreenPoint.visible,
      });
    }
  }

  strokeVisibleSampledPath(context, projectedSamples);
  context.setLineDash([]);
}
