"""Disturbance models for ECG signals.

All components are additive and generated from a seeded generator so that the same
request always yields the same noisy signal.

* White noise: n(t) ~ N(0, sd^2), models wideband amplifier/quantisation noise.
* Powerline interference: A * sin(2*pi*f*t + phi), f in {50, 60} Hz, phi seeded uniform.
* Baseline wander: A * sin(2*pi*f*t + phi), f ~ 0.05 - 1 Hz, models respiration/electrode drift.
* Muscle artefact (EMG): white noise high-pass filtered above 20 Hz, scaled to the requested
  RMS amplitude. Real EMG is burst-like and non-stationary; this model is stationary.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray
from scipy import signal as sps

NOISE_VERSION = "1.0.0"

EMG_HIGHPASS_HZ = 20.0


def white_noise(n: int, sd_mv: float, rng: np.random.Generator) -> NDArray[np.float64]:
    if sd_mv <= 0:
        return np.zeros(n)
    return rng.normal(0.0, sd_mv, n).astype(np.float64)


def sinusoid(
    time_s: NDArray[np.float64], amplitude_mv: float, frequency_hz: float, rng: np.random.Generator
) -> NDArray[np.float64]:
    phase = float(rng.uniform(0.0, 2.0 * np.pi))
    if amplitude_mv <= 0:
        return np.zeros_like(time_s)
    return amplitude_mv * np.sin(2.0 * np.pi * frequency_hz * time_s + phase)


def muscle_artifact(
    n: int, amplitude_mv: float, sampling_rate_hz: float, rng: np.random.Generator
) -> NDArray[np.float64]:
    raw = rng.normal(0.0, 1.0, n)
    if amplitude_mv <= 0:
        return np.zeros(n)
    nyquist = sampling_rate_hz / 2.0
    cutoff = min(EMG_HIGHPASS_HZ, 0.8 * nyquist)
    sos = sps.butter(4, cutoff, btype="highpass", fs=sampling_rate_hz, output="sos")
    filtered = sps.sosfiltfilt(
        sos, raw, padlen=int(max(0, min(n - 1, round(sampling_rate_hz)))), padtype="even"
    )
    rms = float(np.sqrt(np.mean(filtered**2)))
    if rms == 0:
        return np.zeros(n)
    return np.asarray(filtered / rms * amplitude_mv, dtype=np.float64)


def compose_noise(
    time_s: NDArray[np.float64],
    sampling_rate_hz: float,
    *,
    white_sd_mv: float,
    powerline_amplitude_mv: float,
    powerline_frequency_hz: float,
    baseline_amplitude_mv: float,
    baseline_frequency_hz: float,
    muscle_amplitude_mv: float,
    rng: np.random.Generator,
) -> NDArray[np.float64]:
    """Sum of all disturbance components. Components are always drawn in a fixed order
    so that enabling one does not change the random stream of the others."""
    n = time_s.size
    total = np.zeros(n, dtype=np.float64)
    total += white_noise(n, white_sd_mv, rng)
    total += sinusoid(time_s, powerline_amplitude_mv, powerline_frequency_hz, rng)
    total += sinusoid(time_s, baseline_amplitude_mv, baseline_frequency_hz, rng)
    total += muscle_artifact(n, muscle_amplitude_mv, sampling_rate_hz, rng)
    return total
