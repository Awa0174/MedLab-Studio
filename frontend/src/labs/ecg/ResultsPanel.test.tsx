import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultsPanel } from "@/labs/ecg/ResultsPanel";
import type { EcgSimulationResponse } from "@/api/client";

const response: EcgSimulationResponse = {
  model: { name: "gaussian-wave-sum-ecg", version: "1.0.0", description: "test" },
  algorithm_versions: { generator: "1.0.0", r_peak_detector: "1.1.0" },
  parameters: [{ name: "heart_rate", value: 72, unit: "bpm" }],
  time_s: [0, 0.002],
  clean_mv: [0, 0],
  noisy_mv: [0, 0],
  filtered_mv: [0, 0],
  true_r_times_s: [0.3],
  r_peaks: {
    method: "pan-tompkins",
    indices: [150],
    times_s: [0.3],
    rr_intervals_s: [],
    estimated_hr_bpm: 72.4,
    hr_sd_bpm: 0.5,
  },
  spectrum: null,
  stats: {
    clean_rms_mv: 0.2,
    noise_rms_mv: 0.1,
    residual_rms_mv: 0.01,
    snr_noisy_db: 6,
    snr_filtered_db: 26,
  },
  validation: [
    { name: "detected_peak_count", passed: true, expected: 1, actual: 1 },
    {
      name: "estimated_heart_rate",
      passed: false,
      expected: 72,
      actual: 80,
      unit: "bpm",
      tolerance: 1,
    },
  ],
  result_hash: "abc",
};

describe("ResultsPanel", () => {
  it("shows metrics with units and validation outcome", () => {
    render(<ResultsPanel data={response} />);
    expect(screen.getByText("72.4")).toBeInTheDocument();
    expect(screen.getByText("attention")).toBeInTheDocument();
    expect(screen.getByLabelText("passed")).toBeInTheDocument();
    expect(screen.getByLabelText("failed")).toBeInTheDocument();
    expect(screen.getByText(/expected 72 ± 1, got 80 bpm/)).toBeInTheDocument();
    expect(screen.getByText(/model gaussian-wave-sum-ecg v1.0.0/)).toBeInTheDocument();
  });
});
