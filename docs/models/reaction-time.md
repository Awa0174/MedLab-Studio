# Reaction Time Lab – Methodenbeschreibung

Modell: `reaction-time-analysis` 1.0.0 · Statistik 1.0.0 · Simulator `ex-gaussian-reaction-time` 1.0.0

> Messung der lokalen Nutzerin bzw. des lokalen Nutzers im Browser. Kein klinischer Test von
> Vigilanz oder Kognition. Es werden keine Identifikatoren gespeichert.

## 1. Was wird gemessen

- **Einfache Reaktionszeit:** Leertaste drücken, sobald die Fläche grün wird.
- **Wahlreaktionszeit:** Pfeiltaste links/rechts passend zur Seite des Reizes.
- Vorperiode je Trial gleichverteilt in `[foreperiod_min, foreperiod_max]`, aus dem Seed
  erzeugt (mulberry32 im Frontend), damit der Reizbeginn nicht vorhersagbar ist.

## 2. Zeitmessung im Browser

1. Vor dem Block: Frame-Intervall als Median von 40 `requestAnimationFrame`-Abständen;
   Timer-Auflösung als kleinster positiver Schritt von `performance.now()`.
2. Reizbeginn: Das Reiz-Element wird direkt per DOM-Attribut eingeschaltet, der Zeitstempel
   wird im `requestAnimationFrame`-Callback vor dem Frame genommen, der den Reiz zeigt.
   Der sichtbare Beginn folgt innerhalb eines Frame-Intervalls.
3. Antwort: Zeitstempel im `keydown`-Ereignis. Reaktionszeit = Differenz.

## 3. Gültigkeitsregeln

| Regel | Kriterium | Folge |
|---|---|---|
| Antizipation | Antwort vor dem Reiz oder RT < `anticipation_threshold_ms` (Standard 100 ms) | ungültig |
| Timeout | keine Antwort innerhalb `timeout_ms` | ungültig, RT fehlt |
| Wahlfehler | falsche Pfeiltaste (nur Wahlaufgabe) | ungültig für Zeitstatistik |
| Ausreißer | Tukey-Zäune Q1 − 1,5·IQR, Q3 + 1,5·IQR unter gültigen Trials | markiert, beide Zusammenfassungen berichtet |

## 4. Statistik (Backend, `labs/stats/core.py`)

| Größe | Methode |
|---|---|
| Lage | Median (primär), Mittelwert, 10 % getrimmter Mittelwert |
| Streuung | MAD (×1,4826), SD (ddof=1), IQR, 5./95. Perzentil |
| 95 %-KI Mittelwert | Student-t mit n−1 Freiheitsgraden |
| 95 %-KI Median | Perzentil-Bootstrap, B = 2000, geseedet |
| Trend | OLS der RT über Trial-Index (`scipy.stats.linregress`); negative Steigung = Übung |
| Histogramm | Freedman–Diaconis-Breite 2·IQR·n^(−1/3), auf „schöne“ Werte gerundet |

## 5. Unsicherheitsbudget (GUM-Logik, Angaben in ms)

| Komponente | Art | Verteilung | Standardunsicherheit |
|---|---|---|---|
| Quantisierung des Reizbeginns | zufällig | gleichverteilt über ein Frame-Intervall | frame/√12 (≈ 4,8 bei 60 Hz) |
| Timer-Auflösung | zufällig | gleichverteilt über einen Timer-Schritt | res/√12 |
| Eingabelatenz | systematisch | angenommen gleichverteilt in [0, 10] | 2,9 |
| Displaylatenz | systematisch | ohne Photodiode unbekannt (≈ 5–30) | nicht quantifiziert |

Kombinierte Standardunsicherheit = Wurzel der Quadratsumme der quantifizierten Komponenten;
erweiterte Unsicherheit mit k = 2. Absolutwerte tragen eine unbekannte positive Verzerrung,
Differenzen zwischen Bedingungen auf demselben Aufbau sind deutlich belastbarer.

## 6. Plausibilitätsprüfungen je Lauf

| Prüfung | Kriterium |
|---|---|
| minimum_valid_trials | ≥ 20 gültige Trials |
| anticipation_rate | ≤ 10 % |
| timeout_rate | ≤ 10 % |
| choice_error_rate | ≤ 20 % (nur Wahlaufgabe) |
| plausible_median | 150–600 ms (einfach) bzw. 200–900 ms (Wahl) |
| timing_uncertainty_vs_spread | kombinierte Unsicherheit ≤ 0,25 · SD |

Ergebnis-Hash: SHA-256 über RT-Array, Gültigkeits- und Ausreißermasken.

## 7. Synthetische Daten

Ex-Gauß-Verteilung RT = N(μ, σ) + Exp(τ), Standard μ = 250, σ = 30, τ = 80 ms, plus
Wahlzuschlag, linearer Übungseffekt, Antizipations- und Fehlerrate. Dient dem Vergleich mit
eigenen Daten und dem Test der Auswertung; es sind keine menschlichen Daten.

## 8. Grenzen

- n = 1, keine Kontrolle von Wachheit, Aufmerksamkeit, Hand oder Tastatur.
- Hintergrund-Tabs und Systemlast verlängern Reaktionszeiten.
- Keine Verifikation des Displays mit Photodiode.

## 9. Verifikation (pytest, `tests/test_stats.py`, `tests/test_reaction.py`)

- Deskriptive Statistik gegen handgerechnete Werte für 1…10, inklusive t-KI.
- Simulation reproduziert Mittelwert ≈ μ + τ; Übungssteigung −1 ms/Trial mit p < 0,001.
- Konstruiertes Datenset zählt Antizipation, Timeout, Wahlfehler und einen 1,5-s-Ausreißer korrekt.
- Unsicherheitskomponenten gleich frame/√12 und res/√12.
- Zweimalige Auswertung liefert denselben Hash; Experiment-Rerun ist reproduzierbar.

## 10. Quellen

- Luce R.D. (1986). *Response Times.* Oxford University Press.
- Ratcliff R. (1993). *Methods for dealing with reaction time outliers.* Psychol Bull 114(3):510–532.
- Whelan R. (2008). *Effective analysis of reaction time data.* Psychol Rec 58:475–482.
- Bridges D. et al. (2020). *The timing mega-study.* PeerJ 8:e9414.
- JCGM 100:2008. *Guide to the expression of uncertainty in measurement.*
