# ECG Signal Lab – Modellbeschreibung

Version des Modells: `gaussian-wave-sum-ecg` 1.0.0
Algorithmusversionen: Generator 1.0.0 · Rauschen 1.0.0 · Filter 1.0.0 · R-Zacken-Detektor 1.1.0

> Lehr-, Forschungs- und Demonstrationsmodell. Kein Medizinprodukt, keine physiologische
> Validierung, keine Diagnose. Alle Signale sind synthetisch.

## 1. Was wird modelliert

Ein einkanaliges EKG mit Lead-II-ähnlicher Morphologie. Jeder Herzschlag ist die Summe
von fünf Gauß-Wellen (P, Q, R, S, T). Beat-Zeitpunkte folgen einem nominalen RR-Intervall
mit optionalem, geseedetem Jitter.

## 2. Gleichungen

**Beat-Zeitpunkte**

```
t_0      = first_beat_offset_s
t_{k+1}  = t_k + RR_nom · (1 + ε_k),   RR_nom = 60 / HR,   ε_k ~ N(0, σ_RR²),  |ε_k| ≤ 3 σ_RR
```

`σ_RR` ist `rr_variability` (Anteil des RR-Intervalls). Beats werden erzeugt, solange `t_k < T`.

**Wellenform**

```
x(t) = A_R · Σ_k Σ_{w ∈ {P,Q,R,S,T}}  a_w · exp( −(t − t_k − μ_w · s_k)² / (2 · (σ_w · s_k)²) )
s_k  = sqrt(RR_k / RR_ref),   RR_ref = 60/72 s
```

| Welle | a_w (rel. zu R) | μ_w [s] bei RR_ref | σ_w [s] bei RR_ref |
|---|---|---|---|
| P | 0.15 | −0.170 | 0.022 |
| Q | −0.10 | −0.035 | 0.008 |
| R | 1.00 | 0.000 | 0.010 |
| S | −0.25 | 0.030 | 0.009 |
| T | 0.30 | 0.220 | 0.040 |

`RR_k` ist das lokale RR-Intervall des Beats k. Die Skalierung mit `sqrt(RR)` ist an die
Bazett-Korrektur der QT-Zeit angelehnt und wird vereinfachend auf alle Wellen angewendet.

**Störungen** (additiv, alle aus geseedeten Zufallsströmen)

| Komponente | Modell | Parameter |
|---|---|---|
| Weißes Rauschen | n(t) ~ N(0, σ²) | `white_sd_mv` |
| Netzbrumm | A · sin(2π f t + φ), φ ~ U(0, 2π) | `powerline_amplitude_mv`, `powerline_frequency_hz` ∈ {50, 60} |
| Baseline-Wander | A · sin(2π f t + φ) | `baseline_amplitude_mv`, `baseline_frequency_hz` |
| Muskelartefakt | weißes Rauschen → Butterworth-Hochpass 20 Hz (Ordnung 4, zero-phase) → auf RMS skaliert | `muscle_amplitude_mv` |

Die Komponenten werden in fester Reihenfolge gezogen, damit das Einschalten einer
Komponente die Zufallsströme der anderen nicht verändert. RR-Jitter und Rauschen nutzen
getrennte Ströme desselben Seeds (`default_rng([seed, 0])`, `default_rng([seed, 1])`).

**Filterkette** (in der Reihenfolge Notch → Bandpass → gleitender Mittelwert)

| Filter | Implementierung | Hinweise |
|---|---|---|
| Butterworth-Bandpass | `scipy.signal.butter(..., output="sos")` + `sosfiltfilt` | Ordnung 1–10, `high_hz < f_s/2` erzwungen |
| Notch | `scipy.signal.iirnotch(f0, Q)` + `filtfilt` | Bandbreite ≈ f0 / Q |
| Gleitender Mittelwert | zentriertes Rechteckfenster, Ränder gespiegelt | Fenster in ms → Samples |

Alle IIR-Filter laufen vorwärts und rückwärts (zero-phase). Vor dem Filtern wird das
Signal an beiden Rändern gerade (even) um bis zu 3 s verlängert; die
SciPy-Standardverlängerung ist für Grenzfrequenzen um 0,5 Hz viel zu kurz und erzeugt
sonst Einschwingfehler, die sekundenlang in das Signal hineinreichen.

**R-Zacken-Detektion** (Pan & Tompkins, vereinfacht)

1. Bandpass 5–15 Hz (Butterworth Ordnung 2, zero-phase)
2. Ableitung (zentrale Differenzen) → Quadrieren
3. Moving-Window-Integration über 150 ms
4. Adaptive Schwellen: `thr = NPKI + 0.25 · (SPKI − NPKI)`, Aktualisierung mit 0.125/0.875;
   Refraktärzeit `refractory_ms`
5. Search-back: Intervall > 1.66 · mittleres RR → größter Peak über 0.5 · thr wird akzeptiert
6. Verfeinerung: Maximum des 5–15-Hz-Signals im Fenster, dann lokales Maximum des
   analysierten Signals ±20 ms

Herzfrequenz = 60 / mittleres RR der detektierten Zacken.

