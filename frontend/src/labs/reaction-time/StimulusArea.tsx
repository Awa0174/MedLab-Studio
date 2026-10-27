import type { RefCallback } from "react";
import type { ReactionTrial } from "@/api/client";
import type { Phase } from "@/labs/reaction-time/useReactionRunner";
import { fmt } from "@/lib/format";

/**
 * The stimulus panel. Its appearance is driven by the `data-on` attribute that the
 * runner sets directly (no React render between timer and paint).
 */
export function StimulusArea({
  phase,
  task,
  index,
  total,
  lastTrial,
  stimulusRef,
}: {
  phase: Phase;
  task: "simple" | "choice";
  index: number;
  total: number;
  lastTrial: ReactionTrial | null;
  stimulusRef: RefCallback<HTMLDivElement>;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={stimulusRef}
        data-testid="stimulus"
        className="stimulus bg-surface-2 border-border relative flex h-64 w-full max-w-xl items-center justify-center rounded-lg border-2 select-none"
        aria-live="off"
      >
        <style>{`
          .stimulus[data-on="simple"] { background: var(--ok); border-color: var(--ok); }
          .stimulus[data-on="left"] .arrow-left,
          .stimulus[data-on="right"] .arrow-right { opacity: 1; }
        `}</style>
        {task === "choice" ? (
          <>
            <span className="arrow-left text-ok absolute left-10 text-8xl opacity-0" aria-hidden>
              ◀
            </span>
            <span className="arrow-right text-ok absolute right-10 text-8xl opacity-0" aria-hidden>
              ▶
            </span>
          </>
        ) : null}
        <div className="text-muted text-center text-sm">
          {phase === "idle" && "Press Start, then keep your hand on the keyboard."}
          {phase === "measuring" && "Measuring display timing…"}
          {phase === "waiting" && "Wait…"}
          {phase === "stimulus" && (task === "simple" ? "" : "")}
          {phase === "feedback" && lastTrial ? <Feedback trial={lastTrial} /> : null}
          {phase === "done" && "Block complete."}
        </div>
      </div>
      <div className="text-faint flex gap-4 font-mono text-[11px]">
        <span>
          trial {Math.min(index + 1, total)} / {total}
        </span>
        <span>
          {task === "simple" ? "respond: Space" : "respond: ← or → matching the arrow"} · Esc aborts
        </span>
      </div>
    </div>
  );
}

function Feedback({ trial }: { trial: ReactionTrial }) {
  if (trial.timed_out) return <span className="text-danger font-mono">timeout</span>;
  if (trial.anticipated) return <span className="text-warn font-mono">too early</span>;
  if (!trial.correct)
    return (
      <span className="text-danger font-mono">wrong key · {fmt(trial.reaction_ms, 0)} ms</span>
    );
  return <span className="text-fg-strong font-mono text-2xl">{fmt(trial.reaction_ms, 0)} ms</span>;
}
