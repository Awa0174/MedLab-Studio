import type { EcgSimulationRequest } from "@/api/client";

/** Full request with every field present; mirrors the backend defaults. */
export const DEFAULT_REQUEST: EcgSimulationRequest = {
  seed: 42,
  signal: {
    heart_rate_bpm: 72,
    sampling_rate_hz: 500,
    duration_s: 10,
    rr_variability: 0.02,
    r_amplitude_mv: 1.0,
    first_beat_offset_s: 0.3,
  },
  noise: {
    white_sd_mv: 0.05,
    powerline_amplitude_mv: 0.2,
    powerline_frequency_hz: 50,
    baseline_amplitude_mv: 0.3,
    baseline_frequency_hz: 0.3,
    muscle_amplitude_mv: 0.0,
  },
  filters: [
    { type: "notch", frequency_hz: 50, quality_factor: 30 },
    { type: "bandpass", low_hz: 0.5, high_hz: 40, order: 4 },
  ],
  analysis: { detect_r_peaks: true, source: "filtered", refractory_ms: 200 },
  include_spectrum: true,
};

export const DEFAULT_FILTERS = {
  notch: { type: "notch", frequency_hz: 50, quality_factor: 30 },
  bandpass: { type: "bandpass", low_hz: 0.5, high_hz: 40, order: 4 },
  moving_average: { type: "moving_average", window_ms: 20 },
} as const;

/** Parameter ranges shown in the UI. Kept in sync with the Pydantic constraints. */
export const RANGES = {
  heart_rate_bpm: { min: 30, max: 220, step: 1 },
  sampling_rate_hz: { min: 100, max: 2000, step: 50 },
  duration_s: { min: 1, max: 60, step: 1 },
  rr_variability: { min: 0, max: 0.2, step: 0.005 },
  r_amplitude_mv: { min: 0.1, max: 5, step: 0.1 },
  white_sd_mv: { min: 0, max: 2, step: 0.01 },
  powerline_amplitude_mv: { min: 0, max: 2, step: 0.01 },
  baseline_amplitude_mv: { min: 0, max: 3, step: 0.05 },
  baseline_frequency_hz: { min: 0.05, max: 1, step: 0.05 },
  muscle_amplitude_mv: { min: 0, max: 2, step: 0.01 },
  bandpass_low_hz: { min: 0.1, max: 20, step: 0.1 },
  bandpass_high_hz: { min: 5, max: 500, step: 1 },
  bandpass_order: { min: 1, max: 10, step: 1 },
  notch_q: { min: 1, max: 200, step: 1 },
  moving_average_window_ms: { min: 1, max: 500, step: 1 },
  refractory_ms: { min: 100, max: 600, step: 10 },
  seed: { min: 0, max: 2 ** 31 - 1, step: 1 },
} as const;
