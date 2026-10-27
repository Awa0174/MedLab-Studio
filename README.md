# MedLab Studio

Eine lokal gehostete, modulare Plattform für medizintechnische Simulationen, Signalverarbeitung,
Bildanalyse, KI und Mensch-Maschine-Interaktion. Zehn spezialisierte Labore teilen sich eine
gemeinsame Experiment-Infrastruktur: Modellversion, Parameter mit Einheiten, Zufalls-Seed,
Validierungsprüfungen und ein Ergebnis-Hash machen jede Simulation speicherbar, wiederholbar
und vergleichbar.

**Version 0.1 (Milestone 1):** Plattformgerüst mit allen zehn Laboren als Modulkarten, das
ECG Signal Lab ist vollständig nutzbar.

> **Abgrenzung.** MedLab Studio ist ein Lehr-, Forschungs- und Demonstrationswerkzeug.
> Es ist kein Medizinprodukt, stellt keine Diagnosen und trifft keine Therapieentscheidungen.
> Alle Signale sind synthetisch und als solche gekennzeichnet. Echte Gesundheitsdaten werden
> nicht verarbeitet.

## Was das ECG Signal Lab kann

1. Synthetisches Lead-II-EKG mit einstellbarer Herzfrequenz, Abtastrate, Dauer, RR-Variabilität und Seed
2. Flüssiges, zoombares Diagramm mit Cursor-Messung (Marker A/B: Δt, ΔV, 60/Δt)
3. Störungen: weißes Rauschen, 50/60-Hz-Netzbrumm, Baseline-Wander, Muskelartefakte
4. Filterkette: Notch, Butterworth-Bandpass, gleitender Mittelwert, jeweils parametrierbar
5. Vergleich Original/gefiltert als Overlay oder gestapelt mit gekoppeltem Zoom, optional mit Ground Truth
6. R-Zacken-Detektion (Pan–Tompkins), Herzfrequenzschätzung, Spektrum (Welch), SNR vor/nach Filter
7. Validierungsprüfungen gegen die bekannte Wahrheit, Explain-Panel mit Modell, Annahmen, Grenzen, Quellen
8. Experimente speichern, laden, erneut berechnen und per Hash auf Reproduzierbarkeit prüfen

## Voraussetzungen

| Werkzeug | Version | Hinweis |
|---|---|---|
| Node.js | ≥ 20 (getestet mit 24) | https://nodejs.org |
| uv | ≥ 0.5 | Verwaltet Python und das Backend-Venv: https://docs.astral.sh/uv/ |
| Python | 3.11–3.13 | wird von uv automatisch bereitgestellt (`backend/.python-version` = 3.13) |
| Git | beliebig | |

## Installation

```bash
cd backend
uv sync
cd ../frontend
npm install
npx playwright install chromium   # nur für den End-to-End-Test
```

## Starten

Windows (zwei Fenster):

```powershell
.\scripts\start.ps1
```

Git Bash / Linux / macOS (ein Terminal, Ctrl+C beendet beide):

```bash
./scripts/start.sh
```

Oder manuell:

```bash
cd backend && uv run uvicorn medlab.main:app --host 127.0.0.1 --port 8000 --reload
cd frontend && npm run dev
```

Danach: Frontend unter http://127.0.0.1:5173, API-Dokumentation unter http://127.0.0.1:8000/docs.
Beim ersten Start legt das Backend `data/medlab.sqlite3` an und führt die Alembic-Migration aus.

## Prüfen

```powershell
.\scripts\check.ps1            # Backend: ruff, mypy, pytest · Frontend: tsc, eslint, vitest
```

```bash
cd frontend && npm run test:e2e   # Playwright-Smoke-Test, startet beide Server selbst (Ports 8011/5174)
```

Einzeln:

| Bereich | Befehl |
|---|---|
| Backend-Tests | `cd backend && uv run pytest` |
| Backend-Lint/Typen | `uv run ruff check . && uv run ruff format --check . && uv run mypy medlab` |
| Frontend-Tests | `cd frontend && npm test` |
| Frontend-Lint/Typen | `npm run lint && npm run typecheck` |
| API-Typen neu erzeugen | `cd backend && uv run python scripts/export_openapi.py ../frontend/src/api/openapi.json && cd ../frontend && npm run gen:api` |

## Projektstruktur

```
medlab-studio/
  backend/            FastAPI, NumPy/SciPy, SQLAlchemy + Alembic, pytest
    medlab/
      api/            Router pro Bereich
      core/           Experiment-Service, DB, Dateiablage
      labs/ecg/       Generator, Rauschen, Filter, R-Zacken, Pipeline
      schemas/        Pydantic-Modelle (eine Quelle für die API-Typen)
    alembic/          Migrationen
    tests/
  frontend/           React 18, TypeScript, Vite, Tailwind, Radix, ECharts, Vitest, Playwright
    src/
      app/            Routing, Theme, Layout
      api/            generierte Typen, Client, Hooks
      labs/           ECG Lab und Platzhalter der neun weiteren Labore
      experiments/    Speichern, Liste, Rerun
      components/     UI-Bausteine, Chart-Hook
    e2e/
  shared/labs.json    Laborliste für Backend und Frontend
  data/               lokale Experimente und SQLite (nicht versioniert)
  docs/               Architektur, Modellbeschreibungen
  scripts/            Start- und Prüfskripte
```

## Dokumentation

- [docs/architecture.md](docs/architecture.md) – Aufbau, Datenfluss, Entscheidungen
- [docs/models/ecg.md](docs/models/ecg.md) – Gleichungen, Parameter, Grenzen, Verifikation des EKG-Modells

## Konfiguration

Umgebungsvariablen mit Präfix `MEDLAB_` (optional):

| Variable | Standard | Bedeutung |
|---|---|---|
| `MEDLAB_HOST` | `127.0.0.1` | Bind-Adresse des Backends (bewusst nur lokal) |
| `MEDLAB_PORT` | `8000` | Backend-Port |
| `MEDLAB_DATA_DIR` | `<repo>/data` | SQLite und Experimentdateien |
| `MEDLAB_CORS_ORIGINS` | `["http://localhost:5173","http://127.0.0.1:5173"]` | erlaubte Frontend-Origins |
| `MEDLAB_BACKEND_URL` | `http://127.0.0.1:8000` | Proxy-Ziel des Vite-Dev-Servers |

## Roadmap

Phase 0 (Fundament) und Phase 1 (ECG Signal Lab) sind mit 0.1 umgesetzt. Die weiteren Labore
sind als Konzeptseiten angelegt: Reaction Time & HMI (Phase 2), Sensorik & Pharmakokinetik
(Phase 3), Bildanalyse & Mikroskopie (Phase 4), Digital Twin, OP-Training, Regulatory Navigator
und Cross-Lab-Workflows (Phase 5).
