import { beforeEach, describe, expect, it } from "vitest";
import { getFilter, normaliseRequest, useEcgStore } from "@/labs/ecg/store";
import { DEFAULT_REQUEST } from "@/labs/ecg/defaults";

describe("ECG parameter store", () => {
  beforeEach(() => useEcgStore.getState().reset());

  it("starts from the documented defaults", () => {
    expect(useEcgStore.getState().request).toEqual(DEFAULT_REQUEST);
  });

  it("updates nested signal parameters immutably", () => {
    const before = useEcgStore.getState().request;
    useEcgStore.getState().setSignal({ heart_rate_bpm: 120 });
    const after = useEcgStore.getState().request;
    expect(after.signal?.heart_rate_bpm).toBe(120);
    expect(before.signal?.heart_rate_bpm).toBe(72);
    expect(after.noise).toBe(before.noise);
  });

  it("keeps the filter chain in canonical order notch → bandpass → moving average", () => {
    const s = useEcgStore.getState();
    s.toggleFilter("notch", false);
    s.toggleFilter("bandpass", false);
    s.toggleFilter("moving_average", true);
    s.toggleFilter("bandpass", true);
    s.toggleFilter("notch", true);
    expect(useEcgStore.getState().request.filters?.map((f) => f.type)).toEqual([
      "notch",
      "bandpass",
      "moving_average",
    ]);
  });

  it("updates a single filter stage", () => {
    useEcgStore.getState().updateFilter("bandpass", { high_hz: 30 });
    expect(getFilter(useEcgStore.getState().request.filters, "bandpass")).toMatchObject({
      high_hz: 30,
      low_hz: 0.5,
    });
  });

  it("normalises a partial stored config to a complete request", () => {
    const req = normaliseRequest({
      seed: 7,
      signal: { heart_rate_bpm: 90 } as never,
      filters: [{ type: "bandpass" } as never],
    });
    expect(req.seed).toBe(7);
    expect(req.signal?.heart_rate_bpm).toBe(90);
    expect(req.signal?.sampling_rate_hz).toBe(500);
    expect(req.filters?.[0]).toEqual({ type: "bandpass", low_hz: 0.5, high_hz: 40, order: 4 });
    expect(req.analysis?.detect_r_peaks).toBe(true);
  });

  it("loading an experiment records its provenance", () => {
    useEcgStore
      .getState()
      .loadExperiment(
        { id: "abc", name: "run 1", resultHash: "deadbeef" },
        { ...DEFAULT_REQUEST, seed: 99 },
      );
    const state = useEcgStore.getState();
    expect(state.loaded?.id).toBe("abc");
    expect(state.request.seed).toBe(99);
    state.clearLoaded();
    expect(useEcgStore.getState().loaded).toBeNull();
  });
});
