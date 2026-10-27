"""Request and response schemas of the Human-Machine Interaction Lab."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field

from medlab.schemas.common import DataSource, ModelInfo, Parameter, ValidationCheck
from medlab.schemas.reaction import TimingInfo
from medlab.schemas.stats import ComparisonResult, DescriptiveStats, RateComparison


class HmiVariant(StrEnum):
    A = "A"
    B = "B"


class HmiTaskKind(StrEnum):
    SET_RATE = "set_rate"
    SET_VTBI = "set_vtbi"
    SET_BOLUS = "set_bolus"
    ACK_ALARM = "ack_alarm"


class HmiErrorType(StrEnum):
    WRONG_VALUE = "wrong_value"
    UNIT_ERROR = "unit_error"
    DECIMAL_ERROR = "decimal_error"
    WRONG_FIELD = "wrong_field"
    OUT_OF_RANGE = "out_of_range"
    PREMATURE_CONFIRM = "premature_confirm"
    WRONG_ALARM = "wrong_alarm"
    TIMEOUT = "timeout"


class HmiTaskSpec(BaseModel):
    id: str = Field(max_length=32)
    kind: HmiTaskKind
    instruction: str = Field(max_length=200)
    target_field: str = Field(max_length=32, description="rate | vtbi | bolus | alarm")
    target_value: float | None = Field(None, description="Numeric target, None for alarms")
    unit: str | None = Field(None, max_length=16)
    tolerance: float = Field(0.001, ge=0)
    min_value: float | None = None
    max_value: float | None = None
    alarm_id: str | None = Field(None, max_length=32)


class HmiDesign(BaseModel):
    seed: int = Field(42, ge=0, le=2**31 - 1)
    tasks_per_variant: int = Field(6, ge=3, le=16)
    variant_order: Literal["AB", "BA"] = Field("AB", description="Which variant is used first")
    timeout_ms: float = Field(60000.0, ge=5000, le=600000)
    tasks: list[HmiTaskSpec] = Field(default_factory=list, max_length=32)


class HmiError(BaseModel):
    type: HmiErrorType
    detail: str = Field(max_length=200)


class HmiTaskResult(BaseModel):
    task_id: str = Field(max_length=32)
    variant: HmiVariant
    order_index: int = Field(ge=0)
    duration_ms: float = Field(ge=0)
    submitted_field: str | None = Field(None, max_length=32)
    submitted_value: float | None = None
    submitted_unit: str | None = Field(None, max_length=16)
    submitted_alarm: str | None = Field(None, max_length=32)
    raw_text: str | None = Field(None, max_length=64)
    interactions: int = Field(0, ge=0)
    confirmed: bool = True
    timed_out: bool = False


class TlxRating(BaseModel):
    """NASA-TLX style subjective load, each scale 0-100."""

    mental: float = Field(ge=0, le=100)
    physical: float = Field(ge=0, le=100)
    temporal: float = Field(ge=0, le=100)
    performance: float = Field(ge=0, le=100, description="0 = perfect, 100 = failure")
    effort: float = Field(ge=0, le=100)
    frustration: float = Field(ge=0, le=100)


class HmiDataset(BaseModel):
    design: HmiDesign = Field(default_factory=HmiDesign)
    timing: TimingInfo = Field(default_factory=TimingInfo)
    results: list[HmiTaskResult] = Field(min_length=1, max_length=64)
    tlx: dict[HmiVariant, TlxRating | None] = Field(default_factory=dict)


class AnalysedTaskResult(HmiTaskResult):
    kind: HmiTaskKind
    success: bool
    errors: list[HmiError]


class HmiVariantSummary(BaseModel):
    variant: HmiVariant
    n_tasks: int
    n_success: int
    success_rate: float | None
    time: DescriptiveStats
    errors_total: int
    errors_by_type: dict[str, int]
    interactions_mean: float | None
    tlx: TlxRating | None
    tlx_overall: float | None


class HmiTaskKindSummary(BaseModel):
    kind: HmiTaskKind
    n_a: int
    n_b: int
    median_time_a_ms: float | None
    median_time_b_ms: float | None
    errors_a: int
    errors_b: int


class HmiComparison(BaseModel):
    time: ComparisonResult
    errors: RateComparison
    success: RateComparison


class HmiAnalysisResponse(BaseModel):
    model: ModelInfo
    algorithm_versions: dict[str, str]
    parameters: list[Parameter]
    data_source: DataSource
    variants: dict[HmiVariant, HmiVariantSummary]
    comparison: HmiComparison
    by_kind: list[HmiTaskKindSummary]
    results: list[AnalysedTaskResult]
    validation: list[ValidationCheck]
    result_hash: str
