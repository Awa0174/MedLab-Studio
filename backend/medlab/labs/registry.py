"""Laboratory registry, loaded from the shared JSON file used by the frontend too."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Literal

from pydantic import BaseModel

from medlab.config import settings


class LabInfo(BaseModel):
    id: str
    number: int
    name: str
    tagline: str
    description: str
    domains: list[str]
    status: Literal["available", "planned"]
    phase: int


@lru_cache(maxsize=1)
def load_labs() -> list[LabInfo]:
    path = settings.shared_dir / "labs.json"
    with path.open(encoding="utf-8") as fh:
        raw = json.load(fh)
    return [LabInfo.model_validate(item) for item in raw["labs"]]


def get_lab(lab_id: str) -> LabInfo | None:
    return next((lab for lab in load_labs() if lab.id == lab_id), None)
