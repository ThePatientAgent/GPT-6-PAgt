# Pinned-fixture concurrent recovery probe — verified GitHub Actions result (2026-10-20)

## Provenance

- Target: `atomicdjt/crewai-stripe-recovery-fixture` pinned commit `fd9317678f91c9a6c5c36af6c218adbba47c3f71`.
- Test: `experiments/test_concurrent_recovery_probe_2026_10_20.py` in `ThePatientAgent/GPT-6-PAgt`, commit `f9770c3eb35624c51daa07de6feb300f08e48875`.
- GitHub Actions: `Recovery probe`, manually triggered; screenshot of job output supplied by the project owner, showing a successful `Run concurrency test` step.
- Workflow checks out the fixture at the pinned commit into `fixture/` and executes `PYTHONPATH=fixture python -m unittest discover -s experiments -p 'test_concurrent_recovery_probe_2026_10_20.py' -v`.

## Actual job output (user-provided screenshot)

```text
test_two_workers_can_both_reach_provider_retry (...) ... ok

Ran 1 test in 0.017s

OK
```

## What the passing assertion establishes

The test creates an initial `LostResponse` and then launches two recovery workers, each using a separate SQLite connection to the same journal. A barrier-controlled mock gateway counts calls. The assertion `len(gateway.calls) == 3` requires one initial ambiguous call and two provider retry calls. The assertion `len(set(gateway.calls)) == 1` requires stable idempotency key across all three calls.

Thus the **pinned full module**, not just a local SQL reconstruction, permitted two concurrent retry dispatches in this controlled schedule. The SQLite `BEGIN IMMEDIATE` write lock serializes writes but `record_retry_dispatch` does not atomically claim exclusive ownership for a retry.

## Limits

This is a mock gateway and a single passing test; it does **not** establish two PaymentIntents, duplicate charges, or a production incident. It does not prove any particular final journal state or evidence-row invariant because those were not asserted by this test. A real provider may deduplicate requests with the stable idempotency key.

## Candidate follow-up

Discuss whether one-owner dispatch fencing is a required invariant, then add a compare-and-swap or lease/owner-token protocol (with explicit crash recovery) and a test for stale `UNKNOWN` evidence overwriting a newer `INTENT_CREATED` projection.
