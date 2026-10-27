"""Descriptive, robust and comparative statistics.

Everything here is deterministic given the seed (bootstrap resampling uses a seeded
generator), so experiment reruns reproduce identical numbers.

Methods
-------
* Descriptive: mean, SD (ddof=1), SEM, median, MAD (scaled by 1.4826 for normal
  consistency), quartiles and IQR, 5th/95th percentiles, 10 % trimmed mean.
* 95 % CI of the mean: Student t with n-1 degrees of freedom.
* 95 % CI of the median: percentile bootstrap with B resamples.
* Outliers: Tukey fences at Q1 - k*IQR and Q3 + k*IQR (k = 1.5).
* Histogram: Freedman-Diaconis bin width 2*IQR*n^(-1/3) (falls back to Sturges).
* Trend: ordinary least squares of value on trial index (scipy.stats.linregress).
* Two-sample comparison: Welch t-test, Mann-Whitney U, Cohen's d (pooled SD),
  Cliff's delta, bootstrap CI of the median difference.
* Two proportions: Fisher's exact test, risk difference, odds ratio.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from numpy.typing import NDArray
from scipy import stats as sst

from medlab.schemas.stats import (
    ComparisonResult,
    DescriptiveStats,
    Histogram,
    RateComparison,
    TrendResult,
)

STATS_VERSION = "1.0.0"
BOOTSTRAP_B = 2000
MAD_SCALE = 1.4826
TUKEY_K = 1.5


def _f(x: float | np.floating[Any]) -> float:
    v = float(x)
    return v if math.isfinite(v) else float("nan")


def _opt(x: float | None) -> float | None:
    if x is None:
        return None
    return None if not math.isfinite(x) else round(x, 6)


def bootstrap_median_ci(
    x: NDArray[np.float64], rng: np.random.Generator, b: int = BOOTSTRAP_B
) -> tuple[float, float]:
    idx = rng.integers(0, x.size, size=(b, x.size))
    medians = np.median(x[idx], axis=1)
    lo, hi = np.percentile(medians, [2.5, 97.5])
    return float(lo), float(hi)


def describe(values: NDArray[np.float64], rng: np.random.Generator) -> DescriptiveStats:
    x = np.asarray(values, dtype=np.float64)
    x = x[np.isfinite(x)]
    n = int(x.size)
    if n == 0:
        return DescriptiveStats(n=0, **dict.fromkeys(DescriptiveStats.model_fields.keys() - {"n"}))
    mean = _f(np.mean(x))
    sd = _f(np.std(x, ddof=1)) if n > 1 else None
    sem = sd / math.sqrt(n) if sd is not None else None
    q1, med, q3 = (float(v) for v in np.percentile(x, [25, 50, 75]))
    p5, p95 = (float(v) for v in np.percentile(x, [5, 95]))
    mad = _f(MAD_SCALE * np.median(np.abs(x - med)))
    ci_mean: tuple[float | None, float | None] = (None, None)
    if sd is not None and sem is not None and n > 1:
        t = float(sst.t.ppf(0.975, n - 1))
        ci_mean = (mean - t * sem, mean + t * sem)
    ci_med: tuple[float | None, float | None] = (None, None)
    if n >= 5:
        ci_med = bootstrap_median_ci(x, rng)
    return DescriptiveStats(
        n=n,
        mean=_opt(mean),
        sd=_opt(sd),
        sem=_opt(sem),
        median=_opt(med),
        mad=_opt(mad),
        q1=_opt(q1),
        q3=_opt(q3),
        iqr=_opt(q3 - q1),
        p5=_opt(p5),
        p95=_opt(p95),
        min=_opt(float(np.min(x))),
        max=_opt(float(np.max(x))),
        trimmed_mean_10=_opt(float(sst.trim_mean(x, 0.1))) if n >= 3 else _opt(mean),
        ci95_mean_low=_opt(ci_mean[0]),
        ci95_mean_high=_opt(ci_mean[1]),
        ci95_median_low=_opt(ci_med[0]),
        ci95_median_high=_opt(ci_med[1]),
    )


def tukey_outliers(values: NDArray[np.float64], k: float = TUKEY_K) -> NDArray[np.bool_]:
    x = np.asarray(values, dtype=np.float64)
    if x.size < 4:
        return np.zeros(x.size, dtype=bool)
    q1, q3 = np.percentile(x, [25, 75])
    iqr = q3 - q1
    return np.asarray((x < q1 - k * iqr) | (x > q3 + k * iqr), dtype=bool)


def histogram(values: NDArray[np.float64]) -> Histogram:
    x = np.asarray(values, dtype=np.float64)
    x = x[np.isfinite(x)]
    if x.size == 0:
        return Histogram(bin_edges=[], counts=[], bin_width=0.0, rule="none")
    q1, q3 = np.percentile(x, [25, 75])
    iqr = float(q3 - q1)
    span = float(np.max(x) - np.min(x))
    if iqr > 0 and x.size >= 4:
        width = 2.0 * iqr * x.size ** (-1.0 / 3.0)
        rule = "freedman-diaconis"
    else:
        width = span / max(1, int(math.ceil(math.log2(x.size) + 1))) if span > 0 else 1.0
        rule = "sturges"
    width = max(width, 1e-9)
    # Round the width to a "nice" number for readable axes.
    magnitude = 10 ** math.floor(math.log10(width))
    nice = min((m for m in (1, 2, 2.5, 5, 10) if m * magnitude >= width), default=10)
    width = nice * magnitude
    start = math.floor(np.min(x) / width) * width
    stop = math.ceil((np.max(x) + 1e-9) / width) * width
    edges = np.arange(start, stop + width, width)
    if edges.size < 2:
        edges = np.array([start, start + width])
    counts, _ = np.histogram(x, bins=edges)
    return Histogram(
        bin_edges=[round(float(e), 6) for e in edges],
        counts=[int(c) for c in counts],
        bin_width=round(float(width), 6),
        rule=rule,
    )


def linear_trend(index: NDArray[np.float64], values: NDArray[np.float64]) -> TrendResult:
    x = np.asarray(index, dtype=np.float64)
    y = np.asarray(values, dtype=np.float64)
    mask = np.isfinite(y)
    x, y = x[mask], y[mask]
    if x.size < 5 or np.ptp(x) == 0:
        return TrendResult(
            slope_per_trial=None,
            intercept=None,
            r=None,
            p_value=None,
            note="too few points for a trend estimate",
        )
    res = sst.linregress(x, y)
    return TrendResult(
        slope_per_trial=_opt(float(res.slope)),
        intercept=_opt(float(res.intercept)),
        r=_opt(float(res.rvalue)),
        p_value=_opt(float(res.pvalue)),
        note="OLS of value on trial index; negative slope suggests practice, positive fatigue",
    )


def cliffs_delta(a: NDArray[np.float64], b: NDArray[np.float64]) -> float:
    diff = a[:, None] - b[None, :]
    return float((np.sum(diff > 0) - np.sum(diff < 0)) / diff.size)


def cohens_d(a: NDArray[np.float64], b: NDArray[np.float64]) -> float | None:
    if a.size < 2 or b.size < 2:
        return None
    va, vb = np.var(a, ddof=1), np.var(b, ddof=1)
    pooled = math.sqrt(((a.size - 1) * va + (b.size - 1) * vb) / (a.size + b.size - 2))
    if pooled == 0:
        return None
    return float((np.mean(a) - np.mean(b)) / pooled)


def compare_two(
    a_values: NDArray[np.float64], b_values: NDArray[np.float64], rng: np.random.Generator
) -> ComparisonResult:
    a = np.asarray(a_values, dtype=np.float64)
    b = np.asarray(b_values, dtype=np.float64)
    a, b = a[np.isfinite(a)], b[np.isfinite(b)]
    base = {"n_a": int(a.size), "n_b": int(b.size)}
    if a.size < 2 or b.size < 2:
        return ComparisonResult(
            **base,
            mean_diff=None,
            median_diff=None,
            welch_t=None,
            welch_df=None,
            welch_p=None,
            mann_whitney_u=None,
            mann_whitney_p=None,
            cohens_d=None,
            cliffs_delta=None,
            ci95_median_diff_low=None,
            ci95_median_diff_high=None,
            note="at least two observations per group are required",
        )
    welch = sst.ttest_ind(a, b, equal_var=False)
    mw = sst.mannwhitneyu(a, b, alternative="two-sided")
    idx_a = rng.integers(0, a.size, size=(BOOTSTRAP_B, a.size))
    idx_b = rng.integers(0, b.size, size=(BOOTSTRAP_B, b.size))
    diffs = np.median(a[idx_a], axis=1) - np.median(b[idx_b], axis=1)
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    df = getattr(welch, "df", None)
    return ComparisonResult(
        **base,
        mean_diff=_opt(float(np.mean(a) - np.mean(b))),
        median_diff=_opt(float(np.median(a) - np.median(b))),
        welch_t=_opt(float(welch.statistic)),
        welch_df=_opt(float(df)) if df is not None else None,
        welch_p=_opt(float(welch.pvalue)),
        mann_whitney_u=_opt(float(mw.statistic)),
        mann_whitney_p=_opt(float(mw.pvalue)),
        cohens_d=_opt(cohens_d(a, b)),
        cliffs_delta=_opt(cliffs_delta(a, b)),
        ci95_median_diff_low=_opt(float(lo)),
        ci95_median_diff_high=_opt(float(hi)),
        note="A minus B; Welch t (unequal variances), Mann-Whitney U two-sided, "
        "bootstrap CI of the median difference",
    )


def compare_rates(k_a: int, n_a: int, k_b: int, n_b: int) -> RateComparison:
    base = {"k_a": k_a, "n_a": n_a, "k_b": k_b, "n_b": n_b}
    if n_a == 0 or n_b == 0:
        return RateComparison(
            **base,
            rate_a=None,
            rate_b=None,
            risk_difference=None,
            odds_ratio=None,
            fisher_p=None,
            note="empty group",
        )
    table = [[k_a, n_a - k_a], [k_b, n_b - k_b]]
    odds, p = sst.fisher_exact(table)
    rate_a, rate_b = k_a / n_a, k_b / n_b
    return RateComparison(
        **base,
        rate_a=_opt(rate_a),
        rate_b=_opt(rate_b),
        risk_difference=_opt(rate_a - rate_b),
        odds_ratio=_opt(float(odds)) if math.isfinite(float(odds)) else None,
        fisher_p=_opt(float(p)),
        note="A minus B; Fisher's exact test two-sided",
    )
