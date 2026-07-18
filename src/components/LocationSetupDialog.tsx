import { Loader2, LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LocationPicker } from "@/components/LocationPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/context/SettingsContext";
import {
  findObserverCityByKey,
  loadObserverCities,
  type ObserverCity,
} from "@/data/observer-cities";
import {
  isLocationSetupDone,
  markLocationSetupDone,
} from "@/lib/location-setup";

export function LocationSetupDialog() {
  const { updateSettings } = useSettings();
  const [open, setOpen] = useState(() => !isLocationSetupDone());
  const [observerCities, setObserverCities] = useState<ObserverCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(
    () => !isLocationSetupDone(),
  );
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const loadIdRef = useRef(0);

  const geolocationSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    if (!open || observerCities.length > 0) {
      return;
    }

    const loadId = ++loadIdRef.current;
    loadObserverCities()
      .then((cities) => {
        if (loadId !== loadIdRef.current) {
          return;
        }
        setObserverCities(cities);
        setCitiesLoading(false);
      })
      .catch(() => {
        if (loadId !== loadIdRef.current) {
          return;
        }
        setCitiesLoading(false);
      });
  }, [open, observerCities.length]);

  const completeSetup = () => {
    markLocationSetupDone();
    setOpen(false);
  };

  const handleUseCurrentLocation = () => {
    if (!geolocationSupported) {
      return;
    }

    setLocateError(null);
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Math.min(90, Math.max(-90, position.coords.latitude));
        const longitude = Math.min(
          180,
          Math.max(-180, position.coords.longitude),
        );
        updateSettings({ latitude, longitude });
        setLocating(false);
        completeSetup();
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Current location unavailable."
              : error.code === error.TIMEOUT
                ? "Timed out getting current location."
                : "Unable to get current location.";
        setLocateError(message);
        setLocating(false);
      },
    );
  };

  const handleCitySelect = (cityId: string) => {
    const city = findObserverCityByKey(cityId, observerCities);
    if (!city) {
      return;
    }

    updateSettings({
      latitude: city.latitude,
      longitude: city.longitude,
    });
    completeSetup();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent onDismiss={() => {}} showClose={false}>
        <DialogHeader>
          <DialogTitle>Set your observing location</DialogTitle>
          <DialogDescription>
            The sky chart depends on where you are. Choose your current location
            or a city below to continue. You can change your location at any
            time via Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          <Button
            type="button"
            className="w-full"
            disabled={!geolocationSupported || locating}
            title={
              geolocationSupported
                ? "Use my current location"
                : "Current location is not available in this browser"
            }
            onClick={handleUseCurrentLocation}
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            Use my current location
          </Button>
          {locateError && (
            <p className="text-xs text-destructive">{locateError}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="setup-location">Or choose a city</Label>
            <LocationPicker
              id="setup-location"
              value=""
              cities={observerCities}
              loading={citiesLoading}
              showCustomOption={false}
              onCitySelect={handleCitySelect}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
