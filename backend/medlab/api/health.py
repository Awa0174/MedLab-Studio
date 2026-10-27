from __future__ import annotations

from fastapi import APIRouter

from medlab import __version__
from medlab.schemas.common import HealthResponse

router = APIRouter(tags=["platform"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", version=__version__)
