import { useEffect, useState } from "react";

/**
 * Forces a periodic re-render so age-based liveness UI (e.g. `isLocationActive`)
 * updates over time even when no store change occurs — needed so a disconnected
 * member's row greys out instead of freezing on its last-known state.
 */
export function useLivenessTick(intervalMs = 10000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return tick;
}
