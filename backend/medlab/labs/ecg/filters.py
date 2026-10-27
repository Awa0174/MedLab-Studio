"""Digital filters for ECG signals.

All IIR filters are applied forward and backward (zero-phase), so the R-peak timing is not
shifted by the filter group delay. The price is non-causality: this is fine for offline
analysis but is not how a real-time monitor filters.

* Butterworth band-pass, implemented as second-order sections for numerical stability.
* Notch (IIR, scipy.signal.iirnotch) at the mains frequency, selectivity set by Q.
* Moving average with a centred rectangular window and reflected edges.
"""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np
from numpy.typing import NDArray
from scipy import signal as sps

from medlab.schemas.ecg import BandpassFilter, FilterStage, MovingAverageFilter, NotchFilter

FILTERS_VERSION = "1.0.0"


class FilterConfigError(ValueError):
    """Raised when a filter is not realisable at the given sampling rate."""


PAD_SECONDS = 3.0


def padlen(n: int, fs: float) -> int:
    """Odd-extension length for filtfilt. The default (3 * filter length) is far too short
    for low cut-offs such as 0.5 Hz whose transient lasts seconds; we pad up to 3 s."""
    return int(max(0, min(n - 1, round(PAD_SECONDS * fs))))


def butter_bandpass(
    x: NDArray[np.float64], fs: float, low_hz: float, high_hz: float, order: int
) -> NDArray[np.float64]:
    nyquist = fs / 2.0
    if high_hz >= nyquist:
        raise FilterConfigError(
            f"bandpass high cutoff {high_hz} Hz must be below the Nyquist frequency {nyquist} Hz"
        )
    sos = sps.butter(order, [low_hz, high_hz], btype="bandpass", fs=fs, output="sos")
    return np.asarray(
        sps.sosfiltfilt(sos, x, padlen=padlen(x.size, fs), padtype="even"), dtype=np.float64
    )


def notch(x: NDArray[np.float64], fs: float, f0_hz: float, q: float) -> NDArray[np.float64]:
    nyquist = fs / 2.0
    if f0_hz >= nyquist:
        raise FilterConfigError(
            f"notch frequency {f0_hz} Hz must be below the Nyquist frequency {nyquist} Hz"
        )
    b, a = sps.iirnotch(f0_hz, q, fs=fs)
    return np.asarray(
        sps.filtfilt(b, a, x, padlen=padlen(x.size, fs), padtype="even"), dtype=np.float64
    )


def moving_average(x: NDArray[np.float64], fs: float, window_ms: float) -> NDArray[np.float64]:
    w = max(1, int(round(window_ms / 1000.0 * fs)))
    if w == 1:
        return x.copy()
    pad = w // 2
    padded = np.pad(x, pad, mode="reflect")
    kernel = np.ones(w) / w
    y = np.convolve(padded, kernel, mode="same")[pad : pad + x.size]
    return np.asarray(y, dtype=np.float64)


def apply_stage(x: NDArray[np.float64], fs: float, stage: FilterStage) -> NDArray[np.float64]:
    if isinstance(stage, BandpassFilter):
        return butter_bandpass(x, fs, stage.low_hz, stage.high_hz, stage.order)
    if isinstance(stage, NotchFilter):
        return notch(x, fs, stage.frequency_hz, stage.quality_factor)
    if isinstance(stage, MovingAverageFilter):
        return moving_average(x, fs, stage.window_ms)
    raise FilterConfigError(f"unknown filter stage {stage!r}")


def apply_chain(
    x: NDArray[np.float64], fs: float, stages: Sequence[FilterStage]
) -> NDArray[np.float64]:
    y = x.copy()
    for stage in stages:
        y = apply_stage(y, fs, stage)
    return y
