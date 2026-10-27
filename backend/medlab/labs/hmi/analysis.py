"""A/B analysis of two interface variants on the same task set.

Error taxonomy (applied identically to both variants)
-----------------------------------------------------
* timeout            no submission within the allowed time
* premature_confirm  confirmed without any value / alarm selected
* wrong_field        value entered into a different field than instructed
* wrong_alarm        a different alarm was acknowledged
* out_of_range       value outside the allowed range of the field
* unit_error         value correct in a different unit (e.g. mL/min instead of mL/h)
* decimal_error      value off by a factor of 10 or 100 (misplaced decimal point)
* wrong_value        any other mismatch beyond the tolerance

A task is a success when it has no errors. Each task contributes to the error-rate test
as "has at least one error".

Comparison
----------
Task completion times: Welch t, Mann-Whitney U, effect sizes, bootstrap CI (A minus B).
Error and success rates: Fisher's exact test. With one participant and a fixed variant
order the comparison is a demonstration, not an inference about users in general: the
validation checks make the design limits explicit.
"""

from __future__ import annotations

import hashlib

import numpy as np

from medlab.labs.hmi.tasks import TASKS_VERSION
from medlab.labs.stats import core as st
from medlab.schemas.common import DataSource, ModelInfo, Parameter, Unit, ValidationCheck
from medlab.schemas.hmi import (
    AnalysedTaskResult,
    HmiAnalysisResponse,
    HmiComparison,
    HmiDataset,
    HmiError,
    HmiErrorType,
    HmiTaskKind,
    HmiTaskKindSummary,
    HmiTaskResult,
    HmiTaskSpec,
    HmiVariant,
    HmiVariantSummary,
    TlxRating,
)

ANALYSIS_VERSION = "1.0.0"
MODEL_INFO = ModelInfo(
    name="hmi-ab-analysis",
    version=ANALYSIS_VERSION,
    description=(
        "Within-subject comparison of two interface variants: task times, classified "
        "operating errors, success rates and NASA-TLX style load."
    ),
)
ALGORITHM_VERSIONS = {
    "analysis": ANALYSIS_VERSION,
    "tasks": TASKS_VERSION,
    "statistics": st.STATS_VERSION,
}

UNIT_FACTORS: dict[tuple[str, str], float] = {
    ("mL/h", "mL/min"): 1 / 60,
    ("mL/min", "mL/h"): 60,
    ("mg", "mcg"): 1000,
    ("mcg", "mg"): 1 / 1000,
    ("mL", "L"): 1 / 1000,
    ("L", "mL"): 1000,
}
MIN_TASKS_PER_VARIANT = 3


def _close(a: float, b: float, tol: float) -> bool:
    return abs(a - b) <= max(tol, 1e-9 * max(abs(a), abs(b)))


def classify(task: HmiTaskSpec, r: HmiTaskResult) -> list[HmiError]:
    errors: list[HmiError] = []
    if r.timed_out:
        return [HmiError(type=HmiErrorType.TIMEOUT, detail="no submission before timeout")]
    if task.kind == HmiTaskKind.ACK_ALARM:
        if not r.submitted_alarm:
            return [HmiError(type=HmiErrorType.PREMATURE_CONFIRM, detail="no alarm acknowledged")]
        if r.submitted_alarm != task.alarm_id:
            return [
                HmiError(
                    type=HmiErrorType.WRONG_ALARM,
                    detail=f"acknowledged '{r.submitted_alarm}' instead of '{task.alarm_id}'",
                )
            ]
        return []

    if r.submitted_value is None:
        return [HmiError(type=HmiErrorType.PREMATURE_CONFIRM, detail="confirmed without a value")]
    if r.submitted_field and r.submitted_field != task.target_field:
        errors.append(
            HmiError(
                type=HmiErrorType.WRONG_FIELD,
                detail=f"entered into '{r.submitted_field}' instead of '{task.target_field}'",
            )
        )
    target = task.target_value or 0.0
    value = r.submitted_value
    unit = r.submitted_unit or task.unit or ""
    if task.min_value is not None and task.max_value is not None:
        if value < task.min_value or value > task.max_value:
            errors.append(
                HmiError(
                    type=HmiErrorType.OUT_OF_RANGE,
                    detail=f"{value:g} outside [{task.min_value:g}, {task.max_value:g}]",
                )
            )
    if unit != (task.unit or ""):
        factor = UNIT_FACTORS.get((task.unit or "", unit))
        if factor is not None and _close(value, target * factor, task.tolerance * factor):
            errors.append(
                HmiError(
                    type=HmiErrorType.UNIT_ERROR,
                    detail=f"{value:g} {unit} equals the target in the wrong unit",
                )
            )
            return errors
        errors.append(
            HmiError(
                type=HmiErrorType.UNIT_ERROR,
                detail=f"unit '{unit}' instead of '{task.unit}'",
            )
        )
        if not _close(value, target, task.tolerance):
            errors.append(
                HmiError(type=HmiErrorType.WRONG_VALUE, detail=f"{value:g} instead of {target:g}")
            )
        return errors
    if _close(value, target, task.tolerance):
        return errors
    for factor in (10.0, 100.0, 0.1, 0.01):
        if target > 0 and _close(value, target * factor, task.tolerance * factor):
            errors.append(
                HmiError(
                    type=HmiErrorType.DECIMAL_ERROR,
                    detail=f"{value:g} is the target times {factor:g}",
                )
            )
            return errors
    errors.append(
        HmiError(type=HmiErrorType.WRONG_VALUE, detail=f"{value:g} instead of {target:g}")
    )
    return errors


