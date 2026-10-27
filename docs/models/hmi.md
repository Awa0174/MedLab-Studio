# Human-Machine Interaction Lab – Methodenbeschreibung

Modell: `hmi-ab-analysis` 1.0.0 · Aufgabenkatalog 1.0.0 · Statistik 1.0.0

> Simulierte Infusionspumpen-Oberfläche im Browser. Kein reales Gerät, keine klinische
> Bewertung. Gespeichert werden Aufgabenzeiten, Eingaben und Bewertungen der lokalen Person,
> keine Identifikatoren.

## 1. Versuchsaufbau

Within-Subject-Vergleich zweier Oberflächenvarianten auf demselben, geseedeten Aufgabensatz:

| | Variante A · klassisches Formular | Variante B · geführte Eingabe |
|---|---|---|
| Felder | Rate, VTBI, Bolus gleichzeitig | ein Feld pro Aufgabe |
| Eingabe | Freitext | Bildschirm-Tastenfeld |
| Einheit | Auswahlfeld, behält letzte Einstellung | fest und groß angezeigt |
| Dezimaltrennzeichen | Komma wird verworfen („12,5“ → 125) | Komma = Punkt |
| Bereich | nicht angezeigt, nicht geprüft | angezeigt, außerhalb blockiert |
| Bestätigung | „Apply“ ohne Rückfrage, auch leer | Wert wird vor Übernahme wiederholt |
| Alarme | nummerierte Tasten, Name klein | Banner mit Namen, „Acknowledge …“ |

Aufgabenarten im Wechsel: `set_rate` (mL/h), `set_vtbi` (mL), `set_bolus` (mg), `ack_alarm`.
Werte und Alarme stammen aus dem Backend-Katalog (`labs/hmi/tasks.py`), Reihenfolge je
Variante aus dem Seed (Frontend, mulberry32). Nach jedem Variantenblock ein NASA-TLX-artiges
Rating mit sechs Skalen 0–100.

## 2. Messgrößen je Aufgabe

Dauer vom Anzeigen der Aufgabe bis zur Übernahme (`performance.now()`), Anzahl Interaktionen,
übermitteltes Feld, Wert, Einheit, Rohtext bzw. quittierter Alarm, Timeout-Flag.

## 3. Fehlertaxonomie (Backend, identisch für beide Varianten)

| Typ | Kriterium |
|---|---|
| timeout | keine Übernahme innerhalb `timeout_ms` |
| premature_confirm | Übernahme ohne Wert bzw. ohne Alarm |
| wrong_field | anderes Feld als angewiesen |
| wrong_alarm | anderer Alarm quittiert |
| out_of_range | Wert außerhalb des Feldbereichs |
| unit_error | andere Einheit; „im falschen Einheitensystem korrekt“ wird erkannt (mL/h ↔ mL/min, mg ↔ mcg, mL ↔ L) |
| decimal_error | Wert = Ziel × 10, 100, 0,1 oder 0,01 |
| wrong_value | sonstige Abweichung über Toleranz |

Eine Aufgabe ist erfolgreich, wenn keine Fehler vorliegen.

## 4. Vergleichsstatistik

| Größe | Methode |
|---|---|
| Aufgabenzeit | Median/MAD je Variante; Welch-t, Mann-Whitney-U (zweiseitig); Cohen’s d, Cliff’s δ; Bootstrap-KI der Mediandifferenz (B = 2000, geseedet) |
| Fehler- und Erfolgsrate | Fisher-exakt, Risikodifferenz, Odds Ratio |
| Belastung | TLX-Gesamtwert = ungewichteter Mittelwert der sechs Skalen |

Richtung: A minus B.

## 5. Validierungsprüfungen

| Prüfung | Kriterium |
|---|---|
| both_variants_present | beide Varianten enthalten Aufgaben |
| balanced_task_count | gleiche Aufgabenzahl je Variante |
| minimum_tasks_per_variant | ≥ 3 |
| no_timeouts | keine Timeouts |
| tlx_complete | beide Varianten bewertet |
| single_participant_design | immer „bestanden“, dokumentiert n = 1 und feste Reihenfolge |

Ergebnis-Hash: SHA-256 über Aufgaben-ID, Variante, Dauer, Erfolg und Fehlertypen.

## 6. Grenzen

- Eine Person, eine Reihenfolge: Lern- und Reihenfolgeeffekte sind mit der Variante
  konfundiert. Gegenbalancierung durch Wiederholung mit Reihenfolge BA.
- Kurze, künstliche Aufgaben ohne Unterbrechungen, Handschuhe, Alarmdruck oder Training.
- Lesezeit der Anweisung ist in der Aufgabenzeit enthalten.
- p-Werte beschreiben nur diese Sitzung.

## 7. Verifikation (pytest, `tests/test_hmi.py`)

- Klassifikation getestet für korrekt, Dezimalfehler, Einheitenfehler mit äquivalentem Wert,
  falsches Feld + Bereich, vorzeitige Übernahme, Timeout, Alarm richtig/falsch.
- Konstruiertes Datenset mit langsamer, fehlerbehafteter Variante A liefert erwartete
  Zusammenfassungen, Mediandifferenz > 3 s und `tlx_complete = false` bei fehlender B-Bewertung.
- Aufgabenkatalog und Ablaufplan sind seed-reproduzierbar; Experiment-Rerun liefert
  denselben Hash.

## 8. Quellen

- Hart S.G., Staveland L.E. (1988). *Development of NASA-TLX.* Adv Psychol 52:139–183.
- IEC 62366-1:2015. *Application of usability engineering to medical devices.*
- ISMP (2009). *Proceedings from the ISMP summit on the use of smart infusion pumps.*
- Reason J. (1990). *Human Error.* Cambridge University Press.
