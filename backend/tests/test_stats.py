import numpy as np

from medlab.labs.stats import core as st


def test_describe_matches_known_values() -> None:
    x = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0])
    d = st.describe(x, np.random.default_rng(0))
    assert d.n == 10
    assert d.mean == 5.5
    assert d.median == 5.5
    assert np.isclose(d.sd or 0, 3.027650, atol=1e-5)
    assert d.q1 == 3.25 and d.q3 == 7.75 and d.iqr == 4.5
    assert d.min == 1.0 and d.max == 10.0
    # t-based 95 % CI of the mean: 5.5 ± 2.262 * 0.957
    assert np.isclose(d.ci95_mean_low or 0, 3.334, atol=0.01)
    assert np.isclose(d.ci95_mean_high or 0, 7.666, atol=0.01)
    assert (d.ci95_median_low or 0) <= 5.5 <= (d.ci95_median_high or 0)


def test_describe_empty_and_single() -> None:
    assert st.describe(np.array([]), np.random.default_rng(0)).n == 0
    one = st.describe(np.array([3.0]), np.random.default_rng(0))
    assert one.n == 1 and one.mean == 3.0 and one.sd is None


def test_tukey_outliers_flags_far_point() -> None:
    x = np.array([10.0, 11, 12, 11, 10, 12, 11, 50])
    mask = st.tukey_outliers(x)
    assert mask.tolist() == [False] * 7 + [True]


def test_histogram_covers_all_values() -> None:
    x = np.random.default_rng(1).normal(300, 40, 200)
    h = st.histogram(x)
    assert sum(h.counts) == 200
    assert h.rule == "freedman-diaconis"
    assert h.bin_edges[0] <= x.min() and h.bin_edges[-1] >= x.max()


def test_linear_trend_recovers_slope() -> None:
    idx = np.arange(30, dtype=float)
    y = 300 - 2.0 * idx
    t = st.linear_trend(idx, y)
    assert np.isclose(t.slope_per_trial or 0, -2.0)
    assert np.isclose(t.r or 0, -1.0)


def test_compare_two_detects_shift() -> None:
    rng = np.random.default_rng(2)
    a = rng.normal(400, 30, 40)
    b = rng.normal(300, 30, 40)
    c = st.compare_two(a, b, np.random.default_rng(3))
    assert c.welch_p is not None and c.welch_p < 1e-6
    assert c.mann_whitney_p is not None and c.mann_whitney_p < 1e-6
    assert (c.cohens_d or 0) > 2.5
    assert (c.cliffs_delta or 0) > 0.9
    assert (c.ci95_median_diff_low or 0) > 60


def test_compare_two_is_seeded() -> None:
    a = np.array([1.0, 2, 3, 4, 5])
    b = np.array([2.0, 3, 4, 5, 6])
    c1 = st.compare_two(a, b, np.random.default_rng(5))
    c2 = st.compare_two(a, b, np.random.default_rng(5))
    assert c1 == c2


def test_compare_rates_fisher() -> None:
    r = st.compare_rates(8, 10, 1, 10)
    assert r.rate_a == 0.8 and r.rate_b == 0.1
    assert r.fisher_p is not None and r.fisher_p < 0.01
    assert np.isclose(r.risk_difference or 0, 0.7)
