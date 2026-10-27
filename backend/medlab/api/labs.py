from __future__ import annotations

from fastapi import APIRouter, HTTPException

from medlab.labs.registry import LabInfo, get_lab, load_labs

router = APIRouter(prefix="/labs", tags=["labs"])


@router.get("", response_model=list[LabInfo])
def list_labs() -> list[LabInfo]:
    return load_labs()


@router.get("/{lab_id}", response_model=LabInfo)
def read_lab(lab_id: str) -> LabInfo:
    lab = get_lab(lab_id)
    if lab is None:
        raise HTTPException(status_code=404, detail=f"unknown lab '{lab_id}'")
    return lab
