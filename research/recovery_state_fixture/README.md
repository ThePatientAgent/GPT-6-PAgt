# The Patient Agent — Recovery State Fixture (synthetic)

A small runnable test model following the **2026-10-18** discussion by `atomicdjt` on [CrewAI issue #6414](https://github.com/crewAIInc/crewAI/issues/6414#issuecomment-6244562345). It is an **independent orchestration-layer recovery experiment**. It does **not** replace, extend or claim to validate the existing atomicdjt/AgentCI retry fixture. It does not integrate with CrewAI or a payment provider.

## Verify

Python 3.10+ standard library only:

```sh
python -m unittest -v test_recovery_state.py
```

The nine tests exercise the seven requested controls, with extra positive/negative cases:

| Control | Regression |
| --- | --- |
| 1 | Unknown effect blocks automatic redispatch |
| 2 | Fresh authorization does not make unresolved prior operation safe to retry |
| 3 | Ambiguous, unverified or fabricated provider evidence cannot close UNKNOWN |
| 4 | Verified COMMITTED / NOT_COMMITTED receipt reconciles, with different retry policies |
| 5 | Explicit risk acknowledgment creates a new unique logical operation, with immutable UNKNOWN predecessor and provenance |
| 6 | Restart preserves unknown predecessor, new-operation link, audit history and disposition |
| 7 | Concurrent operator/reconciler actions cannot create conflicting terminal decisions (also tests 8 competing operator actions) |

## Contract and deliberate bounds

- `operations.outcome` represents **observed external-effect status**, not an approval state. The unresolved predecessor stays `UNKNOWN` after the operator authorizes a **different** operation.
- `decisions` is a separate durable table: at most one terminal resolution/disposition per predecessor, enforced by SQLite primary key and `BEGIN IMMEDIATE` transactions.
- `MockProvider.attest()` is the only accepted evidence source. It tests a simulated trusted receipt ledger, **not actual provider identity, signature or network security**.
- `NOT_DISPATCHED` is used for a newly authorized *but not yet executed* operation: creating its record doesn't execute the effect.
- `authorize_retry()` is a **policy predicate only**; it does not call an external service. A production implementation must also bind actor/tool/canonical arguments, fresh single-use authority permits, durable operation IDs, actual tool dispatch, transport retries and adapter capabilities.
- The fixture does not ensure exactly-once remote execution, and cannot turn missing provider capabilities into certainty.
- Concurrent tests are SQLite atomicity demonstrations within one simulated process, not a distributed consensus proof.

Project: The Patient Agent (independent human–AI experiment; not affiliated with OpenAI or CrewAI).