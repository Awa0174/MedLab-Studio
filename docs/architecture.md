# Architektur

MedLab Studio ist ein lokales Monorepo mit einem React/TypeScript-Frontend und einem
Python/FastAPI-Backend. Beide laufen ausschließlich auf dem eigenen Rechner.

```
Browser ── http://127.0.0.1:5173 ──► Vite Dev-Server (Frontend)
                                        │  /api/*  (Proxy)
                                        ▼
                               http://127.0.0.1:8000  FastAPI (Backend)
                                        │
                      ┌─────────────────┼──────────────────┐
                      ▼                 ▼                  ▼
               NumPy / SciPy      SQLite (Metadaten)   data/experiments/<id>/
               Simulation          via SQLAlchemy        response.json + *.npy
```

## Grundsätze

- **Signalverarbeitung nur im Backend.** Das Frontend rendert und steuert. Dadurch sind
  Ergebnisse unabhängig vom Browser reproduzierbar und per pytest überprüfbar.
- **Eine Quelle für Typen.** Pydantic-Schemas erzeugen das OpenAPI-Dokument; daraus
  entstehen die TypeScript-Typen (`npm run gen:api`). Die Laborliste liegt als
  `shared/labs.json` vor und wird von beiden Seiten gelesen.
- **Experiment als gemeinsames Format.** Jedes Labor liefert einen `LabRun` mit Modell,
  Algorithmusversionen, Parametern mit Einheiten, Datenquellen, Validierungsprüfungen,
  Seed, Ergebnissen und einem Ergebnis-Hash. Der Experiment-Service ist laborunabhängig.
- **Große Arrays nicht in SQLite.** Die Datenbank hält Metadaten; Arrays liegen als `.npy`
  im Experimentverzeichnis, die vollständige API-Antwort als `response.json`.
- **Nur lokal.** Backend bindet an 127.0.0.1, CORS erlaubt nur den lokalen Frontend-Origin,
  keine externen Dienste, keine Telemetrie.

## Backend (`backend/medlab`)

| Modul | Aufgabe |
|---|---|
| `config.py` | Einstellungen (`MEDLAB_*`-Umgebungsvariablen), Pfade, CORS |
| `main.py` | App-Factory, Router, Migration beim Start |
| `schemas/` | Pydantic-Modelle: gemeinsam (`common.py`), Experiment (`experiment.py`), ECG (`ecg.py`) |
| `labs/registry.py` | Laborliste aus `shared/labs.json` |
| `labs/ecg/` | `generator.py`, `noise.py`, `filters.py`, `detection.py`, `pipeline.py` |
| `core/db.py` | SQLAlchemy-Engine, Session, Alembic-Upgrade |
| `core/models.py` | ORM-Tabelle `experiments` |
| `core/storage.py` | Dateiablage je Experiment |
| `core/experiments.py` | Service: run, create, list, get, delete, rerun |
| `api/` | Router: `/api/health`, `/api/labs`, `/api/labs/ecg/simulate`, `/api/experiments` |

Neue Labore registrieren einen Runner in `core/experiments.py` (`RUNNERS`) und bekommen
einen eigenen Router sowie ein eigenes Schema-Modul.

## Frontend (`frontend/src`)

| Ordner | Aufgabe |
|---|---|
| `app/` | Router, Theme (Dark/Light über `data-theme`), Layout (Sidebar, Header, Shell) |
| `api/` | generierte Typen (`schema.d.ts`), typisierter Client, React-Query-Hooks |
| `labs/registry.ts` | Laborliste aus `shared/labs.json` |
| `labs/ecg/` | Store (zustand), Simulation-Hook, Parameterpanel, Charts (ECharts), Ergebnisse, Explain |
| `labs/placeholder/` | Konzeptseiten der neun geplanten Labore |
| `experiments/` | Speichern-Dialog, Experimentliste mit Rerun und Löschen |
| `components/ui/` | Button, Panel, Badge, Felder (Slider, Switch, Select, Text), Tabs, Dialog, Collapsible |
| `components/charts/` | ECharts-Hook mit Theme-Tokens und Resize |

Die Design-Tokens stehen in `index.css` (`:root[data-theme=…]`) und werden über
`@theme inline` als Tailwind-Farben verfügbar. Charts lesen dieselben Tokens zur Laufzeit.

## Tests

- Backend: pytest (`backend/tests`), Ruff, mypy strict.
- Frontend: Vitest + Testing Library (`src/**/*.test.ts(x)`), ESLint, tsc.
- End-to-End: Playwright (`frontend/e2e/smoke.spec.ts`) startet beide Server mit eigenem
  Datenverzeichnis (`data-e2e/`) und fährt den vollständigen ECG-Workflow durch.

`scripts/check.ps1` führt alle Prüfungen außer Playwright aus.

## Entscheidungen (ADR-Kurzform)

1. **Gauß-Wellensumme statt dynamischem ECGSYN-Modell.** Nachvollziehbar, testbar, keine
   ODE-Integration nötig. Dokumentierte Vereinfachung ohne physiologischen Anspruch.
2. **Zero-phase-Filter.** Für Offline-Analyse und exakte R-Zeitpunkte; bewusst nicht
   echtzeitfähig. Even-Padding bis 3 s gegen Randtransienten.
3. **Ergebnis-Hash als Reproduzierbarkeitskriterium.** SHA-256 über alle Arrays in voller
   Genauigkeit; Rerun vergleicht Hashes.
4. **OpenAPI → TypeScript** statt handgeschriebener Typen.
5. **SQLite + Dateien** statt alles in der Datenbank.
