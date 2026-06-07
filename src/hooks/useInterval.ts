import { useEffect, useRef } from "react";

export function useInterval(callback: () => void, delayMs: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) {
      return;
    }

    const tick = () => {
      savedCallback.current();
    };

    tick();
    const id = window.setInterval(tick, delayMs);
    return () => window.clearInterval(id);
  }, [delayMs]);
}
