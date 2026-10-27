"""R-peak detection after Pan & Tompkins (1985).

Steps
-----
1. Band-pass 5-15 Hz (zero-phase Butterworth, order 2) to emphasise the QRS complex.
2. Differentiate (central differences) to emphasise steep slopes.
3. Square to make all deflections positive and amplify large slopes.
4. Moving-window integration over 150 ms to obtain one hump per QRS complex.
5. Adaptive thresholding on the integrated signal: running estimates of the signal
   peak level (SPKI) and the noise peak level (NPKI) with
   threshold = NPKI + 0.25 * (SPKI - NPKI), updated with factors 0.125 / 0.875.
   A refractory period suppresses candidates closer than the minimum RR.
6. Search-back: if an interval exceeds 1.66 times the running average RR, the largest
   peak in that interval above half the threshold is accepted as a missed beat.
7. Refinement: each candidate is moved to the maximum of the band-passed signal in a
   window around it, then to the local maximum of the analysed signal within +-20 ms.

Limitations: no T-wave discrimination beyond the refractory period, positive R-waves
assumed, single-channel only. Strong artefacts can still produce false peaks.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy import signal as sps

DETECTOR_VERSION = "1.1.0"
DETECTOR_NAME = "pan-tompkins"

QRS_BAND_HZ = (5.0, 15.0)
INTEGRATION_WINDOW_S = 0.150
INIT_WINDOW_S = 2.0
THRESHOLD_FRACTION = 0.25
LEVEL_UPDATE = 0.125
SEARCHBACK_FACTOR = 1.66
REFINE_WINDOW_S = 0.020


@dataclass(frozen=True)
class RPeaks:
    indices: NDArray[np.int64]
    times_s: NDArray[np.float64]
    rr_intervals_s: NDArray[np.float64]
    estimated_hr_bpm: float | None
    hr_sd_bpm: float | None


def _empty() -> RPeaks:
    return RPeaks(np.empty(0, np.int64), np.empty(0), np.empty(0), None, None)


def _qrs_bandpass(x: NDArray[np.float64], fs: float) -> NDArray[np.float64]:
    nyquist = fs / 2.0
    high = min(QRS_BAND_HZ[1], 0.9 * nyquist)
    sos = sps.butter(2, [QRS_BAND_HZ[0], high], btype="bandpass", fs=fs, output="sos")
    pad = int(max(0, min(x.size - 1, round(fs))))
    return np.asarray(sps.sosfiltfilt(sos, x, padlen=pad, padtype="even"), dtype=np.float64)


def integrated_feature(
    x: NDArray[np.float64], fs: float
) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """Return (band-passed signal, moving-window-integrated squared derivative)."""
    bandpassed = _qrs_bandpass(x, fs)
    derivative = np.gradient(bandpassed) * fs
    squared = derivative**2
    win = max(1, int(round(INTEGRATION_WINDOW_S * fs)))
    integrated = np.convolve(squared, np.ones(win) / win, mode="same")
    return bandpassed, np.asarray(integrated, dtype=np.float64)


def _adaptive_peaks(integrated: NDArray[np.float64], fs: float, refractory: int) -> list[int]:
    """Pan-Tompkins style adaptive thresholding with search-back on the integrated signal."""
    all_peaks, props = sps.find_peaks(integrated, distance=max(1, refractory // 2))
    if all_peaks.size == 0:
        return []
    heights = integrated[all_peaks]

    init_n = min(integrated.size, int(INIT_WINDOW_S * fs))
    spki = float(np.max(integrated[:init_n])) * 0.5 if init_n else float(heights.max())
    npki = float(np.mean(integrated[:init_n])) * 0.5 if init_n else 0.0

    accepted: list[int] = []
    rr_history: list[float] = []

    def threshold() -> float:
        return npki + THRESHOLD_FRACTION * (spki - npki)

    for pos, h in zip(all_peaks, heights, strict=True):
        pos_i = int(pos)
        if accepted and pos_i - accepted[-1] < refractory:
            # Inside refractory period: treat as noise, keep larger if it is a true double.
            if h > integrated[accepted[-1]]:
                accepted[-1] = pos_i
            continue
        if h > threshold():
            # Search-back before accepting: did we skip a beat in a long interval?
            if len(rr_history) >= 2 and accepted:
                avg_rr = float(np.mean(rr_history[-8:]))
                gap = pos_i - accepted[-1]
                if gap > SEARCHBACK_FACTOR * avg_rr:
                    lo, hi = accepted[-1] + refractory, pos_i - refractory
                    if hi > lo:
                        mask = (all_peaks > lo) & (all_peaks < hi)
                        if mask.any():
                            cand = all_peaks[mask]
                            best = int(cand[np.argmax(integrated[cand])])
                            if integrated[best] > 0.5 * threshold():
                                accepted.append(best)
                                rr_history.append(float(best - accepted[-2]))
                                spki = 0.25 * float(integrated[best]) + 0.75 * spki
            spki = LEVEL_UPDATE * float(h) + (1 - LEVEL_UPDATE) * spki
            if accepted:
                rr_history.append(float(pos_i - accepted[-1]))
            accepted.append(pos_i)
        else:
            npki = LEVEL_UPDATE * float(h) + (1 - LEVEL_UPDATE) * npki
    return accepted


def detect_r_peaks(x: NDArray[np.float64], fs: float, refractory_ms: float = 200.0) -> RPeaks:
    n = x.size
    if n < int(fs):
        return _empty()

    bandpassed, integrated = integrated_feature(x, fs)
    refractory = max(1, int(round(refractory_ms / 1000.0 * fs)))
    candidates = _adaptive_peaks(integrated, fs, refractory)
    if not candidates:
        return _empty()

    win = max(1, int(round(INTEGRATION_WINDOW_S * fs)))
    search_fwd = max(1, int(round(0.05 * fs)))
    rw = max(1, int(round(REFINE_WINDOW_S * fs)))
    refined: list[int] = []
    for c in candidates:
        lo, hi = max(0, c - win), min(n, c + search_fwd)
        p = lo + int(np.argmax(bandpassed[lo:hi]))
        lo2, hi2 = max(0, p - rw), min(n, p + rw + 1)
        p = lo2 + int(np.argmax(x[lo2:hi2]))
        if refined and p - refined[-1] < refractory:
            if x[p] > x[refined[-1]]:
                refined[-1] = p
            continue
        refined.append(p)

    idx = np.asarray(refined, dtype=np.int64)
    times = idx / fs
    rr = np.diff(times)
    if rr.size:
        hr_series = 60.0 / rr
        hr = float(60.0 / np.mean(rr))
        hr_sd = float(np.std(hr_series, ddof=1)) if hr_series.size > 1 else 0.0
    else:
        hr, hr_sd = None, None
    return RPeaks(idx, times, rr, hr, hr_sd)
