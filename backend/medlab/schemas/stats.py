"""Statistics result schemas shared by the Reaction Time and HMI labs."""

from __future__ import annotations

from pydantic import BaseModel


class DescriptiveStats(BaseModel):
    n: int
    mean: float | None
    sd: float | None
    sem: float | None
    median: float | None
    mad: float | None
    q1: float | None
    q3: float | None
    iqr: float | None
    p5: float | None
    p95: float | None
    min: float | None
    max: float | None
    trimmed_mean_10: float | None
    ci95_mean_low: float | None
    ci95_mean_high: float | None
    ci95_median_low: float | None
    ci95_median_high: float | None


class Histogram(BaseModel):
    bin_edges: list[float]
    counts: list[int]
    bin_width: float
    rule: str


class TrendResult(BaseModel):
    """Linear trend of a value over trial index (practice or fatigue effect)."""

    slope_per_trial: float | None
    intercept: float | None
    r: float | None
    p_value: float | None
    note: str


class ComparisonResult(BaseModel):
    """Two independent samples compared with parametric and non-parametric tests."""

    n_a: int
    n_b: int
    mean_diff: float | None
    median_diff: float | None
    welch_t: float | None
    welch_df: float | None
    welch_p: float | None
    mann_whitney_u: float | None
    mann_whitney_p: float | None
    cohens_d: float | None
    cliffs_delta: float | None
    ci95_median_diff_low: float | None
    ci95_median_diff_high: float | None
    note: str


class RateComparison(BaseModel):
    """Two proportions (e.g. error rates) compared with Fisher's exact test."""

    k_a: int
    n_a: int
    k_b: int
    n_b: int
    rate_a: float | None
    rate_b: float | None
    risk_difference: float | None
    odds_ratio: float | None
    fisher_p: float | None
    note: str