def tlx_overall(t: TlxRating | None) -> float | None:
    if t is None:
        return None
    return round(
        (t.mental + t.physical + t.temporal + t.performance + t.effort + t.frustration) / 6.0, 3
    )


def parameters_from(ds: HmiDataset) -> list[Parameter]:
    d = ds.design
    return [
        Parameter(name="seed", value=d.seed, unit=Unit.DIMENSIONLESS),
        Parameter(name="tasks_per_variant", value=d.tasks_per_variant, unit=Unit.DIMENSIONLESS),
        Parameter(name="variant_order", value=d.variant_order, unit=Unit.DIMENSIONLESS),
        Parameter(name="timeout", value=d.timeout_ms, unit=Unit.MILLISECOND),
        Parameter(name="n_tasks_total", value=len(ds.results), unit=Unit.DIMENSIONLESS),
    ]


def _summary(
    variant: HmiVariant, rows: list[AnalysedTaskResult], tlx: TlxRating | None, seed: int
) -> HmiVariantSummary:
    times = np.array([r.duration_ms for r in rows], dtype=np.float64)
    by_type: dict[str, int] = {}
    for r in rows:
        for e in r.errors:
            by_type[e.type.value] = by_type.get(e.type.value, 0) + 1
    n = len(rows)
    n_success = sum(1 for r in rows if r.success)
    return HmiVariantSummary(
        variant=variant,
        n_tasks=n,
        n_success=n_success,
        success_rate=round(n_success / n, 4) if n else None,
        time=st.describe(times, np.random.default_rng([seed, 31, ord(variant.value)])),
        errors_total=sum(by_type.values()),
        errors_by_type=dict(sorted(by_type.items())),
        interactions_mean=round(float(np.mean([r.interactions for r in rows])), 3) if n else None,
        tlx=tlx,
        tlx_overall=tlx_overall(tlx),
    )


def validate(ds: HmiDataset, a: HmiVariantSummary, b: HmiVariantSummary) -> list[ValidationCheck]:
    checks = [
        ValidationCheck(
            name="both_variants_present",
            passed=a.n_tasks > 0 and b.n_tasks > 0,
            expected="A and B",
            actual=f"A={a.n_tasks}, B={b.n_tasks}",
        ),
        ValidationCheck(
            name="balanced_task_count",
            passed=a.n_tasks == b.n_tasks,
            expected=a.n_tasks,
            actual=b.n_tasks,
            note="Both variants must see the same task set for a fair comparison.",
        ),
        ValidationCheck(
            name="minimum_tasks_per_variant",
            passed=min(a.n_tasks, b.n_tasks) >= MIN_TASKS_PER_VARIANT,
            expected=MIN_TASKS_PER_VARIANT,
            actual=min(a.n_tasks, b.n_tasks),
        ),
        ValidationCheck(
            name="no_timeouts",
            passed=all(not r.timed_out for r in ds.results),
            expected=0,
            actual=sum(1 for r in ds.results if r.timed_out),
        ),
        ValidationCheck(
            name="tlx_complete",
            passed=a.tlx is not None and b.tlx is not None,
            expected="A and B rated",
            actual=f"A={'yes' if a.tlx else 'no'}, B={'yes' if b.tlx else 'no'}",
            note="Subjective load is only comparable when both variants were rated.",
        ),
        ValidationCheck(
            name="single_participant_design",
            passed=True,
            expected="n = 1, fixed order",
            actual=f"order {ds.design.variant_order}",
            note="One participant and one variant order: differences include learning and "
            "order effects. Counterbalance (repeat with the other order) before drawing "
            "conclusions about users in general.",
        ),
    ]
    return checks


