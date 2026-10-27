"""ORM model for stored experiments. Large arrays live on disk, not in SQLite."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from medlab.core.db import Base


class ExperimentRow(Base):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    lab_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, default="")

    model_name: Mapped[str] = mapped_column(String(120), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    model_description: Mapped[str] = mapped_column(Text, default="")

    seed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    result_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    parameters: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    data_sources: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    algorithm_versions: Mapped[dict[str, str]] = mapped_column(JSON, default=dict)
    results_summary: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    visualization: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    validation: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    storage_dir: Mapped[str] = mapped_column(String(255), nullable=False)
