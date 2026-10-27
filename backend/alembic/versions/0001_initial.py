"""initial experiments table

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-27
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "experiments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("lab_type", sa.String(32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("model_name", sa.String(120), nullable=False),
        sa.Column("model_version", sa.String(32), nullable=False),
        sa.Column("model_description", sa.Text(), nullable=False, server_default=""),
        sa.Column("seed", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("result_hash", sa.String(64), nullable=True),
        sa.Column("parameters", sa.JSON(), nullable=False),
        sa.Column("data_sources", sa.JSON(), nullable=False),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("algorithm_versions", sa.JSON(), nullable=False),
        sa.Column("results_summary", sa.JSON(), nullable=False),
        sa.Column("visualization", sa.JSON(), nullable=False),
        sa.Column("validation", sa.JSON(), nullable=False),
        sa.Column("storage_dir", sa.String(255), nullable=False),
    )
    op.create_index("ix_experiments_lab_type", "experiments", ["lab_type"])


def downgrade() -> None:
    op.drop_index("ix_experiments_lab_type", table_name="experiments")
    op.drop_table("experiments")
