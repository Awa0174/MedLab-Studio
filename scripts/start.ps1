# Starts backend (127.0.0.1:8000) and frontend (127.0.0.1:5173) in two PowerShell windows.
# Usage:  .\scripts\start.ps1
$root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$root\backend'; uv run uvicorn medlab.main:app --host 127.0.0.1 --port 8000 --reload"
)
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$root\frontend'; npm run dev"
)
Write-Host "MedLab Studio starting:"
Write-Host "  API       http://127.0.0.1:8000/docs"
Write-Host "  Frontend  http://127.0.0.1:5173"
