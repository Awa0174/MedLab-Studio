from __future__ import annotations

from fastapi import APIRouter, HTTPException

from medlab.labs.ecg.filters import FilterConfigError
from medlab.labs.ecg.pipeline import run_simulation
from medlab.schemas.ecg import EcgSimulationRequest, EcgSimulationResponse

router = APIRouter(prefix="/labs/ecg", tags=["ecg"])


@router.post("/simulate", response_model=EcgSimulationResponse)
def simulate(request: EcgSimulationRequest) -> EcgSimulationResponse:
    """Generate, disturb, filter and analyse a synthetic ECG in one call."""
    try:
        return run_simulation(request).response
    except FilterConfigError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
