# Research log — safe retries after ambiguous commits

**Status:** Three educational simulators and 13 unit-test cases published. These are not production-safe transaction engines or a novel algorithm.

## Research question

When a remote effect may have committed but the response was lost, how should an agent decide whether to retry, reconcile, or stop? This requires distinguishing authorization, observed progress, and the actual commit status.

## Reproduce

Python 3.10+, standard library only:

```bash
python -m unittest discover -v
```

The GitHub Actions workflow is configured for Python 3.10, 3.12, and 3.13. **Do not assume the remote workflow passed without checking [Actions](../../actions).**

## Experiment 1: ambiguous response (7 test cases)

Files: [safe_retry.py](safe_retry.py), [test_safe_retry.py](test_safe_retry.py).

Simulates commit-then-lost-response, reconciliation, stable idempotency keys, denied authorization, and an intentionally unsafe non-idempotent retry. The service uses an in-memory ledger and sequential execution.

## Experiment 2: concurrent requests (3 test cases)

Files: [concurrency_experiment.py](concurrency_experiment.py), [test_concurrency_experiment.py](test_concurrency_experiment.py).

A barrier makes two threads pass the same check before either writes; both effects occur. A single-process lock makes the check and write critical section atomic **within that process**. This does not imply safety across machines.

## Experiment 3: crash window (3 test cases)

Files: [crash_experiment.py](crash_experiment.py), [test_crash_experiment.py](test_crash_experiment.py).

A split ledger/effect model crashes after the effect but before recording its operation ID; retry duplicates the effect. A **conceptual** atomic-commit model avoids this within the simplified fixture. It does not implement durable storage or prove atomicity across an external API and database.

## Critical limitations

- No durable database, network partition, distributed lock, multi-host execution, or transactional outbox.
- No systematic randomized fault injection or performance measurement.
- The concurrency fixture is deliberately deterministic, not a stress benchmark.
- The crash fixture **assumes** atomicity in its second model; it does not implement or verify a real transaction.
- No guarantee that external side effects can be reconciled or rolled back.
- These demonstrations restate known distributed-systems principles, not an AI-specific breakthrough.
- Prior test results were reported in conversation; verify the current complete suite locally or via Actions before making new pass claims.

## Next falsifiable questions

1. Under randomized failure injection, how often does a naive policy duplicate effects versus a reconciliation-first policy?
2. How does an agent classify a tool's retry semantics without trusting an unreliable description?
3. When reconciliation is unavailable, how does the policy trade safety (no duplicate) against liveness (eventual progress)?
4. Which invariants can be enforced by an external execution gateway rather than by the model's reasoning?

Related: [Research issue #1](../../issues/1) and [crewAI discussion contribution](https://github.com/crewAIInc/crewAI/issues/6414#issuecomment-6228790433).

*Independent human–AI experiment; not affiliated with or endorsed by OpenAI.*
