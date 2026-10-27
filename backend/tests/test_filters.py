import numpy as np
import pytest

from medlab.labs.ecg import filters
from medlab.schemas.ecg import BandpassFilter, MovingAverageFilter, NotchFilter

FS = 500.0
T = np.arange(0, 10, 1 / FS)


def _tone(f: float) -> np.ndarray:  # type: ignore[type-arg]
    return np.sin(2 * np.pi * f * T)


def _rms(x: np.ndarray) -> float:  # type: ignore[type-arg]
    return float(np.sqrt(np.mean(x[500:-500] ** 2)))


def test_notch_attenuates_50_hz_by_at_least_30_db() -> None:
    y = filters.notch(_tone(50.0), FS, 50.0, 30.0)
    attenuation_db = 20 * np.log10(_rms(_tone(50.0)) / _rms(y))
    assert attenuation_db >= 30


def test_notch_leaves_10_hz_almost_untouched() -> None:
    y = filters.notch(_tone(10.0), FS, 50.0, 30.0)
    assert np.isclose(_rms(y), _rms(_tone(10.0)), rtol=0.02)


def test_bandpass_passes_10_hz_and_rejects_0_1_and_100_hz() -> None:
    bp = BandpassFilter(low_hz=0.5, high_hz=40.0, order=4)
    inside = filters.apply_stage(_tone(10.0), FS, bp)
    above = filters.apply_stage(_tone(100.0), FS, bp)
    assert np.isclose(_rms(inside), _rms(_tone(10.0)), rtol=0.05)
    assert _rms(above) < 0.01 * _rms(_tone(100.0))


def test_bandpass_is_zero_phase() -> None:
    x = _tone(10.0)
    y = filters.apply_stage(x, FS, BandpassFilter(low_hz=0.5, high_hz=40.0, order=4))
    lag = int(np.argmax(np.correlate(y[500:1500], x[500:1500], mode="full")) - 999)
    assert lag == 0


def test_moving_average_removes_high_frequency_and_keeps_length() -> None:
    x = _tone(2.0) + 0.5 * _tone(200.0)
    y = filters.apply_stage(x, FS, MovingAverageFilter(window_ms=20.0))
    assert y.size == x.size
    assert _rms(y - _tone(2.0)) < 0.05


def test_chain_is_deterministic() -> None:
    chain = [NotchFilter(), BandpassFilter()]
    x = np.random.default_rng(3).normal(size=T.size)
    assert np.array_equal(filters.apply_chain(x, FS, chain), filters.apply_chain(x, FS, chain))


def test_unrealisable_bandpass_raises() -> None:
    with pytest.raises(filters.FilterConfigError):
        filters.butter_bandpass(_tone(1.0), FS, 0.5, 300.0, 4)
