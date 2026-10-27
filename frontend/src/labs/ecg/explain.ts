/**
 * Scientific explanation shown next to the simulation. This is the "Explain" layer:
 * what is modelled, which assumptions hold, what the parameters do, where the limits
 * are and how the implementation was verified. Keep in sync with docs/models/ecg.md.
 */
export interface ExplainSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export const ECG_EXPLAIN: ExplainSection[] = [
  {
    title: "What is modelled",
    paragraphs: [
      "A single-lead (Lead II shaped) ECG is built as a sum of five Gaussian waves per heartbeat: P, Q, R, S and T. Each wave has an amplitude relative to R, a centre offset from the R-peak and a width.",
      "Beat times follow a nominal RR interval of 60 / heart rate. Each interval is multiplied by (1 + ε) with ε drawn from a seeded normal distribution and clipped at ±3σ.",
    ],
  },
  {
    title: "Mathematical assumptions",
    paragraphs: [
      "x(t) = A_R · Σ_k Σ_w a_w · exp(−(t − t_k − μ_w·s_k)² / (2·(σ_w·s_k)²)), with s_k = √(RR_k / RR_ref) scaling wave positions and widths with the local RR interval (a Bazett-inspired simplification).",
      "Disturbances are additive and independent: white Gaussian noise, a mains sinusoid with seeded phase, a low-frequency baseline sinusoid and a stationary EMG-like process (white noise high-passed above 20 Hz, scaled to the requested RMS).",
      "All IIR filters run forward and backward (zero-phase). Edges are mirrored (even extension, up to 3 s) before filtering to suppress start-up transients.",
    ],
  },
  {
    title: "What the parameters do",
    bullets: [
      "Heart rate sets the nominal RR interval; faster rhythms compress P–T spacing via s_k.",
      "Sampling rate changes the time resolution and the Nyquist limit for every filter.",
      "RR variability adds beat-to-beat jitter; at 0 the rhythm is perfectly regular.",
      "Seed fixes every random stream; the same seed reproduces the signal bit for bit.",
      "Notch Q controls bandwidth f₀/Q: higher Q removes less of the neighbouring ECG content.",
      "Band-pass cut-offs trade baseline removal (low) against QRS sharpness (high). Order steepens the roll-off.",
      "Refractory period is the shortest RR interval the detector accepts.",
    ],
    paragraphs: [],
  },
  {
    title: "Limits of the model",
    bullets: [
      "No physiology: no autonomic modulation, respiration coupling, ectopic beats, arrhythmia or morphology variation.",
      "Fixed, positive Lead II morphology; the detector assumes upright R waves.",
      "EMG artefact is stationary, real EMG comes in bursts.",
      "Zero-phase filtering is non-causal and not what a real-time monitor does.",
      "Peak detection is a simplified Pan–Tompkins: adaptive thresholds and search-back, but no T-wave discrimination beyond the refractory period.",
      "This is a teaching and demonstration tool, not a validated signal source or a diagnostic algorithm.",
    ],
    paragraphs: [],
  },
  {
    title: "How the implementation was verified",
    bullets: [
      "72 bpm over 10 s with the first beat at 0.3 s yields exactly 12 beats (pytest).",
      "The 50 Hz notch attenuates a pure 50 Hz tone by ≥ 30 dB and leaves 10 Hz within 2 %.",
      "The band-pass passes 10 Hz within 5 %, rejects 100 Hz below 1 % and has zero lag.",
      "The detector finds every beat on clean signals from 40 to 180 bpm within 4 ms, and under moderate noise within 10 ms median error.",
      "Two runs with the same seed produce an identical SHA-256 result hash; a different seed does not.",
      "The spectrum shows ≥ 20 dB reduction at 50 Hz after the notch.",
    ],
    paragraphs: [],
  },
  {
    title: "Sources",
    bullets: [
      "McSharry P.E., Clifford G.D., Tarassenko L., Smith L.A. (2003). A dynamical model for generating synthetic electrocardiogram signals. IEEE Trans Biomed Eng 50(3):289–294.",
      "Pan J., Tompkins W.J. (1985). A real-time QRS detection algorithm. IEEE Trans Biomed Eng 32(3):230–236.",
      "Bazett H.C. (1920). An analysis of the time-relations of electrocardiograms. Heart 7:353–370.",
      "SciPy signal processing reference: butter, sosfiltfilt, iirnotch, welch, find_peaks.",
    ],
    paragraphs: [],
  },
];
