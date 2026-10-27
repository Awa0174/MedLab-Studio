"""Schemas shared by all laboratories."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


class Unit(StrEnum):
    """Units used across the platform. Every parameter carries one."""

    MILLIVOLT = "mV"
    HERTZ = "Hz"
    SECOND = "s"
    MILLISECOND = "ms"
    BPM = "bpm"
    DIMENSIONLESS = "1"
    PERCENT = "%"
    DECIBEL = "dB"


class Parameter(BaseModel):
    """A named, unit-carrying parameter value as stored in an experiment."""

    name: str
    value: float | int | str | bool
    unit: Unit
    description: str | None = None


class ModelInfo(BaseModel):
    name: str
    version: str
    description: str


class ValidationCheck(BaseModel):
    """One plausibility or correctness check performed on a result."""

    name: str
    passed: bool
    expected: float | int | str | None = None
    actual: float | int | str | None = None
    unit: Unit | None = None
    tolerance: float | None = None
    note: str | None = None


class DataSource(BaseModel):
    kind: Literal["synthetic", "public", "anonymised"]
    name: str
    description: str
    license: str | None = None


DISCLAIMER = (
    "MedLab Studio is an educational, research and demonstration tool. "
    "It is not a medical device, provides no diagnosis and must not be used "
    "for treatment decisions. All signals are synthetic unless stated otherwise."
)


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str
    disclaimer: str = Field(default=DISCLAIMER)
