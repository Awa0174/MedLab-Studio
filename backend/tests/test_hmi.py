from fastapi.testclient import TestClient

from medlab.labs.hmi.analysis import analyse, classify
from medlab.labs.hmi.tasks import generate_tasks
from medlab.schemas.hmi import HmiDataset, HmiErrorType, HmiTaskKind, HmiTaskResult, HmiTaskSpec


def test_task_catalogue_is_seeded_and_mixed() -> None:
    a = generate_tasks(1, 8)
    b = generate_tasks(1, 8)
    c = generate_tasks(2, 8)
    assert a == b and a != c
    assert len(a) == 8
    assert {t.kind for t in a} == set(HmiTaskKind)
    assert all(t.id.startswith("t") for t in a)


RATE = HmiTaskSpec(
    id="t01",
    kind=HmiTaskKind.SET_RATE,
    instruction="Set the infusion rate to 12.5 mL/h",
    target_field="rate",
    target_value=12.5,
    unit="mL/h",
    min_value=0.1,
    max_value=999,
)
ALARM = HmiTaskSpec(
    id="t04",
    kind=HmiTaskKind.ACK_ALARM,
    instruction="Ack",
    target_field="alarm",
    alarm_id="occlusion",
)


def _res(**kwargs):  # type: ignore[no-untyped-def]
    base = {"task_id": "t01", "variant": "A", "order_index": 0, "duration_ms": 5000}
    return HmiTaskResult.model_validate({**base, **kwargs})


def test_classify_correct_entry_has_no_errors() -> None:
    assert (
        classify(RATE, _res(submitted_field="rate", submitted_value=12.5, submitted_unit="mL/h"))
        == []
    )


def test_classify_decimal_error() -> None:
    errs = classify(
        RATE, _res(submitted_field="rate", submitted_value=125.0, submitted_unit="mL/h")
    )
    assert [e.type for e in errs] == [HmiErrorType.DECIMAL_ERROR]


def test_classify_unit_error_with_equivalent_value() -> None:
    # 12.5 mL/h = 0.2083 mL/min
    errs = classify(
        RATE, _res(submitted_field="rate", submitted_value=12.5 / 60, submitted_unit="mL/min")
    )
    assert [e.type for e in errs] == [HmiErrorType.UNIT_ERROR]


def test_classify_wrong_field_and_out_of_range() -> None:
    errs = classify(
        RATE, _res(submitted_field="vtbi", submitted_value=5000.0, submitted_unit="mL/h")
    )
    types = {e.type for e in errs}
    assert HmiErrorType.WRONG_FIELD in types
    assert HmiErrorType.OUT_OF_RANGE in types


def test_classify_premature_timeout_and_alarm() -> None:
    assert classify(RATE, _res(submitted_value=None))[0].type == HmiErrorType.PREMATURE_CONFIRM
    assert classify(RATE, _res(timed_out=True))[0].type == HmiErrorType.TIMEOUT
    assert classify(ALARM, _res(task_id="t04", submitted_alarm="occlusion")) == []
    assert (
        classify(ALARM, _res(task_id="t04", submitted_alarm="door_open"))[0].type
        == HmiErrorType.WRONG_ALARM
    )


def _dataset() -> HmiDataset:
    tasks = generate_tasks(3, 4)
    results = []
    for variant, slow, err in (("A", 9000.0, True), ("B", 5000.0, False)):
        for i, t in enumerate(tasks):
            if t.kind == HmiTaskKind.ACK_ALARM:
                results.append(
                    {
                        "task_id": t.id,
                        "variant": variant,
                        "order_index": i,
                        "duration_ms": slow + i * 100,
                        "submitted_alarm": t.alarm_id,
                    }
                )
            else:
                value = (t.target_value or 0) * (10 if err and i == 0 else 1)
                results.append(
                    {
                        "task_id": t.id,
                        "variant": variant,
                        "order_index": i,
                        "duration_ms": slow + i * 100,
                        "submitted_field": t.target_field,
                        "submitted_value": value,
                        "submitted_unit": t.unit,
                        "interactions": 3,
                    }
                )
    return HmiDataset.model_validate(
        {
            "design": {"seed": 3, "tasks_per_variant": 4, "tasks": [t.model_dump() for t in tasks]},
            "results": results,
            "tlx": {
                "A": {
                    "mental": 70,
                    "physical": 10,
                    "temporal": 50,
                    "performance": 40,
                    "effort": 60,
                    "frustration": 65,
                },
                "B": None,
            },
        }
    )


def test_analysis_compares_variants() -> None:
    r = analyse(_dataset())
    a, b = r.variants["A"], r.variants["B"]
    assert a.n_tasks == b.n_tasks == 4
    assert a.errors_total >= 1 and b.errors_total == 0
    assert a.errors_by_type.get("decimal_error") == 1
    assert a.success_rate == 0.75 and b.success_rate == 1.0
    assert (r.comparison.time.median_diff or 0) > 3000
    assert a.tlx_overall is not None and b.tlx_overall is None
    names = {c.name: c.passed for c in r.validation}
    assert names["balanced_task_count"] and names["no_timeouts"]
    assert names["tlx_complete"] is False
    assert len(r.by_kind) == 4
    assert analyse(_dataset()).result_hash == r.result_hash


def test_hmi_endpoints_and_experiment(client: TestClient) -> None:
    tasks = client.get("/api/labs/hmi/tasks?seed=3&n=4")
    assert tasks.status_code == 200 and len(tasks.json()) == 4
    ds = _dataset().model_dump(mode="json")
    ana = client.post("/api/labs/hmi/analyze", json=ds)
    assert ana.status_code == 200, ana.text
    created = client.post("/api/experiments", json={"name": "hmi", "lab_type": "hmi", "config": ds})
    assert created.status_code == 201, created.text
    exp = created.json()
    assert exp["results"]["response"]["variants"]["A"]["n_tasks"] == 4
    assert client.post(f"/api/experiments/{exp['id']}/rerun").json()["reproducible"] is True
    assert client.delete(f"/api/experiments/{exp['id']}").status_code == 204
