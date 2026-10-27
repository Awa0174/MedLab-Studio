import numpy as np
import pytest

from medlab.labs.ecg import detection, generator, noise


def _clean(hr: float, fs: float = 500.0, duration: float = 10.0, var: float = 0.0):  # type: ignore[no-untyped-def]
    return generator.generate_clean_ecg(
        heart_rate_bpm=hr,
        sampling_rate_hz=fs,
        duration_s=duration,
        rr_variability=var,
        r_amplitude_mv=1.0,
        first_beat_offset_s=0.3,
        rng=np.random.default_rng(0),
    )


@pytest.mark.parametrize("hr", [40.0, 72.0, 120.0, 180.0])
def test_detects_every_beat_on_clean_signal(hr: float) -> None:
    ecg = _clean(hr)
    peaks = detection.detect_r_peaks(ecg.signal_mv, 500.0)
    assert peaks.indices.size == ecg.r_times_s.size
    assert np.max(np.abs(peaks.times_s - ecg.r_times_s)) <= 0.004
    assert peaks.estimated_hr_bpm is not None
    assert abs(peaks.estimated_hr_bpm - hr) < 0.5


def test_detects_beats_under_moderate_noise() -> None:
    ecg = _clean(72.0, var=0.03)
    rng = np.random.default_rng(5)
    noisy = ecg.signal_mv + noise.compose_noise(
        ecg.time_s,
        500.0,
        white_sd_mv=0.08,
        powerline_amplitude_mv=0.2,
        powerline_frequency_hz=50.0,
        baseline_amplitude_mv=0.3,
        baseline_frequency_hz=0.3,
        muscle_amplitude_mv=0.05,
        rng=rng,
    )
    peaks = detection.detect_r_peaks(noisy, 500.0)
    assert peaks.indices.size == ecg.r_times_s.size
    diffs = np.abs(peaks.times_s[:, None] - ecg.r_times_s[None, :]).min(axis=1)
    assert np.median(diffs) <= 0.010


def test_short_signal_returns_empty_result() -> None:
    peaks = detection.detect_r_peaks(np.zeros(100), 500.0)
    assert peaks.indices.size == 0
    assert peaks.estimated_hr_bpm is None
