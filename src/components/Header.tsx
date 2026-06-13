import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import { SettingsTrigger } from "@/components/Settings";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";
import { useInterval } from "@/hooks/useInterval";
import { findMoonCrossings, type CrossingsDetail } from "@/lib/moon";
import { findSunCrossings } from "@/lib/sun";
import { cn } from "@/lib/utils";

const REFRESH_MS = 1000;

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
      label: crossings.isAboveHorizon ? "Next Set" : "Last Rise",
      value: formatCrossingTime(
        crossings.isAboveHorizon ? crossings.nextSet : crossings.nextRise,
      ),
    },
  ];
}

export function Header() {
  const { settings } = useSettings();
  const [expanded, setExpanded] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useInterval(() => setNow(new Date()), REFRESH_MS);

  const sun = useMemo(
    () => findSunCrossings(now, settings.latitude, settings.longitude),
    [now, settings.latitude, settings.longitude],
  );

  const moon = useMemo(
    () => findMoonCrossings(now, settings.latitude, settings.longitude),
    [now, settings.latitude, settings.longitude],
  );

  const sunInfoRows = useMemo(() => buildCrossingInfoRows(sun), [sun]);
  const moonInfoRows = useMemo(() => buildCrossingInfoRows(moon), [moon]);

  return (
    <header
      className={cn(
        "relative z-30 shrink-0 border-b border-border/60 bg-card/80 backdrop-blur",
        expanded ? "max-h-[50dvh]" : "max-h-9",
      )}
    >
      {expanded ? (
        <div className="flex max-h-[50dvh] flex-col gap-3 overflow-y-auto p-4">
          <div className="relative flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(false)}
              aria-label="Collapse header"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <div className="absolute right-0 top-0">
              <SettingsTrigger />
            </div>
          </div>

          <div className="flex justify-start">
            <div className="w-fit overflow-hidden rounded-md border-2 border-border/60 px-3">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <th
                      colSpan={2}
                      scope="colgroup"
                      className="py-1 text-left text-lg font-semibold border-b border-border/40"
                    >
                      Sun
                    </th>
                  </tr>
                  {sunInfoRows.map(({ label, value }) => (
                    <tr key={label}>
                      <th
                        scope="row"
                        className="py-1 pr-4 text-left font-medium text-muted-foreground"
                      >
                        {label}
                      </th>
                      <td className="py-1 text-left tabular-nums text-foreground">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="w-fit overflow-hidden rounded-md border-2 border-border/60 px-3 mx-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <th
                      colSpan={2}
                      scope="colgroup"
                      className="py-1 text-left text-lg font-semibold border-b border-border/40"
                    >
                      Moon
                    </th>
                  </tr>
                  {moonInfoRows.map(({ label, value }) => (
                    <tr key={label}>
                      <th
                        scope="row"
                        className="py-1 pr-4 text-left font-medium text-muted-foreground"
                      >
                        {label}
                      </th>
                      <td className="py-1 text-left tabular-nums text-foreground">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex h-9 w-full items-center justify-center"
          aria-label="Expand header"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </header>
  );
}
