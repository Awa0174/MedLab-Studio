"""The shared experiment data model used by every laboratory."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from medlab.schemas.common import DataSource, ModelInfo, Parameter, ValidationCheck


class LabType(StrEnum):
    ECG = "ecg"
    IMAGING = "imaging"
    DIGITAL_TWIN = "digital-twin"
    WEARABLE = "wearable"
    PHARMACOKINETICS = "pharmacokinetics"
    SURGICAL = "surgical"
    MICROSCOPY = "microscopy"
    REGULATORY = "regulatory"
    REACTION_TIME = "reaction-time"
    HMI = "hmi"


class ExecutionStatus(StrEnum):
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ExperimentBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    lab_type: LabType
    description: str = Field(default="", max_length=2000)


class ExperimentCreate(ExperimentBase):
    """Request to create an experiment. `config` is the lab-specific request body."""

    config: dict[str, Any]


class ExperimentSummary(ExperimentBase):
    id: str
    model: ModelInfo
    seed: int | None
    status: ExecutionStatus
    created_at: datetime
    result_hash: str | None


class ExperimentDetail(ExperimentSummary):
    parameters: list[Parameter]
    data_sources: list[DataSource]
    config: dict[str, Any]
    algorithm_versions: dict[str, str]
    results: dict[str, Any]
    visualization: dict[str, Any]
    validation: list[ValidationCheck]


class RerunResult(BaseModel):
    experiment: ExperimentDetail
    reproducible: bool
    previous_hash: str | None
    new_hash: str
