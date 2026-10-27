import numpy as np
from fastapi.testclient import TestClient

from medlab.config import settings

PAYLOAD = {
    "name": "Noisy 72 bpm with notch + bandpass",
    "lab_type": "ecg",
    "description": "test",
    "config": {
        "seed": 3,
        "noise": {"white_sd_mv": 0.1, "powerline_amplitude_mv": 0.3},
        "filters": [{"type": "notch"}, {"type": "bandpass"}],
    },
}


def test_create_list_get_rerun_delete(client: TestClient) -> None:
    created = client.post("/api/experiments", json=PAYLOAD)
    assert created.status_code == 201, created.text
    exp = created.json()
    exp_id = exp["id"]
    assert exp["status"] == "completed"
    assert exp["seed"] == 3
    assert exp["model"]["version"]
    assert {p["name"]: p["unit"] for p in exp["parameters"]}["heart_rate"] == "bpm"
    assert exp["results"]["response"]["result_hash"] == exp["result_hash"]
    assert len(exp["results"]["response"]["filtered_mv"]) == 5000

    # arrays are stored on disk, not in SQLite
    exp_dir = settings.experiments_dir / exp_id
    assert (exp_dir / "filtered_mv.npy").exists()
    assert np.load(exp_dir / "filtered_mv.npy").shape == (5000,)

    listed = client.get("/api/experiments").json()
    assert any(e["id"] == exp_id for e in listed)
    assert "results" not in listed[0]

    loaded = client.get(f"/api/experiments/{exp_id}").json()
    assert loaded["config"] == PAYLOAD["config"]
    assert loaded["results"]["response"]["filtered_mv"] == exp["results"]["response"]["filtered_mv"]

    rerun = client.post(f"/api/experiments/{exp_id}/rerun").json()
    assert rerun["reproducible"] is True
    assert rerun["previous_hash"] == rerun["new_hash"] == exp["result_hash"]

    assert client.delete(f"/api/experiments/{exp_id}").status_code == 204
    assert client.get(f"/api/experiments/{exp_id}").status_code == 404
    assert not exp_dir.exists()


def test_planned_lab_cannot_run(client: TestClient) -> None:
    r = client.post("/api/experiments", json={**PAYLOAD, "lab_type": "imaging"})
    assert r.status_code == 400


def test_invalid_config_is_422(client: TestClient) -> None:
    bad = {**PAYLOAD, "config": {"signal": {"heart_rate_bpm": 5}}}
    assert client.post("/api/experiments", json=bad).status_code == 422
