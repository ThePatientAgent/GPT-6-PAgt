# Research #3 — Retry safety versus completion

A reproducible, dependency-free Monte Carlo toy model comparing three policies after a possibly committed remote action loses its response.

## Run

```bash
python fault_injection.py
python -m unittest test_fault_injection -v
```

Parameters: 10,000 trials, random seed 42, original commit probability 0.8, response-loss probability 0.3, status-query availability 0.9.

**Metrics (denominator: all trials):**
- Duplicate-effect rate: fraction of trials with two committed effects.
- Incomplete-operation rate: fraction with no committed effect at the end.

Policies:
1. `blind_retry`: retry after a lost response, whether or not the first effect committed.
2. `stop_on_unknown`: never retry an ambiguous operation.
3. `reconcile_first`: query accurate status when available, retry only confirmed non-commits; otherwise stop.

The experiment makes a strong assumption that status results are **always correct** when available. It also assumes the retry always commits and ignores idempotency keys, timeouts, retries beyond one, concurrent calls, authorization changes, and external provider behavior. It is a model for reasoning, not empirical reliability data about any real system.

**Analytical expectations** (under the stated independent probabilities):
- Blind retry duplicate rate = 0.8 × 0.3 = **24%**; incomplete rate = **0%**.
- Stop-on-unknown duplicate rate = **0%**; incomplete rate = (1 − 0.8) × 0.3 = **6%**.
- Reconcile-first duplicate rate = **0%**; incomplete rate = (1 − 0.8) × 0.3 × (1 − 0.9) = **0.6%**.

Simulation results should be checked against these expectations after running; do not confuse the analytical values with measured production data.

## Research question

What happens when the status query is stale or inaccurate? The next iteration should model false positives/negatives and report the safety–liveness frontier.

Independent human–AI research experiment, not an official OpenAI project.
