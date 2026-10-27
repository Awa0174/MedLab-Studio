import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactionDesign, ReactionTrial, TimingInfo } from "@/api/client";
import { ReactionEngine } from "@/labs/reaction-time/engine";

export type { Phase, RunnerState } from "@/labs/reaction-time/engine";

/** React binding of the ReactionEngine: state via useSyncExternalStore, keys via window. */
export function useReactionRunner(
  design: ReactionDesign,
  onComplete: (trials: ReactionTrial[], timing: TimingInfo) => void,
) {
  const [engine] = useState(() => new ReactionEngine());
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  useEffect(() => {
    engine.configure(design, onComplete);
  }, [engine, design, onComplete]);

  useEffect(() => {
    window.addEventListener("keydown", engine.handleKey);
    return () => {
      window.removeEventListener("keydown", engine.handleKey);
      engine.dispose();
    };
  }, [engine]);

  return {
    state,
    stimulusRef: engine.attach,
    start: () => engine.start(),
    abort: () => engine.abort(),
  };
}
