#!/usr/bin/env bash
# Starts backend (127.0.0.1:8000) and frontend (127.0.0.1:5173) in the current shell.
# Usage:  ./scripts/start.sh      (Ctrl+C stops both)
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

(cd "$root/backend" && uv run uvicorn medlab.main:app --host 127.0.0.1 --port 8000 --reload) &
backend=$!
(cd "$root/frontend" && npm run dev) &
frontend=$!

trap 'kill $backend $frontend 2>/dev/null || true' INT TERM EXIT
echo "MedLab Studio starting:"
echo "  API       http://127.0.0.1:8000/docs"
echo "  Frontend  http://127.0.0.1:5173"
wait