def result_hash(rows: list[AnalysedTaskResult]) -> str:
    h = hashlib.sha256()
    for r in rows:
        h.update(
            f"{r.task_id}|{r.variant}|{r.duration_ms:.6f}|{int(r.success)}|"
            f"{','.join(e.type.value for e in r.errors)}".encode()
        )
    return h.hexdigest()


def analyse(ds: HmiDataset) -> HmiAnalysisResponse:
    tasks = {t.id: t for t in ds.design.tasks}
    rows: list[AnalysedTaskResult] = []
    for r in sorted(ds.results, key=lambda x: (x.variant.value, x.order_index)):
        task = tasks.get(r.task_id)
        if task is None:
            errors = [HmiError(type=HmiErrorType.WRONG_FIELD, detail=f"unknown task '{r.task_id}'")]
            kind = HmiTaskKind.SET_RATE
        else:
            errors = classify(task, r)
            kind = task.kind
        rows.append(
            AnalysedTaskResult(**r.model_dump(), kind=kind, success=len(errors) == 0, errors=errors)
        )

    seed = ds.design.seed
    rows_a = [r for r in rows if r.variant == HmiVariant.A]
    rows_b = [r for r in rows if r.variant == HmiVariant.B]
    summary_a = _summary(HmiVariant.A, rows_a, ds.tlx.get(HmiVariant.A), seed)
    summary_b = _summary(HmiVariant.B, rows_b, ds.tlx.get(HmiVariant.B), seed)

    times_a = np.array([r.duration_ms for r in rows_a])
    times_b = np.array([r.duration_ms for r in rows_b])
    comparison = HmiComparison(
        time=st.compare_two(times_a, times_b, np.random.default_rng([seed, 41])),
        errors=st.compare_rates(
            sum(1 for r in rows_a if r.errors),
            len(rows_a),
            sum(1 for r in rows_b if r.errors),
            len(rows_b),
        ),
        success=st.compare_rates(
            summary_a.n_success, len(rows_a), summary_b.n_success, len(rows_b)
        ),
    )

    by_kind: list[HmiTaskKindSummary] = []
    for kind in HmiTaskKind:
        ka = [r for r in rows_a if r.kind == kind]
        kb = [r for r in rows_b if r.kind == kind]
        if not ka and not kb:
            continue
        by_kind.append(
            HmiTaskKindSummary(
                kind=kind,
                n_a=len(ka),
                n_b=len(kb),
                median_time_a_ms=round(float(np.median([r.duration_ms for r in ka])), 3)
                if ka
                else None,
                median_time_b_ms=round(float(np.median([r.duration_ms for r in kb])), 3)
                if kb
                else None,
                errors_a=sum(len(r.errors) for r in ka),
                errors_b=sum(len(r.errors) for r in kb),
            )
        )

    return HmiAnalysisResponse(
        model=MODEL_INFO,
        algorithm_versions=ALGORITHM_VERSIONS,
        parameters=parameters_from(ds),
        data_source=DataSource(
            kind="measured",
            name="Browser HMI task log",
            description="Task times, entries and ratings of the local user; no identifiers stored.",
        ),
        variants={HmiVariant.A: summary_a, HmiVariant.B: summary_b},
        comparison=comparison,
        by_kind=by_kind,
        results=rows,
        validation=validate(ds, summary_a, summary_b),
        result_hash=result_hash(rows),
    )
