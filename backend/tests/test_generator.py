import numpy as np

from medlab.labs.ecg import generator


def _gen(**kwargs):  # type: ignore[no-untyped-def]
    params = dict(
        heart_rate_bpm=72.0,
        sampling_rate_hz=500.0,
        duration_s=10.0,
        rr_variability=0.0,
        r_amplitude_mv=1.0,
        first_beat_offset_s=0.3,
        rng=np.random.default_rng(0),
    )
    params.update(kwargs)
    return generator.generate_clean_ecg(**params)


def test_72_bpm_over_10_s_gives_exactly_12_beats() -> None:
    ecg = _gen()
    assert ecg.r_times_s.size == 12
    assert np.allclose(np.diff(ecg.r_times_s), 60.0 / 72.0)


def test_sample_count_and_time_axis() -> None:
    ecg = _gen()
    assert ecg.time_s.size == 5000
    assert ecg.signal_mv.size == 5000
    assert np.isclose(ecg.time_s[1] - ecg.time_s[0], 0.002)


def test_r_peak_amplitude_and_position() -> None:
    ecg = _gen(r_amplitude_mv=1.5)
    first_beat = ecg.time_s < 0.7  # window containing only the first beat
    peak_idx = int(np.argmax(np.where(first_beat, ecg.signal_mv, -np.inf)))
    assert np.isclose(ecg.time_s[peak_idx], 0.3, atol=0.002)
    assert np.isclose(ecg.signal_mv[peak_idx], 1.5, rtol=0.02)


def test_rr_jitter_is_seeded_and_reproducible() -> None:
    a = _gen(rr_variability=0.05, rng=np.random.default_rng(7))
    b = _gen(rr_variability=0.05, rng=np.random.default_rng(7))
    c = _gen(rr_variability=0.05, rng=np.random.default_rng(8))
    assert np.array_equal(a.signal_mv, b.signal_mv)
    assert not np.array_equal(a.signal_mv, c.signal_mv)
    assert np.std(a.rr_intervals_s) > 0


def test_fast_rhythm_has_more_beats() -> None:
    assert _gen(heart_rate_bpm=150.0).r_times_s.size == 25
