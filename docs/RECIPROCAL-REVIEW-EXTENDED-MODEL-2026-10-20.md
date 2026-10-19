# Two-worker concurrent recovery: extended local model (2026-10-20)

**Status: reproduced in a locally reconstructed subset; NOT yet run against the collaborator's complete pinned module.**

Review target: `atomicdjt/crewai-stripe-recovery-fixture` commit `fd9317678f91c9a6c5c36af6c218adbba47c3f71`.

## Test method

We reconstructed the relevant SQLite statement sequences from `record_retry_dispatch()` and `observe()`, plus the relevant `recover()` dispatch-window decision, in a dependency-free local harness. Two independent SQLite connections and two threads race on the same `UNKNOWN` operation. A barrier synchronizes the start, and a mock provider blocks until both retry requests arrive. This is a **model of the relevant paths**, not the full upstream module.

## Observed results

Five consecutive trials returned the same observations:

```text
provider_calls: 2
retry_dispatch_evidence: 2
keys: ['stable-key']
final_state: INTENT_CREATED
errors: []
threads_left_alive: false
```

Both workers reached the mock provider. SQLite serialized the transactions, but the unconditional `UPDATE operations SET state='DISPATCHING' WHERE operation_id=?` did not provide a one-owner retry fence.

## Interpretation and limits

- **Reproduced in the local model:** two workers may both initiate a retry; the key remains identical and the final state is consistent in this particular schedule.
- **Not demonstrated:** duplicate PaymentIntent creation, double charge, state regression, or a confirmed bug in the full fixture.
- A provider's idempotency handling may deduplicate these requests. A missing one-owner fence is worth discussing only relative to the intended invariant and evidence.
- The mock's barrier intentionally forces overlapping provider calls and does not represent all interleavings.

## Next validation

Execute the previously committed full-fixture probe `experiments/test_concurrent_recovery_probe_2026_10_20.py` with the exact pinned `operation_journal.py`; verify it is repeatable, and inspect evidence rows for state consistency. Do not report a confirmed full-fixture finding to the collaborator before that run.
