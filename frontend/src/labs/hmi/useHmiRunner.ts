import { useEffect, useState, useSyncExternalStore } from "react";
import type { HmiDesign, HmiTaskSpec } from "@/api/client";
import { HmiEngine } from "@/labs/hmi/engine";
import type { HmiCompleteHandler } from "@/labs/hmi/engine";

export type { HmiRunnerState } from "@/labs/hmi/engine";

export function useHmiRunner(
  design: HmiDesign,
  tasks: HmiTaskSpec[] | undefined,
  onComplete: HmiCompleteHandler,
) {
  const [engine] = useState(() => new HmiEngine());
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  useEffect(() => {
    engine.configure(design, tasks, onComplete);
  }, [engine, design, tasks, onComplete]);

  useEffect(() => () => engine.dispose(), [engine]);

  return {
    state,
    start: () => engine.start(),
    abort: () => engine.abort(),
    submit: engine.submit,
    rateTlx: engine.rateTlx,
    interact: engine.interact,
    alarmOrder: engine.alarmOrder,
  };
}
