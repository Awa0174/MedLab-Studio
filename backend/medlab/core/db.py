"""SQLAlchemy engine/session and schema migration (Alembic) for the local SQLite store."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from medlab.config import settings

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Base(DeclarativeBase):
    pass


def _enable_sqlite_pragmas(dbapi_connection: object, _record: object) -> None:
    cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


def make_engine(url: str | None = None) -> Engine:
    engine = create_engine(url or settings.database_url, connect_args={"check_same_thread": False})
    event.listen(engine, "connect", _enable_sqlite_pragmas)
    return engine


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def run_migrations(url: str | None = None) -> None:
    """Apply all Alembic migrations. Called once at application start-up."""
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url or settings.database_url)
    command.upgrade(cfg, "head")


def get_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
