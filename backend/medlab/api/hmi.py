from __future__ import annotations

from fastapi import APIRouter, Query

from medlab.labs.hmi.analysis import analyse
from medlab.labs.hmi.tasks import generate_tasks
from medlab.schemas.hmi import HmiAnalysisResponse, HmiDataset, HmiTaskSpec

router = APIRouter(prefix="/labs/hmi", tags=["hmi"])


@router.get("/tasks", response_model=list[HmiTaskSpec])
def tasks(
    seed: int = Query(42, ge=0, le=2**31 - 1), n: int = Query(6, ge=3, le=16)
) -> list[HmiTaskSpec]:
    """Seeded task catalogue for the infusion-pump scenario."""
    return generate_tasks(seed, n)


@router.post("/analyze", response_model=HmiAnalysisResponse)
def analyze_dataset(dataset: HmiDataset) -> HmiAnalysisResponse:
    """Classify errors and compare the two interface variants."""
    return analyse(dataset)
