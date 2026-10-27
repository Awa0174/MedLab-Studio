"""End-to-end ECG simulation: generate, disturb, filter, analyse, validate, hash."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy import signal as sps

from medlab.labs.ecg import detection, filters, generator, noise
from medlab.schemas.common import ModelInfo, Parameter, Unit, ValidationCheck
from medlab.schemas.ecg import (
    BandpassFilter,
    EcgSimulationRequest,
    EcgSimulationResponse,
    MovingAverageFilter,
    NotchFilter,
    RPeakResult,
    SignalStats,
    SpectrumResult,
)

MODEL_INFO = ModelInfo(
    name=generator.MODEL_NAME,
    version=generator.GENERATOR_VERSION,
    description=(
        "Synthetic Lead II ECG as a sum of Gaussian P, Q, R, S and T waves per beat with "
        "seeded RR jitter. Simplified teaching model, not physiologically validated."
    ),
)

ALGORITHM_VERSIONS = {
    "generator": generator.GENERATOR_VERSION,
    "noise": noise.NOISE_VERSION,
    "filters": filters.FILTERS_VERSION,
    "r_peak_detector": detection.DETECTOR_VERSION,
}

HR_TOLERANCE_BPM = 1.0
PEAK_TIMING_TOLERANCE_MS = 10.0
ROUND_DECIMALS = 6


@dataclass(frozen=True)
class SimulationArrays:
    time_s: NDArray[np.float64]
    clean_mv: NDArray[np.float64]
    noisy_mv: NDArray[np.float64]
    filtered_mv: NDArray[np.float64]
    true_r_times_s: NDArray[np.float64]
    r_peak_indices: NDArray[np.int64]


@dataclass(frozen=True)
class SimulationResult:
    response: EcgSimulationResponse
    arrays: SimulationArrays


def _rng_streams(seed: int) -> tuple[np.random.Generator, np.random.Generator]:
    """Independent, reproducible streams for RR jitter and for noise."""
    return np.random.default_rng([seed, 0]), np.random.default_rng([seed, 1])


def parameters_from_request(req: EcgSimulationRequest) -> list[Parameter]:
    s, n = req.signal, req.noise
    params = [
        Parameter(name="seed", value=req.seed, unit=Unit.DIMENSIONLESS),
        Parameter(name="heart_rate", value=s.heart_rate_bpm, unit=Unit.BPM),
        Parameter(name="sampling_rate", value=s.sampling_rate_hz, unit=Unit.HERTZ),
        Parameter(name="duration", value=s.duration_s, unit=Unit.SECOND),
        Parameter(name="rr_variability", value=s.rr_variability, unit=Unit.DIMENSIONLESS),
        Parameter(name="r_amplitude", value=s.r_amplitude_mv, unit=Unit.MILLIVOLT),
        Parameter(name="first_beat_offset", value=s.first_beat_offset_s, unit=Unit.SECOND),
        Parameter(name="white_noise_sd", value=n.white_sd_mv, unit=Unit.MILLIVOLT),
        Parameter(name="powerline_amplitude", value=n.powerline_amplitude_mv, unit=Unit.MILLIVOLT),
        Parameter(name="powerline_frequency", value=n.powerline_frequency_hz, unit=Unit.HERTZ),
        Parameter(name="baseline_amplitude", value=n.baseline_amplitude_mv, unit=Unit.MILLIVOLT),
        Parameter(name="baseline_frequency", value=n.baseline_frequency_hz, unit=Unit.HERTZ),
        Parameter(name="muscle_amplitude", value=n.muscle_amplitude_mv, unit=Unit.MILLIVOLT),
        Parameter(name="analysis_source", value=req.analysis.source, unit=Unit.DIMENSIONLESS),
        Parameter(name="refractory", value=req.analysis.refractory_ms, unit=Unit.MILLISECOND),
    ]
    for i, stage in enumerate(req.filters):
        prefix = f"filter{i + 1}_{stage.type}"
        if isinstance(stage, BandpassFilter):
            params += [
                Parameter(name=f"{prefix}_low", value=stage.low_hz, unit=Unit.HERTZ),
                Parameter(name=f"{prefix}_high", value=stage.high_hz, unit=Unit.HERTZ),
                Parameter(name=f"{prefix}_order", value=stage.order, unit=Unit.DIMENSIONLESS),
            ]
        elif isinstance(stage, NotchFilter):
            params += [
                Parameter(name=f"{prefix}_frequency", value=stage.frequency_hz, unit=Unit.HERTZ),
                Parameter(name=f"{prefix}_q", value=stage.quality_factor, unit=Unit.DIMENSIONLESS),
            ]
        elif isinstance(stage, MovingAverageFilter):
            params.append(
                Parameter(name=f"{prefix}_window", value=stage.window_ms, unit=Unit.MILLISECOND)
            )
    return params


def _rms(x: NDArray[np.float64]) -> float:
    return float(np.sqrt(np.mean(x**2))) if x.size else 0.0


def _snr_db(signal_rms: float, noise_rms: float) -> float | None:
    if noise_rms <= 0 or signal_rms <= 0:
        return None
    return float(20.0 * np.log10(signal_rms / noise_rms))


def _spectrum(
    noisy: NDArray[np.float64], filtered: NDArray[np.float64], fs: float
) -> SpectrumResult:
    nperseg = int(min(noisy.size, max(256, 2 * fs)))
    f, p_noisy = sps.welch(noisy, fs=fs, nperseg=nperseg)
    _, p_filt = sps.welch(filtered, fs=fs, nperseg=nperseg)
    floor = 1e-12
    return SpectrumResult(
        method=f"welch(nperseg={nperseg}, hann)",
        frequency_hz=_round(f),
        noisy_db=_round(10.0 * np.log10(np.maximum(p_noisy, floor))),
        filtered_db=_round(10.0 * np.log10(np.maximum(p_filt, floor))),
    )


def _round(x: NDArray[np.float64]) -> list[float]:
    return [float(v) for v in np.round(x, ROUND_DECIMALS)]


def result_hash(arrays: SimulationArrays) -> str:
    """SHA-256 over the full-precision result arrays. Identical inputs must give an
    identical hash; this is the reproducibility criterion used by experiment reruns."""
    h = hashlib.sha256()
    for arr in (
        arrays.time_s,
        arrays.clean_mv,
        arrays.noisy_mv,
        arrays.filtered_mv,
        arrays.true_r_times_s,
        arrays.r_peak_indices,
    ):
        h.update(np.ascontiguousarray(arr).tobytes())
    return h.hexdigest()


def validate(
    req: EcgSimulationRequest,
    true_r_times: NDArray[np.float64],
    peaks: detection.RPeaks | None,
) -> list[ValidationCheck]:
    checks: list[ValidationCheck] = []
    rr_nominal = 60.0 / req.signal.heart_rate_bpm
    expected_beats = int(
        np.floor((req.signal.duration_s - req.signal.first_beat_offset_s) / rr_nominal) + 1
    )
    checks.append(
        ValidationCheck(
            name="generated_beat_count",
            passed=abs(int(true_r_times.size) - expected_beats) <= 1,
            expected=expected_beats,
            actual=int(true_r_times.size),
            tolerance=1,
            note="Beats placed by the generator vs. floor((T - t0)/RR) + 1; jitter may add or "
            "remove one beat at the end.",
        )
    )
    if peaks is None:
        return checks

    checks.append(
        ValidationCheck(
            name="detected_peak_count",
            passed=int(peaks.indices.size) == int(true_r_times.size),
            expected=int(true_r_times.size),
            actual=int(peaks.indices.size),
            note="Detected R-peaks must equal the number of generated beats.",
        )
    )

    if true_r_times.size > 1:
        true_hr = float(60.0 / np.mean(np.diff(true_r_times)))
        est = peaks.estimated_hr_bpm
        checks.append(
            ValidationCheck(
                name="estimated_heart_rate",
                passed=est is not None and abs(est - true_hr) <= HR_TOLERANCE_BPM,
                expected=round(true_hr, 3),
                actual=None if est is None else round(est, 3),
                unit=Unit.BPM,
                tolerance=HR_TOLERANCE_BPM,
                note="Mean heart rate from detected RR intervals vs. mean of the generated "
                "RR intervals (not the nominal value, which jitter shifts slightly).",
            )
        )

    if peaks.times_s.size and true_r_times.size:
        # Match each detected peak to the nearest true beat.
        diffs = np.abs(peaks.times_s[:, None] - true_r_times[None, :]).min(axis=1) * 1000.0
        median_err = float(np.median(diffs))
        checks.append(
            ValidationCheck(
                name="peak_timing_error",
                passed=median_err <= PEAK_TIMING_TOLERANCE_MS,
                expected=0.0,
                actual=round(median_err, 3),
                unit=Unit.MILLISECOND,
                tolerance=PEAK_TIMING_TOLERANCE_MS,
                note="Median absolute distance between detected peaks and nearest true R time.",
            )
        )
    return checks


def run_simulation(req: EcgSimulationRequest) -> SimulationResult:
    rng_rr, rng_noise = _rng_streams(req.seed)
    s, nz = req.signal, req.noise
    fs = s.sampling_rate_hz

    clean = generator.generate_clean_ecg(
        heart_rate_bpm=s.heart_rate_bpm,
        sampling_rate_hz=fs,
        duration_s=s.duration_s,
        rr_variability=s.rr_variability,
        r_amplitude_mv=s.r_amplitude_mv,
        first_beat_offset_s=s.first_beat_offset_s,
        rng=rng_rr,
    )
    disturbance = noise.compose_noise(
        clean.time_s,
        fs,
        white_sd_mv=nz.white_sd_mv,
        powerline_amplitude_mv=nz.powerline_amplitude_mv,
        powerline_frequency_hz=float(nz.powerline_frequency_hz),
        baseline_amplitude_mv=nz.baseline_amplitude_mv,
        baseline_frequency_hz=nz.baseline_frequency_hz,
        muscle_amplitude_mv=nz.muscle_amplitude_mv,
        rng=rng_noise,
    )
    noisy = clean.signal_mv + disturbance
    filtered = filters.apply_chain(noisy, fs, req.filters)

    peaks: detection.RPeaks | None = None
    if req.analysis.detect_r_peaks:
        source = {"filtered": filtered, "noisy": noisy, "clean": clean.signal_mv}[
            req.analysis.source
        ]
        peaks = detection.detect_r_peaks(source, fs, req.analysis.refractory_ms)

    arrays = SimulationArrays(
        time_s=clean.time_s,
        clean_mv=clean.signal_mv,
        noisy_mv=noisy,
        filtered_mv=filtered,
        true_r_times_s=clean.r_times_s,
        r_peak_indices=peaks.indices if peaks is not None else np.empty(0, np.int64),
    )

    clean_rms = _rms(clean.signal_mv)
    noise_rms = _rms(disturbance)
    residual_rms = _rms(filtered - clean.signal_mv)
    stats = SignalStats(
        clean_rms_mv=round(clean_rms, 6),
        noise_rms_mv=round(noise_rms, 6),
        residual_rms_mv=round(residual_rms, 6),
        snr_noisy_db=_snr_db(clean_rms, noise_rms),
        snr_filtered_db=_snr_db(clean_rms, residual_rms),
    )

    response = EcgSimulationResponse(
        model=MODEL_INFO,
        algorithm_versions=ALGORITHM_VERSIONS,
        parameters=parameters_from_request(req),
        time_s=_round(arrays.time_s),
        clean_mv=_round(arrays.clean_mv),
        noisy_mv=_round(arrays.noisy_mv),
        filtered_mv=_round(arrays.filtered_mv),
        true_r_times_s=_round(arrays.true_r_times_s),
        r_peaks=None
        if peaks is None
        else RPeakResult(
            method=detection.DETECTOR_NAME,
            indices=[int(i) for i in peaks.indices],
            times_s=_round(peaks.times_s),
            rr_intervals_s=_round(peaks.rr_intervals_s),
            estimated_hr_bpm=None
            if peaks.estimated_hr_bpm is None
            else round(peaks.estimated_hr_bpm, 3),
            hr_sd_bpm=None if peaks.hr_sd_bpm is None else round(peaks.hr_sd_bpm, 3),
        ),
        spectrum=_spectrum(noisy, filtered, fs) if req.include_spectrum else None,
        stats=stats,
        validation=validate(req, clean.r_times_s, peaks),
        result_hash=result_hash(arrays),
    )
    return SimulationResult(response=response, arrays=arrays)
