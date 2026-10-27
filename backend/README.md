# MedLab Studio backend

FastAPI service for simulations, signal processing and experiment persistence.
Binds to 127.0.0.1 only. Not a medical device; synthetic data only.

```bash
uv sync                                   # install (Python 3.13 via uv)
uv run uvicorn medlab.main:app --host 127.0.0.1 --port 8000 --reload
uv run pytest                             # tests
uv run ruff check . && uv run mypy medlab # lint + types
uv run python scripts/export_openapi.py ../frontend/src/api/openapi.json
```

See `../docs/architecture.md` and `../docs/models/ecg.md`.
