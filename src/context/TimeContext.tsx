import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useInterval } from "@/hooks/useInterval";

const OBSERVER_TIME_REFRESH_MS = 1_000;

interface TimeContextValue {
  observerTime: Date;
  isLive: boolean;
  setLive: (enabled: boolean) => void;
  setObserverTime: (date: Date) => void;
}

const TimeContext = createContext<TimeContextValue | null>(null);

export function TimeProvider({ children }: { children: ReactNode }) {
  const [observerTime, setObserverTimeState] = useState(() => new Date());
  const [isLive, setIsLive] = useState(true);

  const refresh = useCallback(() => {
    setObserverTimeState(new Date());
  }, []);

  useInterval(refresh, isLive ? OBSERVER_TIME_REFRESH_MS : null);

  const setObserverTime = useCallback((date: Date) => {
    setObserverTimeState(date);
  }, []);

  const setLive = useCallback((enabled: boolean) => {
    if (!enabled) {
      setObserverTimeState(new Date());
    }
    setIsLive(enabled);
  }, []);

  const value = useMemo(
    () => ({
      observerTime,
      isLive,
      setLive,
      setObserverTime,
    }),
    [observerTime, isLive, setLive, setObserverTime],
  );

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useObserverTime(): TimeContextValue {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error("useObserverTime must be used within a TimeProvider");
  }
  return context;
}
