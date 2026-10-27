import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { EcgSimulationRequest, EcgSimulationResponse } from "@/api/client";
import { useEcgStore } from "@/labs/ecg/store";

const DEBOUNCE_MS = 300;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export interface SimulationState {
  data: EcgSimulationResponse | undefined;
  isFetching: boolean;
  isStale: boolean;
  error: Error | null;
  elapsedMs: number | null;
  /** The request the current `data` was computed from. */
  request: EcgSimulationRequest | undefined;
}

/**
 * Runs the simulation on the backend. With auto-run the request is debounced; otherwise
 * it only runs on an explicit run (Run button / Ctrl+Enter), which snapshots the request.
 */
export function useSimulation(): SimulationState {
  const request = useEcgStore((s) => s.request);
  const autoRun = useEcgStore((s) => s.autoRun);
  const manualSnapshot = useEcgStore((s) => s.manualSnapshot);

  const serialized = useMemo(() => JSON.stringify(request), [request]);
  const debounced = useDebounced(serialized, DEBOUNCE_MS);
  const manual = useMemo(() => JSON.stringify(manualSnapshot), [manualSnapshot]);
  const effective = autoRun ? debounced : manual;

  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["ecg", "simulate", effective],
    queryFn: async () => {
      const t0 = performance.now();
      const res = await api.ecg.simulate(JSON.parse(effective) as EcgSimulationRequest);
      setElapsedMs(performance.now() - t0);
      return res;
    },
    placeholderData: (prev) => prev,
    staleTime: Infinity,
  });

  const computedRequest = useMemo(
    () => (query.data ? (JSON.parse(effective) as EcgSimulationRequest) : undefined),
    [query.data, effective],
  );

  return {
    data: query.data,
    isFetching: query.isFetching,
    isStale: serialized !== effective,
    error: query.error,
    elapsedMs,
    request: computedRequest,
  };
}
