from __future__ import annotations

from fastapi import APIRouter

from medlab.labs.reaction.analysis import analyse
from medlab.labs.reaction.simulate import simulate
from medlab.schemas.reaction import (
    ReactionAnalysisResponse,
    ReactionDataset,
    ReactionSimulationRequest,
)

router = APIRouter(prefix="/labs/reaction-time", tags=["reaction-time"])


@router.post("/simulate", response_model=ReactionDataset)
def simulate_dataset(request: ReactionSimulationRequest) -> ReactionDataset:
    """Synthetic ex-Gaussian reaction-time dataset for teaching and testing."""
    return simulate(request)


@router.post("/analyze", response_model=ReactionAnalysisResponse)
def analyze_dataset(dataset: ReactionDataset) -> ReactionAnalysisResponse:
    """Statistics, outliers, trend, uncertainty budget and validation for a dataset."""
    return analyse(dataset)
