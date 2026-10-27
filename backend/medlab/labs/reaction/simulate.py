"""Synthetic reaction-time datasets.

Model: ex-Gaussian reaction times RT = N(mu, sigma) + Exp(tau), the standard descriptive
model for right-skewed RT distributions (Luce 1986; Ratcliff 1993). A choice task adds a
fixed penalty. A linear practice slope is applied over trial index. Anticipations are
drawn uniformly below the anticipation threshold; choice errors flip the response side.
Foreperiods are uniform in [min, max]. Everything comes from one seeded generator.
"""

from __future__ import annotations

import numpy as np

from medlab.schemas.reaction import (
    ReactionDataset,
    ReactionSimulationRequest,
    ReactionTask,
    ReactionTrial,
    TimingInfo,
)

SIMULATOR_VERSION = "1.0.0"
SIMULATOR_NAME = "ex-gaussian-reaction-time"


def simulate(req: ReactionSimulationRequest) -> ReactionDataset:
    d = req.design
    rng = np.random.default_rng([d.seed, 7])
    n = d.n_trials
    choice = d.task == ReactionTask.CHOICE

    foreperiods = rng.uniform(d.foreperiod_min_ms, d.foreperiod_max_ms, n)
    sides = rng.choice(["left", "right"], size=n) if choice else np.array(["simple"] * n)
    gauss = rng.normal(req.mu_ms, req.sigma_ms, n)
    expo = rng.exponential(req.tau_ms, n)
    rts = gauss + expo + (req.choice_penalty_ms if choice else 0.0)
    rts += req.practice_slope_ms_per_trial * np.arange(n)
    rts = np.maximum(rts, d.anticipation_threshold_ms + 1.0)

    anticipate = rng.uniform(size=n) < req.anticipation_rate
    errors = (rng.uniform(size=n) < req.error_rate) if choice else np.zeros(n, dtype=bool)

    trials: list[ReactionTrial] = []
    for i in range(n):
        side = str(sides[i])
        if anticipate[i]:
            rt = float(rng.uniform(0.0, d.anticipation_threshold_ms))
            trials.append(
                ReactionTrial(
                    index=i,
                    condition=side,
                    foreperiod_ms=round(float(foreperiods[i]), 3),
                    reaction_ms=round(rt, 3),
                    response=side if choice else "space",
                    correct=not choice or True,
                    anticipated=True,
                )
            )
            continue
        rt = float(rts[i])
        if rt >= d.timeout_ms:
            trials.append(
                ReactionTrial(
                    index=i,
                    condition=side,
                    foreperiod_ms=round(float(foreperiods[i]), 3),
                    reaction_ms=None,
                    response=None,
                    correct=False,
                    timed_out=True,
                )
            )
            continue
        response = side
        if choice and errors[i]:
            response = "right" if side == "left" else "left"
        trials.append(
            ReactionTrial(
                index=i,
                condition=side,
                foreperiod_ms=round(float(foreperiods[i]), 3),
                reaction_ms=round(rt, 3),
                response=response if choice else "space",
                correct=(response == side) if choice else True,
            )
        )

    return ReactionDataset(
        design=d,
        timing=TimingInfo(
            frame_interval_ms=16.667,
            refresh_rate_hz=60.0,
            timer_resolution_ms=0.1,
            user_agent="synthetic",
            method=f"{SIMULATOR_NAME} v{SIMULATOR_VERSION}; no browser timing involved",
        ),
        trials=trials,
        source="synthetic",
    )
