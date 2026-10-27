"""Test configuration: every test session gets its own temporary data directory."""

from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

_TMP = Path(tempfile.mkdtemp(prefix="medlab-tests-"))
os.environ["MEDLAB_DATA_DIR"] = str(_TMP)

from fastapi.testclient import TestClient  # noqa: E402

from medlab.main import create_app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> Iterator[TestClient]:
    with TestClient(create_app()) as c:
        yield c
