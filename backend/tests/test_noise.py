import numpy as np

from medlab.labs.ecg import noise

FS = 500.0
T = np.arange(0, 10, 1 / FS)


def test_white_noise_sd_matches_request() -> None:
    n = noise.white_noise(200_000, 0.1, np.random.default_rng(1))
    assert np.isclose(n.std(), 0.1, rtol=0.02)
    assert np.isclose(n.mean(), 0.0, atol=0.002)


def test_powerline_is_pure_tone_at_50_hz() -> None:
    s = noise.sinusoid(T, 0.3, 50.0, np.random.default_rng(1))
    spectrum = np.abs(np.fft.rfft(s))
    freqs = np.fft.rfftfreq(T.size, 1 / FS)
    assert freqs[int(np.argmax(spectrum))] == 50.0
    # RMS of a sinusoid is A / sqrt(2); the sampled maximum may miss the true peak.
    assert np.isclose(np.sqrt(np.mean(s**2)), 0.3 / np.sqrt(2), rtol=0.01)


def test_muscle_artifact_has_requested_rms_and_no_low_frequencies() -> None:
    m = noise.muscle_artifact(T.size, 0.2, FS, np.random.default_rng(1))
    assert np.isclose(np.sqrt(np.mean(m**2)), 0.2, rtol=1e-6)
    spectrum = np.abs(np.fft.rfft(m))
    freqs = np.fft.rfftfreq(T.size, 1 / FS)
    low = spectrum[freqs < 5].mean()
    high = spectrum[(freqs > 40) & (freqs < 200)].mean()
    assert high > 20 * low


def test_zero_amplitudes_give_zero_noise() -> None:
    z = noise.compose_noise(
        T,
        FS,
        white_sd_mv=0,
        powerline_amplitude_mv=0,
        powerline_frequency_hz=50,
        baseline_amplitude_mv=0,
        baseline_frequency_hz=0.3,
        muscle_amplitude_mv=0,
        rng=np.random.default_rng(1),
    )
    assert np.all(z == 0)
