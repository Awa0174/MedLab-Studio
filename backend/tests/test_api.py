from fastapi.testclient import TestClient


def test_health_carries_disclaimer(client: TestClient) -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "not a medical device" in body["disclaimer"]


def test_labs_lists_ten_labs_with_ecg_available(client: TestClient) -> None:
    labs = client.get("/api/labs").json()
    assert len(labs) == 10
    assert [lab["number"] for lab in labs] == list(range(1, 11))
    ecg = next(lab for lab in labs if lab["id"] == "ecg")
    assert ecg["status"] == "available"
    assert client.get("/api/labs/nope").status_code == 404


def test_simulate_endpoint(client: TestClient) -> None:
    r = client.post("/api/labs/ecg/simulate", json={"signal": {"heart_rate_bpm": 60}})
    assert r.status_code == 200
    body = r.json()
    assert len(body["true_r_times_s"]) == 10
    assert body["r_peaks"]["estimated_hr_bpm"] is not None
    assert body["model"]["name"] == "gaussian-wave-sum-ecg"


def test_simulate_rejects_bad_filter(client: TestClient) -> None:
    r = client.post(
        "/api/labs/ecg/simulate",
        json={"filters": [{"type": "bandpass", "low_hz": 0.5, "high_hz": 400}]},
    )
    assert r.status_code == 422
    r = client.post("/api/labs/ecg/simulate", json={"signal": {"heart_rate_bpm": 500}})
    assert r.status_code == 422
