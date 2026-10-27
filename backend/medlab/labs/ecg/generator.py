"""Synthetic single-lead ECG generator (Gaussian wave-sum model).

Model
-----
Each heartbeat k with R-peak time t_k contributes five Gaussian waves

    x_k(t) = sum_{w in {P,Q,R,S,T}} a_w * exp(-(t - t_k - mu_w * s_k)^2 / (2 * (sigma_w * s_k)^2))

where (a_w, mu_w, sigma_w) are the amplitude, centre offset and width of wave w at the
reference RR interval RR_ref = 60/72 s, and s_k = sqrt(RR_k / RR_ref) is a Bazett-inspired
scaling so that wave positions and widths shrink for faster rhythms.

Beat times follow t_{k+1} = t_k + RR_nominal * (1 + eps_k), eps_k ~ N(0, rr_variability),
clipped to +-3 standard deviations, drawn from a seeded generator.

This is a deliberately simplified morphological model in the spirit of McSharry et al.
(2003), without the dynamical system, without respiratory modulation and without
physiological validation. It exists to produce a recognisable, fully reproducible Lead II
shaped waveform for teaching and for testing signal-processing code.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

GENERATOR_VERSION = "1.0.0"
MODEL_NAME = "gaussian-wave-sum-ecg"

RR_REF_S = 60.0 / 72.0

# (amplitude relative to R, centre offset [s] at RR_ref, width sigma [s] at RR_ref)
WAVES: dict[str, tuple[float, float, float]] = {
    "P": (0.15, -0.170, 0.022),
    "Q": (-0.10, -0.035, 0.008),
    "R": (1.00, 0.000, 0.010),
    "S": (-0.25, 0.030, 0.009),
    "T": (0.30, 0.220, 0.040),
}


@dataclass(frozen=True)
class CleanEcg:
    time_s: NDArray[np.float64]
    signal_mv: NDArray[np.float64]
    r_times_s: NDArray[np.float64]
    rr_intervals_s: NDArray[np.float64]


def beat_times(
    heart_rate_bpm: float,
    duration_s: float,
    rr_variability: float,
    first_beat_offset_s: float,
    rng: np.random.Generator,
) -> NDArray[np.float64]:
    """R-peak times inside [0, duration_s) with seeded RR jitter."""
    rr_nominal = 60.0 / heart_rate_bpm
    times: list[float] = []
    t = first_beat_offset_s
    while t < duration_s:
        times.append(t)
        eps = float(rng.normal(0.0, rr_variability)) if rr_variability > 0 else 0.0
        eps = float(np.clip(eps, -3 * rr_variability, 3 * rr_variability))
        t += rr_nominal * (1.0 + eps)
    return np.asarray(times, dtype=np.float64)


def generate_clean_ecg(
    *,
    heart_rate_bpm: float,
    sampling_rate_hz: float,
    duration_s: float,
    rr_variability: float,
    r_amplitude_mv: float,
    first_beat_offset_s: float,
    rng: np.random.Generator,
) -> CleanEcg:
    n = int(round(duration_s * sampling_rate_hz))
    time_s = np.arange(n, dtype=np.float64) / sampling_rate_hz
    signal = np.zeros(n, dtype=np.float64)

    r_times = beat_times(heart_rate_bpm, duration_s, rr_variability, first_beat_offset_s, rng)
    rr_nominal = 60.0 / heart_rate_bpm
    rr_local = np.diff(r_times, append=r_times[-1] + rr_nominal) if r_times.size else r_times

    for t_k, rr_k in zip(r_times, rr_local, strict=True):
        s_k = float(np.sqrt(rr_k / RR_REF_S))
        # Only evaluate within a window that comfortably contains all five waves.
        lo = max(0, int((t_k - 0.45 * s_k) * sampling_rate_hz))
        hi = min(n, int((t_k + 0.55 * s_k) * sampling_rate_hz) + 1)
        if hi <= lo:
            continue
        t_win = time_s[lo:hi]
        for amp, mu, sigma in WAVES.values():
            centre = t_k + mu * s_k
            width = sigma * s_k
            signal[lo:hi] += amp * np.exp(-((t_win - centre) ** 2) / (2.0 * width**2))

    signal *= r_amplitude_mv
    return CleanEcg(
        time_s=time_s,
        signal_mv=signal,
        r_times_s=r_times,
        rr_intervals_s=np.diff(r_times) if r_times.size > 1 else np.empty(0),
    )
