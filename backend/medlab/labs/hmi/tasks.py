"""Seeded task catalogue for the infusion-pump scenario.

The same task set is used for both interface variants; only the order differs per
variant (both orders derived from the seed), so the comparison is within-subject.
"""

from __future__ import annotations

import numpy as np

from medlab.schemas.hmi import HmiTaskKind, HmiTaskSpec

TASKS_VERSION = "1.0.0"

RATE_UNIT = "mL/h"
VTBI_UNIT = "mL"
BOLUS_UNIT = "mg"

RATE_VALUES = [12.5, 0.8, 125.0, 45.0, 2.5, 60.0]
VTBI_VALUES = [500.0, 250.0, 1000.0, 50.0, 100.0]
BOLUS_VALUES = [2.0, 0.5, 5.0, 1.5]
ALARMS = [
    ("occlusion", "Occlusion downstream"),
    ("air_in_line", "Air in line"),
    ("battery_low", "Battery low"),
    ("door_open", "Door open"),
]

RANGES = {
    HmiTaskKind.SET_RATE: (0.1, 999.0),
    HmiTaskKind.SET_VTBI: (1.0, 9999.0),
    HmiTaskKind.SET_BOLUS: (0.1, 50.0),
}


def generate_tasks(seed: int, n: int) -> list[HmiTaskSpec]:
    rng = np.random.default_rng([seed, 21])
    kinds = [
        HmiTaskKind.SET_RATE,
        HmiTaskKind.SET_VTBI,
        HmiTaskKind.SET_BOLUS,
        HmiTaskKind.ACK_ALARM,
    ]
    tasks: list[HmiTaskSpec] = []
    pools = {
        HmiTaskKind.SET_RATE: list(rng.permutation(RATE_VALUES)),
        HmiTaskKind.SET_VTBI: list(rng.permutation(VTBI_VALUES)),
        HmiTaskKind.SET_BOLUS: list(rng.permutation(BOLUS_VALUES)),
    }
    alarm_pool = [ALARMS[i] for i in rng.permutation(len(ALARMS))]
    for i in range(n):
        kind = kinds[i % len(kinds)]
        if kind == HmiTaskKind.ACK_ALARM:
            alarm_id, label = alarm_pool[(i // len(kinds)) % len(alarm_pool)]
            tasks.append(
                HmiTaskSpec(
                    id=f"t{i + 1:02d}",
                    kind=kind,
                    instruction=f"Acknowledge the alarm: {label}",
                    target_field="alarm",
                    alarm_id=alarm_id,
                )
            )
            continue
        pool = pools[kind]
        value = float(pool[(i // len(kinds)) % len(pool)])
        lo, hi = RANGES[kind]
        field = {"set_rate": "rate", "set_vtbi": "vtbi", "set_bolus": "bolus"}[kind.value]
        unit = {"set_rate": RATE_UNIT, "set_vtbi": VTBI_UNIT, "set_bolus": BOLUS_UNIT}[kind.value]
        label = {
            "set_rate": "infusion rate",
            "set_vtbi": "volume to be infused",
            "set_bolus": "bolus dose",
        }[kind.value]
        tasks.append(
            HmiTaskSpec(
                id=f"t{i + 1:02d}",
                kind=kind,
                instruction=f"Set the {label} to {value:g} {unit}",
                target_field=field,
                target_value=value,
                unit=unit,
                tolerance=0.001,
                min_value=lo,
                max_value=hi,
            )
        )
    return tasks
