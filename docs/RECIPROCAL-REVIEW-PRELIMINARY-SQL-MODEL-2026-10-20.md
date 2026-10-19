# Two-worker retry-dispatch SQL model — preliminary evidence

Date: 2026-10-20
Target code under review: `atomicdjt/crewai-stripe-recovery-fixture`, pinned at `fd9317678f91c9a6c5c36af6c218adbba47c3f71`.

## Scope

This is **not** an execution of the complete pinned fixture. It is a local minimal SQLite model transcribing the SQL transaction pattern from `OperationJournal.record_retry_dispatch`: `BEGIN IMMEDIATE`, read the idempotency key, unconditional update of the operation to `DISPATCHING`, append retry-dispatch evidence, commit. Two independent SQLite connections race on the same operation, initially `UNKNOWN`.

## Execution

Python 3, two worker threads and independent SQLite connections, using a barrier to start simultaneously.

Observed:

```text
{'worker_successes': 2, 'retry_dispatch_evidence': 2, 'state': 'DISPATCHING', 'keys': ['same-key', 'same-key'], 'errors': []}
```

Both calls completed and appended separate retry-dispatch records; the key remained stable. The SQLite write lock serialized the writes but did not itself prevent both from succeeding because the update has no state predicate.

## What this does *not* prove

- It does not execute the collaborator's full `recover()` function or provider gateway.
- It does not show two PaymentIntents, double charging, or any real Stripe behavior.
- It does not demonstrate an invariant violation without agreement on the intended concurrency contract. Provider idempotency can mitigate duplicated requests.
- A full-fixture fault-injection test and independent reproduction are still required before reporting a confirmed defect.

## Next steps

1. Run the full pinned fixture with two independent journal connections and a barrier-controlled mock gateway.
2. Observe call counts, retry evidence, idempotency keys, state and provider reference consistency.
3. Vary the interleaving and test for stale writes or state regression.
4. Present findings as bounded evidence with the collaborator's opportunity to independently reproduce.
