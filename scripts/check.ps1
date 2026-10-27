# Runs every automated check: backend tests + lint + types, frontend tests + lint + types.
# Usage:  .\scripts\check.ps1
$root = Split-Path -Parent $PSScriptRoot
$failed = $false

function Run($name, $dir, $cmd) {
  Write-Host "`n== $name ==" -ForegroundColor Cyan
  Push-Location $dir
  try {
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) { $script:failed = $true; Write-Host "FAILED: $name" -ForegroundColor Red }
  } finally { Pop-Location }
}

Run "backend: ruff"   "$root\backend"  "uv run ruff check . ; if (`$LASTEXITCODE -eq 0) { uv run ruff format --check . }"
Run "backend: mypy"   "$root\backend"  "uv run mypy medlab"
Run "backend: pytest" "$root\backend"  "uv run pytest"
Run "frontend: types" "$root\frontend" "npm run typecheck"
Run "frontend: lint"  "$root\frontend" "npm run lint"
Run "frontend: tests" "$root\frontend" "npm test"

if ($failed) { Write-Host "`nSome checks failed." -ForegroundColor Red; exit 1 }
Write-Host "`nAll checks passed." -ForegroundColor Green
