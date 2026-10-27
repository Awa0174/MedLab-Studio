"""Analysis of a reaction-time dataset: validity, descriptive statistics, outliers,
practice trend, uncertainty budget and plausibility checks.

Validity rules
--------------
A trial is valid when it has a reaction time, was not anticipated (RT below the
anticipation threshold), did not time out and, in a choice task, was answered correctly.
Outliers among valid trials are flagged with Tukey fences (1.5 IQR) but kept; both
summaries (with and without outliers) are reported.

Uncertainty budget (GUM-style, in ms)
-------------------------------------
* Stimulus onset quantisation: the stimulus becomes visible at a display refresh, so the
  true onset lies uniformly within one frame after the recorded time.
  Standard uncertainty = frame_interval / sqrt(12).
* Timer resolution: performance.now() is coarsened by browsers (typically 0.1-1 ms,
  up to 100 ms with strict isolation). Uniform, standard = resolution / sqrt(12).
* Input latency: USB/keyboard scan and OS event delivery, typically 1-10 ms. Taken as
  uniform in [0, 10] ms: systematic (adds to every RT) with standard 10 / sqrt(12).
* Display latency (pixel response, scaler): unknown without a photodiode. Listed as an
  unquantified systematic component; the budget states that absolute RTs carry an
  unknown positive bias of roughly 5-30 ms, while differences between conditions
  measured on the same setup cancel it.
"""

from __future__ import annotations

import hashlib
import math
from typing import Any

import numpy as np
from numpy.typing import NDArray

from medlab.labs.reaction.simulate import SIMULATOR_NAME, SIMULATOR_VERSION
from medlab.labs.stats import core as st
from medlab.schemas.common import DataSource, ModelInfo, Parameter, Unit, ValidationCheck
from medlab.schemas.reaction import (
    AnalysedTrial,
    ReactionAnalysisResponse,
    ReactionDataset,
    ReactionTask,
    TrialCounts,
    UncertaintyBudget,
    UncertaintyComponent,
)

ANALYSIS_VERSION = "1.0.0"
MODEL_INFO = ModelInfo(
    name="reaction-time-analysis",
    version=ANALYSIS_VERSION,
    description=(
        "Descriptive and robust statistics of browser-measured reaction times with an "
        "explicit timing-uncertainty budget. Measurement, not simulation."
    ),
)
ALGORITHM_VERSIONS = {
    "analysis": ANALYSIS_VERSION,
    "statistics": st.STATS_VERSION,
    "simulator": SIMULATOR_VERSION,
}

MIN_VALID_TRIALS = 20
MAX_ANTICIPATION_RATE = 0.10
MAX_TIMEOUT_RATE = 0.10
MAX_ERROR_RATE = 0.20
PLAUSIBLE_MEDIAN_MS = {ReactionTask.SIMPLE: (150.0, 600.0), ReactionTask.CHOICE: (200.0, 900.0)}
INPUT_LATENCY_MAX_MS = 10.0


def parameters_from(ds: ReactionDataset) -> list[Parameter]:
    d, t = ds.design, ds.timing
    params = [
        Parameter(name="task", value=d.task.value, unit=Unit.DIMENSIONLESS),
        Parameter(name="n_trials", value=d.n_trials, unit=Unit.DIMENSIONLESS),
        Parameter(name="foreperiod_min", value=d.foreperiod_min_ms, unit=Unit.MILLISECOND),
        Parameter(name="foreperiod_max", value=d.foreperiod_max_ms, unit=Unit.MILLISECOND),
        Parameter(name="timeout", value=d.timeout_ms, unit=Unit.MILLISECOND),
        Parameter(
            name="anticipation_threshold", value=d.anticipation_threshold_ms, unit=Unit.MILLISECOND
        ),
        Parameter(name="seed", value=d.seed, unit=Unit.DIMENSIONLESS),
        Parameter(name="source", value=ds.source, unit=Unit.DIMENSIONLESS),
    ]
    if t.frame_interval_ms is not None:
        params.append(
            Parameter(name="frame_interval", value=t.frame_interval_ms, unit=Unit.MILLISECOND)
        )
    if t.timer_resolution_ms is not None:
        params.append(
            Parameter(name="timer_resolution", value=t.timer_resolution_ms, unit=Unit.MILLISECOND)
        )
    return params


