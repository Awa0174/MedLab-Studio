"""Request and response schemas of the ECG Signal Lab."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

from medlab.schemas.common import ModelInfo, Parameter, ValidationCheck


class SignalParams(BaseModel):
    heart_rate_bpm: float = Field(72.0, ge=30, le=220, description="Nominal heart rate")
    sampling_rate_hz: float = Field(500.0, ge=100, le=2000, description="Sampling rate")
    duration_s: float = Field(10.0, ge=1, le=60, description="Signal duration")
    rr_variability: float = Field(
        0.02,
        ge=0,
        le=0.2,
        description="Standard deviation of RR jitter as fraction of the nominal RR interval",
    )
    r_amplitude_mv: float = Field(1.0, ge=0.1, le=5, description="R-wave amplitude")
    first_beat_offset_s: float = Field(0.3, ge=0, le=2, description="Time of the first R-peak")


class NoiseParams(BaseModel):
    white_sd_mv: float = Field(0.0, ge=0, le=2, description="White Gaussian noise SD")
    powerline_amplitude_mv: float = Field(0.0, ge=0, le=2, description="Mains hum amplitude")
    powerline_frequency_hz: Literal[50, 60] = Field(50, description="Mains frequency")
    baseline_amplitude_mv: float = Field(0.0, ge=0, le=3, description="Baseline wander amplitude")
    baseline_frequency_hz: float = Field(0.3, ge=0.05, le=1.0, description="Baseline wander freq.")
    muscle_amplitude_mv: float = Field(0.0, ge=0, le=2, description="EMG artefact RMS amplitude")


class BandpassFilter(BaseModel):
    type: Literal["bandpass"] = "bandpass"
    low_hz: float = Field(0.5, gt=0, le=500)
    high_hz: float = Field(40.0, gt=0, le=1000)
    order: int = Field(4, ge=1, le=10)

    @model_validator(mode="after")
    def _check_band(self) -> BandpassFilter:
        if self.low_hz >= self.high_hz:
            raise ValueError("bandpass low_hz must be smaller than high_hz")
        return self


class NotchFilter(BaseModel):
    type: Literal["notch"] = "notch"
    frequency_hz: float = Field(50.0, gt=0, le=1000)
    quality_factor: float = Field(30.0, ge=1, le=200)


class MovingAverageFilter(BaseModel):
    type: Literal["moving_average"] = "moving_average"
    window_ms: float = Field(20.0, ge=1, le=500)


FilterStage = Annotated[
    BandpassFilter | NotchFilter | MovingAverageFilter,
    Field(discriminator="type"),
]


class AnalysisParams(BaseModel):
    detect_r_peaks: bool = True
    source: Literal["filtered", "noisy", "clean"] = Field(
        "filtered", description="Which signal the detector runs on"
    )
    refractory_ms: float = Field(200.0, ge=100, le=600, description="Minimum RR interval")


class EcgSimulationRequest(BaseModel):
    seed: int = Field(42, ge=0, le=2**31 - 1, description="Seed for RR jitter and noise")
    signal: SignalParams = Field(default_factory=SignalParams)
    noise: NoiseParams = Field(default_factory=NoiseParams)
    filters: list[FilterStage] = Field(default_factory=list)
    analysis: AnalysisParams = Field(default_factory=AnalysisParams)
    include_spectrum: bool = True


class RPeakResult(BaseModel):
    method: str
    indices: list[int]
    times_s: list[float]
    rr_intervals_s: list[float]
    estimated_hr_bpm: float | None
    hr_sd_bpm: float | None


class SpectrumResult(BaseModel):
    method: str
    frequency_hz: list[float]
    noisy_db: list[float]
    filtered_db: list[float]


class SignalStats(BaseModel):
    clean_rms_mv: float
    noise_rms_mv: float
    residual_rms_mv: float
    snr_noisy_db: float | None
    snr_filtered_db: float | None


class EcgSimulationResponse(BaseModel):
    model: ModelInfo
    algorithm_versions: dict[str, str]
    parameters: list[Parameter]
    time_s: list[float]
    clean_mv: list[float]
    noisy_mv: list[float]
    filtered_mv: list[float]
    true_r_times_s: list[float]
    r_peaks: RPeakResult | None
    spectrum: SpectrumResult | None
    stats: SignalStats
    validation: list[ValidationCheck]
    result_hash: str
