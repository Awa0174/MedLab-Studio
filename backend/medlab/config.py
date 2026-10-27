"""Runtime configuration. All defaults keep the service strictly local."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MEDLAB_", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8000
    data_dir: Path = Field(default=REPO_ROOT / "data")
    shared_dir: Path = Field(default=REPO_ROOT / "shared")
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"],
    )

    @property
    def database_url(self) -> str:
        return f"sqlite:///{(self.data_dir / 'medlab.sqlite3').as_posix()}"

    @property
    def experiments_dir(self) -> Path:
        return self.data_dir / "experiments"


settings = Settings()