def uncertainty_budget(ds: ReactionDataset) -> UncertaintyBudget:
    t = ds.timing
    comps: list[UncertaintyComponent] = []
    frame = t.frame_interval_ms
    comps.append(
        UncertaintyComponent(
            name="stimulus onset quantisation",
            kind="random",
            standard_ms=round(frame / math.sqrt(12), 3) if frame else None,
            distribution="uniform over one frame interval",
            note="Stimulus appears at the next display refresh after the recorded onset.",
        )
    )
    res = t.timer_resolution_ms
    comps.append(
        UncertaintyComponent(
            name="timer resolution",
            kind="random",
            standard_ms=round(res / math.sqrt(12), 3) if res else None,
            distribution="uniform over one timer step",
            note="performance.now() is coarsened by the browser.",
        )
    )
    comps.append(
        UncertaintyComponent(
            name="input latency",
            kind="systematic",
            standard_ms=round(INPUT_LATENCY_MAX_MS / math.sqrt(12), 3),
            distribution="uniform in [0, 10] ms (assumed)",
            note="Keyboard scan, USB polling and OS event delivery add a positive bias.",
        )
    )
    comps.append(
        UncertaintyComponent(
            name="display latency",
            kind="systematic",
            standard_ms=None,
            distribution="unknown without a photodiode",
            note="Panel response and scaler delay add roughly 5-30 ms; cancels in "
            "within-setup comparisons.",
        )
    )
    quantified = [c.standard_ms for c in comps if c.standard_ms is not None]
    combined = math.sqrt(sum(v * v for v in quantified)) if quantified else None
    return UncertaintyBudget(
        components=comps,
        combined_standard_ms=round(combined, 3) if combined is not None else None,
        expanded_95_ms=round(2 * combined, 3) if combined is not None else None,
        note="Combined standard uncertainty of a single reaction time from the quantified "
        "components (root sum of squares); display latency is not included. Absolute values "
        "carry an unknown positive bias; differences between conditions on the same setup "
        "are far more trustworthy.",
    )


def validate(
    ds: ReactionDataset,
    counts: TrialCounts,
    median: float | None,
    uncert: UncertaintyBudget,
    sd: float | None,
) -> list[ValidationCheck]:
    n = counts.n_total
    checks = [
        ValidationCheck(
            name="minimum_valid_trials",
            passed=counts.n_valid >= MIN_VALID_TRIALS,
            expected=MIN_VALID_TRIALS,
            actual=counts.n_valid,
            note="Fewer valid trials give unstable medians and wide confidence intervals.",
        ),
        ValidationCheck(
            name="anticipation_rate",
            passed=counts.n_anticipated / n <= MAX_ANTICIPATION_RATE,
            expected=MAX_ANTICIPATION_RATE,
            actual=round(counts.n_anticipated / n, 3),
            unit=Unit.DIMENSIONLESS,
            note="Responses faster than the anticipation threshold are guesses, not reactions.",
        ),
        ValidationCheck(
            name="timeout_rate",
            passed=counts.n_timed_out / n <= MAX_TIMEOUT_RATE,
            expected=MAX_TIMEOUT_RATE,
            actual=round(counts.n_timed_out / n, 3),
            unit=Unit.DIMENSIONLESS,
        ),
    ]
    if ds.design.task == ReactionTask.CHOICE:
        answered = n - counts.n_timed_out - counts.n_anticipated
        rate = counts.n_incorrect / answered if answered else 0.0
        checks.append(
            ValidationCheck(
                name="choice_error_rate",
                passed=rate <= MAX_ERROR_RATE,
                expected=MAX_ERROR_RATE,
                actual=round(rate, 3),
                unit=Unit.DIMENSIONLESS,
                note="High error rates indicate a speed-accuracy trade-off towards speed.",
            )
        )
    lo, hi = PLAUSIBLE_MEDIAN_MS[ds.design.task]
    checks.append(
        ValidationCheck(
            name="plausible_median",
            passed=median is not None and lo <= median <= hi,
            expected=f"{lo:.0f}-{hi:.0f}",
            actual=None if median is None else round(median, 1),
            unit=Unit.MILLISECOND,
            note="Typical human medians; outside this range suspect the setup or the task.",
        )
    )
    if uncert.combined_standard_ms is not None and sd is not None and sd > 0:
        ratio = uncert.combined_standard_ms / sd
        checks.append(
            ValidationCheck(
                name="timing_uncertainty_vs_spread",
                passed=ratio <= 0.25,
                expected=0.25,
                actual=round(ratio, 3),
                unit=Unit.DIMENSIONLESS,
                note="Combined timing uncertainty should be small compared with the "
                "between-trial spread, otherwise the browser dominates the measurement.",
            )
        )
    return checks


