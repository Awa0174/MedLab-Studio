"""Write the OpenAPI document to a file so the frontend can generate TypeScript types.

Usage:  uv run python scripts/export_openapi.py ../frontend/src/api/openapi.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from medlab.main import create_app


def main() -> None:
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "openapi.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(create_app().openapi(), indent=2) + "\n", encoding="utf-8")
    print(f"wrote {target}")


if __name__ == "__main__":
    main()
