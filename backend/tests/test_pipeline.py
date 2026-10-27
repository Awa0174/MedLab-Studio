from medlab.labs.ecg.pipeline import run_simulation
from medlab.schemas.ecg import EcgSimulationRequest

NOISY = {
    "seed": 11,
    "noise": {
        "white_sd_mv": 0.1,
        "powerline_amplitude_mv": 0.3,
        "baseline_amplitude_mv": 0.4,
        "muscle_amplitude_mv": 0.05,
    },
    "filters": [{"type": "notch", "frequency_hz": 50}, {"type": "bandpass"}],
}


def test_default_request_validates_and_passes_all_checks() -> None:
    r = run_simulation(EcgSimulationRequest()).response
    assert len(r.time_s) == 5000
    assert len(r.true_r_times_s) == 12
    assert all(c.passed for c in r.validation), [c for c in r.validation if not c.passed]


def test_same_seed_is_bit_identical_different_seed_is_not() -> None:
    a = run_simulation(EcgSimulationRequest.model_validate(NOISY))
    b = run_simulation(EcgSimulationRequest.model_validate(NOISY))
    c = run_simulation(EcgSimulationRequest.model_validate({**NOISY, "seed": 12}))
    assert a.response.result_hash == b.response.result_hash
    assert (a.arrays.filtered_mv == b.arrays.filtered_mv).all()
    assert a.response.result_hash != c.response.result_hash


def test_filtering_improves_snr() -> None:
    r = run_simulation(EcgSimulationRequest.model_validate(NOISY)).response
    assert r.stats.snr_noisy_db is not None and r.stats.snr_filtered_db is not None
    assert r.stats.snr_filtered_db > r.stats.snr_noisy_db + 6


def test_parameters_carry_units() -> None:
    r = run_simulation(EcgSimulationRequest.model_validate(NOISY)).response
    by_name = {p.name: p for p in r.parameters}
    assert by_name["heart_rate"].unit == "bpm"
    assert by_name["sampling_rate"].unit == "Hz"
    assert by_name["filter1_notch_frequency"].unit == "Hz"
    assert by_name["filter2_bandpass_order"].unit == "1"


def test_spectrum_shows_notch_effect_at_50_hz() -> None:
    r = run_simulation(EcgSimulationRequest.model_validate(NOISY)).response
    assert r.spectrum is not None
    idx = min(
        range(len(r.spectrum.frequency_hz)), key=lambda i: abs(r.spectrum.frequency_hz[i] - 50)
    )
    assert r.spectrum.noisy_db[idx] - r.spectrum.filtered_db[idx] > 20
