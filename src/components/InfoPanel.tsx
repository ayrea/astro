import { ChevronDown } from "lucide-react";
import { useMemo } from "react";

import { CrossingTable } from "@/components/CrossingTable";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";
import { useObserverTime } from "@/context/TimeContext";
import { getJulianDate } from "@/lib/astronomy";
import { type CrossingsDetail } from "@/lib/crossings";
import { findMoonCrossings, getMoonPhase } from "@/lib/moon";
import {
  findPlanetCrossings,
  PLANET_NAMES,
  type PlanetName,
} from "@/lib/planets";
import { findSunCrossings } from "@/lib/sun";
import { cn } from "@/lib/utils";

function formatTime(date: Date, includeSeconds: boolean = false): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: false,
  });
}

function formatCrossingTime(date: Date | null): string {
  return date ? formatTime(date) : "—";
}

function buildCrossingInfoRows(crossings: CrossingsDetail) {
  return [
    {
      label: crossings.isAboveHorizon ? "Last Rise" : "Last Set",
      value: formatCrossingTime(
        crossings.isAboveHorizon ? crossings.lastRise : crossings.lastSet,
      ),
    },
    {
      label: crossings.isAboveHorizon ? "Next Set" : "Next Rise",
      value: formatCrossingTime(
        crossings.isAboveHorizon ? crossings.nextSet : crossings.nextRise,
      ),
    },
  ];
}

function getMoonPhaseName(elongationDeg: number): string {
  if (elongationDeg < 22.5 || elongationDeg >= 337.5) {
    return "New Moon";
  }
  if (elongationDeg < 67.5) {
    return "Waxing Crescent";
  }
  if (elongationDeg < 112.5) {
    return "First Quarter";
  }
  if (elongationDeg < 157.5) {
    return "Waxing Gibbous";
  }
  if (elongationDeg < 202.5) {
    return "Full Moon";
  }
  if (elongationDeg < 247.5) {
    return "Waning Gibbous";
  }
  if (elongationDeg < 292.5) {
    return "Last Quarter";
  }
  return "Waning Crescent";
}

interface InfoPanelProps {
  onClose: () => void;
  className?: string;
}

export function InfoPanel({ onClose, className }: InfoPanelProps) {
  const { settings } = useSettings();
  const { observerTime } = useObserverTime();

  const sun = useMemo(
    () => findSunCrossings(observerTime, settings.latitude, settings.longitude),
    [observerTime, settings.latitude, settings.longitude],
  );

  const moon = useMemo(
    () =>
      findMoonCrossings(observerTime, settings.latitude, settings.longitude),
    [observerTime, settings.latitude, settings.longitude],
  );
  const moonPhase = useMemo(
    () => getMoonPhase(getJulianDate(observerTime)),
    [observerTime],
  );

  const sunInfoRows = useMemo(() => buildCrossingInfoRows(sun), [sun]);
  const moonInfoRows = useMemo(
    () => [
      ...buildCrossingInfoRows(moon),
      { label: "Phase", value: getMoonPhaseName(moonPhase.elongationDeg) },
      {
        label: "Illumination",
        value: `${Math.round(moonPhase.illuminatedFraction * 100)}%`,
      },
    ],
    [moon, moonPhase],
  );

  const planetCrossings = useMemo(() => {
    const crossings = {} as Record<PlanetName, CrossingsDetail>;

    for (const name of PLANET_NAMES) {
      crossings[name] = findPlanetCrossings(
        observerTime,
        settings.latitude,
        settings.longitude,
        name,
      );
    }

    return crossings;
  }, [observerTime, settings.latitude, settings.longitude]);

  return (
    <aside
      className={cn(
        "order-2 flex min-h-0 shrink-0 flex-col overflow-hidden border-border/60 bg-card/80 backdrop-blur md:order-1",
        "max-h-[40dvh] w-full border-t",
        "md:h-full md:max-h-none md:w-80 md:border-r md:border-t-0",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2">
        <h2 className="text-sm font-semibold text-foreground">Info</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Hide info panel"
        >
          <ChevronDown className="h-4 w-4 md:rotate-90" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <CrossingTable title="Sun" rows={sunInfoRows} />
          <CrossingTable title="Moon" rows={moonInfoRows} />
          {PLANET_NAMES.map((name) => (
            <CrossingTable
              key={name}
              title={name}
              rows={buildCrossingInfoRows(planetCrossings[name])}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
