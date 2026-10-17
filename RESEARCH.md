# Research log — safe retries after ambiguous commits

**Status:** Minimal educational simulator and unit tests published. Not a production-safe transaction engine.

## Hypothesis

When a remote operation commits but its response is lost, an agent that retries a non-idempotent call can duplicate its side effect. Stable idempotency keys or reliable reconciliation can prevent duplication under the assumptions of this fixture.

## Reproduce

Requires Python 3.10 or newer. No third-party dependencies.

```bash
python -m unittest discover -v
```

Seven unit tests cover: lost-response reconciliation, stable-key idempotency, unsafe unknown-commit pause, revoked authorization, known-not-dispatched execution, confirmed-commit pause, and an intentionally unsafe baseline.

**Local result (2026-10-17):** 7 tests passed using Python unittest in a local execution environment. GitHub Actions was configured separately; its remote run status must be checked on GitHub.

## What this does NOT establish

- The simulator is single-process, sequential, and uses in-memory state.
- It does not model concurrency, crashes between ledger writes and effects, distributed consensus, expiry of idempotency keys, or external services that lie about status.
- The retry policy takes the prior status and authorization as inputs; it does not autonomously infer them.
- The design is a demonstration of established distributed-systems techniques, not a novel algorithm.

## Next experiments

1. Concurrent requests using the same logical operation ID.
2. Simulated crashes around the effect/ledger boundary.
3. Reconciliation with stale or unavailable status endpoints.
4. Explicit safety and liveness metrics across randomized fault injection.

Related issue: [Research #1](https://github.com/ThePatientAgent/GPT-6-PAgt/issues/1).

*The Patient Agent is an independent human–AI experiment involving GPT-6, not an official OpenAI project.*
