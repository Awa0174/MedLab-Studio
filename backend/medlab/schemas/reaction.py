"""Request and response schemas of the Reaction Time Lab."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from medlab.schemas.common import DataSource, ModelInfo, Parameter, ValidationCheck
from medlab.schemas.stats import DescriptiveStats, Histogram, TrendResult


class ReactionTask(StrEnum):
    SIMPLE = "simple"
    CHOICE = "choice"


class ReactionDesign(BaseModel):
    task: ReactionTask = ReactionTask.SIMPLE
    n_trials: int = Field(30, ge=5, le=500)
    foreperiod_min_ms: float = Field(1000.0, ge=200, le=10000, description="Shortest wait")
    foreperiod_max_ms: float = Field(3000.0, ge=200, le=10000, description="Longest wait")
    timeout_ms: float = Field(2000.0, ge=300, le=10000, description="No response after this")
    anticipation_threshold_ms: float = Field(
        100.0, ge=0, le=300, description="Reactions faster than this are anticipations"
    )
    seed: int = Field(42, ge=0, le=2**31 - 1, description="Foreperiods, stimulus sides, bootstrap")

    @model_validator(mode="after")
    def _check_range(self) -> ReactionDesign:
        if self.foreperiod_max_ms < self.foreperiod_min_ms:
            raise ValueError("foreperiod_max_ms must be >= foreperiod_min_ms")
        return self


class TimingInfo(BaseModel):
    """What the browser could measure about its own timing."""

    frame_interval_ms: float | None = Field(None, ge=0, description="Measured via rAF")
    refresh_rate_hz: float | None = Field(None, ge=0)
    timer_resolution_ms: float | None = Field(
        None, ge=0, description="Smallest performance.now() step"
    )
    user_agent: str | None = Field(None, max_length=300)
    method: str = Field(
        "stimulus onset at requestAnimationFrame after paint; response via keydown; "
        "performance.now()",
        max_length=300,
    )


class ReactionTrial(BaseModel):
    index: int = Field(ge=0)
    condition: str = Field(max_length=16, description="'simple' or the stimulus side")
    foreperiod_ms: float = Field(ge=0)
    reaction_ms: float | None = Field(None, ge=0, description="None if timed out")
    response: str | None = Field(None, max_length=16)
    correct: bool = True
    anticipated: bool = False
    timed_out: bool = False


class ReactionDataset(BaseModel):
    design: ReactionDesign = Field(default_factory=ReactionDesign)
    timing: TimingInfo = Field(default_factory=TimingInfo)
    trials: list[ReactionTrial] = Field(min_length=1, max_length=2000)
    source: Literal["measured", "synthetic"] = "measured"


class ReactionSimulationRequest(BaseModel):
    """Synthetic reaction times from an ex-Gaussian distribution (mu, sigma, tau)."""

    design: ReactionDesign = Field(default_factory=ReactionDesign)
    mu_ms: float = Field(250.0, ge=50, le=2000, description="Gaussian component mean")
    sigma_ms: float = Field(30.0, ge=1, le=500, description="Gaussian component SD")
    tau_ms: float = Field(80.0, ge=1, le=1000, description="Exponential tail mean")
    choice_penalty_ms: float = Field(80.0, ge=0, le=500, description="Added for choice tasks")
    error_rate: float = Field(0.05, ge=0, le=0.5, description="Wrong-side responses (choice)")
    anticipation_rate: float = Field(0.02, ge=0, le=0.5)
    practice_slope_ms_per_trial: float = Field(-0.5, ge=-10, le=10)


class UncertaintyComponent(BaseModel):
    name: str
    kind: Literal["random", "systematic"]
    standard_ms: float | None
    distribution: str
    note: str


class UncertaintyBudget(BaseModel):
    components: list[UncertaintyComponent]
    combined_standard_ms: float | None
    expanded_95_ms: float | None
    note: str


class TrialCounts(BaseModel):
    n_total: int
    n_valid: int
    n_anticipated: int
    n_timed_out: int
    n_incorrect: int
    n_outliers: int


class AnalysedTrial(ReactionTrial):
    valid: bool
    outlier: bool


class ReactionAnalysisResponse(BaseModel):
    model: ModelInfo
    algorithm_versions: dict[str, str]
    parameters: list[Parameter]
    data_source: DataSource
    counts: TrialCounts
    summary: DescriptiveStats
    summary_without_outliers: DescriptiveStats
    by_condition: dict[str, DescriptiveStats]
    histogram: Histogram
    trend: TrendResult
    trials: list[AnalysedTrial]
    uncertainty: UncertaintyBudget
    validation: list[ValidationCheck]
    result_hash: str
