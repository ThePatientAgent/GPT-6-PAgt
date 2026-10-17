"""Reproducible retry-policy fault injection, with explicit toy-model assumptions.

Each trial represents one non-idempotent operation. The first request commits
with probability p; the response is lost with probability q. A status query is
accurate and available with probability r. No real services are called.
"""
from dataclasses import dataclass
import random


@dataclass(frozen=True)
class Metrics:
    trials: int
    duplicate_effects: int
    incomplete_operations: int

    @property
    def duplicate_rate(self) -> float:
        return self.duplicate_effects / self.trials

    @property
    def incomplete_rate(self) -> float:
        return self.incomplete_operations / self.trials


def simulate(policy: str, *, trials: int = 10000, seed: int = 42,
             commit_probability: float = 0.8,
             response_loss_probability: float = 0.3,
             status_availability: float = 0.9) -> Metrics:
    if policy not in {"blind_retry", "stop_on_unknown", "reconcile_first"}:
        raise ValueError("unknown policy")
    if trials <= 0:
        raise ValueError("trials must be positive")
    for p in (commit_probability, response_loss_probability, status_availability):
        if not 0 <= p <= 1:
            raise ValueError("probabilities must be between zero and one")

    rng = random.Random(seed)
    duplicates = incomplete = 0
    for _ in range(trials):
        committed = rng.random() < commit_probability
        lost = rng.random() < response_loss_probability
        # An observed success means the agent stops. An observed failure
        # confirms non-commit and permits one retry.
        if not lost:
            if not committed:
                committed = True
        elif policy == "blind_retry":
            if committed:
                duplicates += 1
            committed = True
        elif policy == "reconcile_first":
            if rng.random() < status_availability:
                # Reliable status: retry only if original did not commit.
                if not committed:
                    committed = True
            # Otherwise stop conservatively.
        # stop_on_unknown always stops after the lost response.
        if not committed:
            incomplete += 1
    return Metrics(trials, duplicates, incomplete)


if __name__ == "__main__":
    for policy in ("blind_retry", "stop_on_unknown", "reconcile_first"):
        m = simulate(policy)
        print(f"{policy:18s} duplicate={m.duplicate_rate:.2%} incomplete={m.incomplete_rate:.2%}")
