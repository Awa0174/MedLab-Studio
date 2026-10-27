from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from medlab.core import experiments as svc
from medlab.core.db import get_session
from medlab.schemas.experiment import (
    ExperimentCreate,
    ExperimentDetail,
    ExperimentSummary,
    LabType,
    RerunResult,
)

router = APIRouter(prefix="/experiments", tags=["experiments"])
SessionDep = Annotated[Session, Depends(get_session)]


def _handle(exc: Exception) -> HTTPException:
    if isinstance(exc, svc.ExperimentNotFoundError):
        return HTTPException(status_code=404, detail="experiment not found")
    if isinstance(exc, svc.LabNotAvailableError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, svc.InvalidConfigError):
        return HTTPException(status_code=422, detail=str(exc))
    raise exc


@router.get("", response_model=list[ExperimentSummary])
def list_experiments(
    session: SessionDep, lab_type: LabType | None = None
) -> list[ExperimentSummary]:
    return svc.list_experiments(session, lab_type)


@router.post("", response_model=ExperimentDetail, status_code=201)
def create_experiment(session: SessionDep, payload: ExperimentCreate) -> ExperimentDetail:
    try:
        return svc.create_experiment(session, payload)
    except (svc.LabNotAvailableError, svc.InvalidConfigError) as exc:
        raise _handle(exc) from exc


@router.get("/{experiment_id}", response_model=ExperimentDetail)
def read_experiment(session: SessionDep, experiment_id: str) -> ExperimentDetail:
    try:
        return svc.get_experiment(session, experiment_id)
    except svc.ExperimentNotFoundError as exc:
        raise _handle(exc) from exc


@router.delete("/{experiment_id}", status_code=204)
def delete_experiment(session: SessionDep, experiment_id: str) -> Response:
    try:
        svc.delete_experiment(session, experiment_id)
    except svc.ExperimentNotFoundError as exc:
        raise _handle(exc) from exc
    return Response(status_code=204)


@router.post("/{experiment_id}/rerun", response_model=RerunResult)
def rerun_experiment(session: SessionDep, experiment_id: str) -> RerunResult:
    try:
        return svc.rerun_experiment(session, experiment_id)
    except (svc.ExperimentNotFoundError, svc.LabNotAvailableError, svc.InvalidConfigError) as exc:
        raise _handle(exc) from exc
