import type { TimingInfo } from "@/api/client";

const METHOD =
  "stimulus onset at requestAnimationFrame after paint; response via keydown; performance.now()";

/** Smallest positive step of performance.now(), sampled in a tight loop. */
function measureTimerResolution(): number | null {
  let resolution: number | null = null;
  let t0 = performance.now();
  for (let i = 0; i < 20000; i++) {
    const t1 = performance.now();
    const d = t1 - t0;
    if (d > 0) {
      resolution = resolution === null ? d : Math.min(resolution, d);
      t0 = t1;
    }
  }
  return resolution !== null ? Number(resolution.toFixed(4)) : null;
}

/**
 * Measure what this browser can tell us about its own timing:
 * the display frame interval via requestAnimationFrame and the coarsening of
 * performance.now(). Both feed the uncertainty budget computed by the backend.
 *
 * Hidden tabs do not run animation frames; after `timeoutMs` the frame interval is
 * reported as unknown instead of blocking the experiment.
 */
export async function measureTiming(frames = 40, timeoutMs = 2000): Promise<TimingInfo> {
  const deltas: number[] = [];
  await new Promise<void>((resolve) => {
    let last: number | null = null;
    let count = 0;
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const step = (ts: number) => {
      if (settled) return;
      if (last !== null) deltas.push(ts - last);
      last = ts;
      count += 1;
      if (count <= frames) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
    window.setTimeout(done, timeoutMs);
  });
  const sorted = [...deltas].sort((a, b) => a - b);
  const median = sorted.length >= 5 ? (sorted[Math.floor(sorted.length / 2)] ?? null) : null;

  return {
    frame_interval_ms: median !== null ? Number(median.toFixed(3)) : null,
    refresh_rate_hz: median ? Number((1000 / median).toFixed(1)) : null,
    timer_resolution_ms: measureTimerResolution(),
    user_agent: navigator.userAgent.slice(0, 300),
    method: median !== null ? METHOD : `${METHOD}; frame interval not measurable (tab hidden?)`,
  };
}
