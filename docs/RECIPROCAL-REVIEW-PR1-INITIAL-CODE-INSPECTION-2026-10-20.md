# Reciprocal review: atomicdjt recovery fixture PR #1 — initial independent code inspection

Review target: https://github.com/atomicdjt/crewai-stripe-recovery-fixture/pull/1 (`refs/pull/1/head`, read via GitHub connector). This is **code inspection, not executed independent test evidence**.

## Verified in PR source

- `claim_retry_dispatch` starts `BEGIN IMMEDIATE`, uses a conditional UPDATE with state, original dispatch timestamp and idempotency window, and requires an absent/expired lease before issuing a fresh owner token and incrementing generation. This directly addresses the old unowned double-retry path.
- `observe` appends evidence transactionally; a later `UNKNOWN` update excludes `INTENT_CREATED` and `NOT_COMMITTED` states. A stale owner token cannot release a different owner's lease.
- Correlated `INTENT_CREATED` requires `authority="provider"`, `promote_provider_reference=True`, and a provider reference.
- The code explicitly warns that expired journal leases do not prove an earlier HTTP request stopped. Provider idempotency remains necessary.

## Independent follow-up questions

1. **Terminal conflict:** A correlated positive observation is prevented from replacing `NOT_COMMITTED` (`WHERE state!=NOT_COMMITTED`). Is `NOT_COMMITTED` always backed by sufficiently authoritative provider evidence? Test late positive vs terminal negative interleavings.
2. **Window expiry and live owner:** The `retry_refused_window_expired` branch changes nonterminal state to `UNKNOWN` without clearing an active lease. Does this affect other readers' decisions while a valid owner is still dispatching?
3. **Physical concurrency:** Lease expiry may permit two overlapping HTTP requests despite one journal owner at a time. Test and document the distinction, without claiming exactly-once effects.

## Status

Source inspection only. No new test run has been observed and no defect is asserted. Next: pin PR head SHA and run focused independent regressions against the actual patch.
