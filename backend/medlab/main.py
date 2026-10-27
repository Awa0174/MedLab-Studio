"""FastAPI application factory. Binds to 127.0.0.1 only by default."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from medlab import __version__
from medlab.api import ecg, experiments, health, labs
from medlab.config import settings
from medlab.core.db import run_migrations
from medlab.schemas.common import DISCLAIMER


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    run_migrations()
    settings.experiments_dir.mkdir(parents=True, exist_ok=True)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="MedLab Studio API",
        version=__version__,
        description=DISCLAIMER,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    api = "/api"
    app.include_router(health.router, prefix=api)
    app.include_router(labs.router, prefix=api)
    app.include_router(ecg.router, prefix=api)
    app.include_router(experiments.router, prefix=api)
    return app


app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run("medlab.main:app", host=settings.host, port=settings.port, reload=True)


if __name__ == "__main__":
    main()
