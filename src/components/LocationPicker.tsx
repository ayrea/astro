import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

import { Input } from "@/components/ui/input";
import {
  CUSTOM_LOCATION_ID,
  formatObserverCityLabel,
  observerCityKey,
  type ObserverCity,
} from "@/data/observer-cities";
import { cn } from "@/lib/utils";

interface LocationPickerProps {
  id?: string;
  value: string;
  cities: ObserverCity[];
  loading?: boolean;
  showCustomOption?: boolean;
  onCitySelect: (cityId: string) => void;
  onCustomSelect?: () => void;
}

export function LocationPicker({
  id,
  value,
  cities,
  loading = false,
  showCustomOption = true,
  onCitySelect,
  onCustomSelect,
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedLabel = useMemo(() => {
    if (loading) {
      return "Loading cities...";
    }
    if (value === CUSTOM_LOCATION_ID) {
      return "Custom...";
    }
    const selectedCity = cities.find((city) => observerCityKey(city) === value);
    return selectedCity
      ? formatObserverCityLabel(selectedCity)
      : "Select a city";
  }, [cities, loading, value]);

  const filteredCities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return cities;
    }
    return cities.filter((city) =>
      formatObserverCityLabel(city).toLowerCase().includes(normalizedQuery),
    );
  }, [cities, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setPanelStyle(getPanelStyle(triggerRef.current));
      searchRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleCitySelect = (cityId: string) => {
    onCitySelect(cityId);
    close();
  };

  const handleCustomSelect = () => {
    onCustomSelect?.();
    close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        )}
        onClick={() => {
          if (!loading) {
            setOpen((current) => !current);
          }
        }}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60]">
            <button
              type="button"
              aria-label="Close location picker"
              className="absolute inset-0 bg-black/20"
              onClick={close}
            />
            <div
              role="listbox"
              className="absolute z-[60] flex max-h-[min(24rem,calc(100dvh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
              style={panelStyle}
            >
              <div className="border-b border-border/60 p-2">
                <Input
                  ref={searchRef}
                  type="search"
                  placeholder="Search cities..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search cities"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-1">
                {filteredCities.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No cities match your search.
                  </p>
                ) : (
                  filteredCities.map((city) => {
                    const key = observerCityKey(city);
                    return (
                      <button
                        key={key}
                        type="button"
                        role="option"
                        aria-selected={key === value}
                        className={cn(
                          "flex w-full rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                          key === value && "bg-accent text-accent-foreground",
                        )}
                        onClick={() => handleCitySelect(key)}
                      >
                        {formatObserverCityLabel(city)}
                      </button>
                    );
                  })
                )}
              </div>
              {showCustomOption && (
                <div className="border-t border-border/60 p-1">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === CUSTOM_LOCATION_ID}
                    className={cn(
                      "flex w-full rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      value === CUSTOM_LOCATION_ID &&
                        "bg-accent text-accent-foreground",
                    )}
                    onClick={handleCustomSelect}
                  >
                    Custom...
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function getPanelStyle(trigger: HTMLButtonElement | null) {
  if (!trigger) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const rect = trigger.getBoundingClientRect();
  const panelWidth = Math.min(384, window.innerWidth - 16);
  const left = Math.min(
    Math.max(8, rect.left),
    window.innerWidth - panelWidth - 8,
  );
  const top = Math.min(rect.bottom + 4, window.innerHeight - 16);

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${panelWidth}px`,
  };
}