**Spektrum**: Welch-PSD (`scipy.signal.welch`, Hann, `nperseg = min(N, max(256, 2 f_s))`),
Ausgabe in dB.

## 3. Parameterbereiche und Einheiten

| Parameter | Einheit | Bereich | Standard |
|---|---|---|---|
| heart_rate_bpm | bpm | 30–220 | 72 |
| sampling_rate_hz | Hz | 100–2000 | 500 |
| duration_s | s | 1–60 | 10 |
| rr_variability | 1 (σ/RR) | 0–0.2 | 0.02 |
| r_amplitude_mv | mV | 0.1–5 | 1.0 |
| first_beat_offset_s | s | 0–2 | 0.3 |
| white_sd_mv | mV | 0–2 | 0.05 (UI) |
| powerline_amplitude_mv | mV | 0–2 | 0.2 (UI) |
| baseline_amplitude_mv | mV | 0–3 | 0.3 (UI) |
| baseline_frequency_hz | Hz | 0.05–1 | 0.3 |
| muscle_amplitude_mv | mV | 0–2 | 0 |
| Bandpass low/high/order | Hz / Hz / 1 | >0 / < f_s/2 / 1–10 | 0.5 / 40 / 4 |
| Notch f0 / Q | Hz / 1 | 50 oder 60 / 1–200 | 50 / 30 |
| Moving average window | ms | 1–500 | 20 |
| refractory_ms | ms | 100–600 | 200 |
| seed | 1 | 0–2³¹−1 | 42 |

Backend-Standardwerte (ohne Störungen, ohne Filter) stehen in `medlab/schemas/ecg.py`;
die UI startet mit einem leicht gestörten Signal und Notch + Bandpass, damit der
Filtereffekt sofort sichtbar ist.

## 4. Validierungsprüfungen je Lauf

| Prüfung | Kriterium |
|---|---|
| generated_beat_count | Anzahl erzeugter Beats = ⌊(T − t_0)/RR⌋ + 1 (± 1 bei Jitter) |
| detected_peak_count | detektierte = erzeugte Beats |
| estimated_heart_rate | |HR_est − HR_true_mean| ≤ 1 bpm (HR_true_mean aus den erzeugten RR) |
| peak_timing_error | Median des Abstands detektierter zu wahren R-Zeiten ≤ 10 ms |

Zusätzlich wird ein SHA-256-Hash über alle Ergebnisarrays (volle Genauigkeit) gebildet.
Ein erneuter Lauf mit identischer Konfiguration muss denselben Hash liefern.

## 5. Grenzen

- Keine Physiologie: keine autonome Modulation, keine Atmungskopplung, keine Extrasystolen,
  keine Arrhythmien, keine Morphologievariation zwischen Schlägen.
- Feste, positive Lead-II-Morphologie; der Detektor setzt aufrechte R-Zacken voraus.
- EMG-Artefakt ist stationär; reales EMG ist burstartig.
- Zero-phase-Filterung ist nicht kausal und entspricht nicht einem Echtzeitmonitor.
- Keine T-Wellen-Unterscheidung über die Refraktärzeit hinaus; bei starken Artefakten
  sind Fehldetektionen möglich.
- Bei hohen Herzfrequenzen und niedriger Abtastrate ist die R-Zacke nur wenige Samples
  breit; die Amplitude variiert dann mit der Abtastlage.

## 6. Überprüfung der Implementierung (pytest, `backend/tests/`)

- `test_generator.py`: 72 bpm über 10 s, erster Beat bei 0,3 s → genau 12 Beats; R-Amplitude
  und -Position; Seed-Reproduzierbarkeit.
- `test_noise.py`: Rausch-σ, 50-Hz-Ton (RMS = A/√2), EMG-RMS und Spektralinhalt.
- `test_filters.py`: Notch ≥ 30 dB bei 50 Hz und ≤ 2 % Verlust bei 10 Hz; Bandpass
  ≤ 5 % Verlust bei 10 Hz und ≤ 1 % Durchlass bei 100 Hz; Nullphasigkeit; Determinismus.
- `test_detection.py`: alle Beats bei 40–180 bpm (≤ 4 ms Fehler); unter Rauschen ≤ 10 ms
  Medianfehler.
- `test_pipeline.py`: bitidentische Wiederholung bei gleichem Seed, SNR-Verbesserung ≥ 6 dB,
  Einheiten an allen Parametern, ≥ 20 dB Notch-Effekt im Spektrum.
- `test_experiments.py`: Speichern, Laden, Rerun mit identischem Hash, Löschen.

## 7. Quellen

- McSharry P.E., Clifford G.D., Tarassenko L., Smith L.A. (2003). *A dynamical model for
  generating synthetic electrocardiogram signals.* IEEE Trans Biomed Eng 50(3):289–294.
- Pan J., Tompkins W.J. (1985). *A real-time QRS detection algorithm.* IEEE Trans Biomed
  Eng 32(3):230–236.
- Bazett H.C. (1920). *An analysis of the time-relations of electrocardiograms.* Heart 7:353–370.
- SciPy Reference Guide: `scipy.signal.butter`, `sosfiltfilt`, `iirnotch`, `welch`, `find_peaks`.
