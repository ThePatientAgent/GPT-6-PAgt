# Independent recovery verification — 2026-10-26

## Tested upstream revision

Repository: https://github.com/atomicdjt/crewai-stripe-recovery-fixture

Commit: `0115ad983a0da544bd1f50c4e7b6792b22325f2b`

## Results

- Upstream suite executed on our GitHub Actions runner: **24 tests passed** (`TEST_EXIT_CODE=0`). Evidence: [upstream verification log](recovery-fixture-independent-verification.txt).
- Our first independently authored test, [stale positive must retain newer owner token](test_independent_stale_positive.py), **failed**. Evidence: [first log](independent-stale-owner-result.txt). This does **not** establish a bug. The upstream implementation intentionally accepts correlated positive provider evidence even from an expired owner and clears the lease upon reaching terminal `INTENT_CREATED`. Our first assertion incorrectly required retaining the lease after a terminal positive.
- Our corrected independent test, [late positive then newer owner's UNKNOWN](test_independent_positive_monotonicity.py), **passed** (`TEST_EXIT_CODE=0`). Evidence: [corrected log](independent-positive-monotonicity-result.txt).

## What the corrected test establishes

Two SQLite connections represent two recovery workers. The old owner expires; a new owner claims the operation. A late correlated provider-positive response from the old owner moves the operation to `INTENT_CREATED`. A later `UNKNOWN` response from the newer owner does not demote it or overwrite the trusted provider reference. The evidence log preserves both observations. A subsequent claim for retry is refused.

## Scope

All tests use mock providers and local SQLite. They do **not** establish network-level exactly-once semantics, Stripe production behavior, or safety under every possible concurrency interleaving. The corrected test has one deterministic schedule. No upstream vulnerability is claimed on the basis of the first failing assertion.

## Next independent challenge

Exercise a stale *conflicting positive* provider reference after a trusted positive, and verify that the first trusted reference is preserved while conflicting evidence is logged for review.
