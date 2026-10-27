from fastapi.testclient import TestClient

from medlab.labs.reaction.analysis import analyse
from medlab.labs.reaction.simulate import simulate
from medlab.schemas.reaction import ReactionDataset, ReactionSimulationRequest, ReactionTrial


def _dataset(**kwargs):  # type: ignore[no-untyped-def]
    req = ReactionSimulationRequest.model_validate(kwargs)
    return simulate(req)


def test_simulation_is_seeded_and_has_requested_size() -> None:
    a = _dataset(design={"n_trials": 40, "seed": 3})
    b = _dataset(design={"n_trials": 40, "seed": 3})
    c = _dataset(design={"n_trials": 40, "seed": 4})
    assert len(a.trials) == 40
    assert a == b
    assert a != c
    assert a.source == "synthetic"


def test_analysis_recovers_ex_gaussian_location() -> None:
    ds = _dataset(
        design={"n_trials": 400, "seed": 9},
        mu_ms=250,
        sigma_ms=20,
        tau_ms=60,
        anticipation_rate=0,
        practice_slope_ms_per_trial=0,
    )
    r = analyse(ds)
    # ex-Gaussian mean = mu + tau = 310, median somewhat below the mean (right skew)
    assert 295 <= (r.summary.mean or 0) <= 325
    assert (r.summary.median or 0) < (r.summary.mean or 0)
    assert r.counts.n_valid == 400
    assert all(c.passed for c in r.validation), [c for c in r.validation if not c.passed]


def test_analysis_flags_anticipations_timeouts_and_errors() -> None:
    trials = [
        ReactionTrial(
            index=i, condition="left", foreperiod_ms=1500, reaction_ms=300 + i, response="left"
        )
        for i in range(25)
    ]
    trials.append(
        ReactionTrial(
            index=25,
            condition="left",
            foreperiod_ms=1500,
            reaction_ms=40,
            response="left",
            anticipated=True,
        )
    )
    trials.append(
        ReactionTrial(
            index=26,
            condition="right",
            foreperiod_ms=1500,
            reaction_ms=None,
            timed_out=True,
            correct=False,
        )
    )
    trials.append(
        ReactionTrial(
            index=27,
            condition="right",
            foreperiod_ms=1500,
            reaction_ms=350,
            response="left",
            correct=False,
        )
    )
    trials.append(
        ReactionTrial(
            index=28, condition="right", foreperiod_ms=1500, reaction_ms=1500, response="right"
        )
    )
    ds = ReactionDataset.model_validate(
        {"design": {"task": "choice", "n_trials": 29}, "trials": [t.model_dump() for t in trials]}
    )
    r = analyse(ds)
    assert r.counts.n_anticipated == 1
    assert r.counts.n_timed_out == 1
    assert r.counts.n_incorrect == 1
    assert r.counts.n_valid == 26
    assert r.counts.n_outliers == 1  # the 1500 ms trial
    assert r.summary_without_outliers.n == 25
    assert set(r.by_condition) == {"left", "right"}


def test_practice_trend_is_detected() -> None:
    ds = _dataset(
        design={"n_trials": 200, "seed": 1},
        practice_slope_ms_per_trial=-1.0,
        sigma_ms=10,
        tau_ms=20,
    )
    r = analyse(ds)
    assert (r.trend.slope_per_trial or 0) < -0.7
    assert r.trend.p_value is not None and r.trend.p_value < 0.001


def test_uncertainty_budget_uses_browser_timing() -> None:
    ds = _dataset(design={"n_trials": 30})
    ds.timing.frame_interval_ms = 16.667
    ds.timing.timer_resolution_ms = 1.0
    r = analyse(ds)
    comps = {c.name: c for c in r.uncertainty.components}
    assert abs((comps["stimulus onset quantisation"].standard_ms or 0) - 4.811) < 0.01
    assert abs((comps["timer resolution"].standard_ms or 0) - 0.289) < 0.01
    assert comps["display latency"].standard_ms is None
    assert (r.uncertainty.combined_standard_ms or 0) > 5.0


def test_analysis_is_reproducible() -> None:
    ds = _dataset(design={"n_trials": 60, "seed": 8})
    assert analyse(ds).result_hash == analyse(ds).result_hash


def test_reaction_endpoints(client: TestClient) -> None:
    sim = client.post("/api/labs/reaction-time/simulate", json={"design": {"n_trials": 30}})
    assert sim.status_code == 200, sim.text
    dataset = sim.json()
    ana = client.post("/api/labs/reaction-time/analyze", json=dataset)
    assert ana.status_code == 200, ana.text
    body = ana.json()
    assert body["counts"]["n_total"] == 30
    assert body["histogram"]["counts"]
    assert body["data_source"]["kind"] == "synthetic"
    bad = client.post(
        "/api/labs/reaction-time/analyze",
        json={"design": {"foreperiod_min_ms": 3000, "foreperiod_max_ms": 1000}, "trials": []},
    )
    assert bad.status_code == 422


def test_reaction_experiment_roundtrip(client: TestClient) -> None:
    dataset = client.post(
        "/api/labs/reaction-time/simulate", json={"design": {"n_trials": 30, "seed": 5}}
    ).json()
    created = client.post(
        "/api/experiments",
        json={"name": "rt synthetic", "lab_type": "reaction-time", "config": dataset},
    )
    assert created.status_code == 201, created.text
    exp = created.json()
    assert exp["data_sources"][0]["kind"] == "synthetic"
    assert exp["results"]["response"]["counts"]["n_total"] == 30
    rerun = client.post(f"/api/experiments/{exp['id']}/rerun").json()
    assert rerun["reproducible"] is True
    assert client.delete(f"/api/experiments/{exp['id']}").status_code == 204