def result_hash(rts: NDArray[Any], valid: NDArray[Any], outliers: NDArray[Any]) -> str:
    h = hashlib.sha256()
    for arr in (rts, valid, outliers):
        h.update(np.ascontiguousarray(arr).tobytes())
    return h.hexdigest()


def analyse(ds: ReactionDataset) -> ReactionAnalysisResponse:
    d = ds.design
    trials = sorted(ds.trials, key=lambda t: t.index)
    n = len(trials)

    rts = np.array([t.reaction_ms if t.reaction_ms is not None else np.nan for t in trials])
    anticipated = np.array(
        [
            t.anticipated
            or (t.reaction_ms is not None and t.reaction_ms < d.anticipation_threshold_ms)
            for t in trials
        ]
    )
    timed_out = np.array([t.timed_out or t.reaction_ms is None for t in trials])
    incorrect = np.array([(not t.correct) and not t.timed_out for t in trials])
    valid = (
        ~anticipated
        & ~timed_out
        & ~(incorrect if d.task == ReactionTask.CHOICE else np.zeros(n, bool))
    )

    valid_rts = rts[valid]
    outlier_mask = np.zeros(n, dtype=bool)
    if valid_rts.size:
        outlier_mask[np.where(valid)[0]] = st.tukey_outliers(valid_rts)
    clean_rts = rts[valid & ~outlier_mask]

    summary = st.describe(valid_rts, np.random.default_rng([d.seed, 12]))
    summary_clean = st.describe(clean_rts, np.random.default_rng([d.seed, 13]))
    by_condition = {}
    for cond in sorted({t.condition for t in trials}):
        mask = valid & np.array([t.condition == cond for t in trials])
        by_condition[cond] = st.describe(rts[mask], np.random.default_rng([d.seed, 14, len(cond)]))

    idx = np.arange(n, dtype=np.float64)
    trend = st.linear_trend(idx[valid], rts[valid])
    hist = st.histogram(valid_rts)
    uncert = uncertainty_budget(ds)

    counts = TrialCounts(
        n_total=n,
        n_valid=int(valid.sum()),
        n_anticipated=int(anticipated.sum()),
        n_timed_out=int(timed_out.sum()),
        n_incorrect=int(incorrect.sum()),
        n_outliers=int(outlier_mask.sum()),
    )
    return ReactionAnalysisResponse(
        model=MODEL_INFO,
        algorithm_versions=ALGORITHM_VERSIONS,
        parameters=parameters_from(ds),
        data_source=DataSource(
            kind="measured" if ds.source == "measured" else "synthetic",
            name="Browser reaction-time trials" if ds.source == "measured" else f"{SIMULATOR_NAME}",
            description=(
                "Reaction times of the local user, measured in this browser; no identifiers stored."
                if ds.source == "measured"
                else "Synthetic ex-Gaussian reaction times; not human data."
            ),
        ),
        counts=counts,
        summary=summary,
        summary_without_outliers=summary_clean,
        by_condition=by_condition,
        histogram=hist,
        trend=trend,
        trials=[
            AnalysedTrial(**t.model_dump(), valid=bool(valid[i]), outlier=bool(outlier_mask[i]))
            for i, t in enumerate(trials)
        ],
        uncertainty=uncert,
        validation=validate(ds, counts, summary.median, uncert, summary.sd),
        result_hash=result_hash(np.nan_to_num(rts, nan=-1.0), valid, outlier_mask),
    )
