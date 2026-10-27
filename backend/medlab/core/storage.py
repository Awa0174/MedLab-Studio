"""File storage for experiment results: one directory per experiment.

Layout: data/experiments/<id>/
    response.json        full lab response as returned by the simulate endpoint
    <array>.npy          full-precision result arrays (one file per array)
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

import numpy as np
from numpy.typing import NDArray

from medlab.config import settings


def experiment_dir(experiment_id: str) -> Path:
    return settings.experiments_dir / experiment_id


def write_results(
    experiment_id: str,
    response: dict[str, Any],
    arrays: dict[str, NDArray[Any]],
) -> Path:
    directory = experiment_dir(experiment_id)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "response.json").write_text(json.dumps(response), encoding="utf-8")
    for name, arr in arrays.items():
        np.save(directory / f"{name}.npy", arr, allow_pickle=False)
    return directory


def read_response(experiment_id: str) -> dict[str, Any] | None:
    path = experiment_dir(experiment_id) / "response.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))  # type: ignore[no-any-return]


def read_array(experiment_id: str, name: str) -> NDArray[Any]:
    arr: NDArray[Any] = np.load(experiment_dir(experiment_id) / f"{name}.npy", allow_pickle=False)
    return arr


def delete_results(experiment_id: str) -> None:
    directory = experiment_dir(experiment_id)
    if directory.exists():
        shutil.rmtree(directory)
