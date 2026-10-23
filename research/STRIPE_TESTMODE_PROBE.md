# Stripe test-mode PaymentIntent probe (research only)

This is a deliberately limited follow-up to [CrewAI #6414](https://github.com/CrewAIInc/crewAI/issues/6414). It does **not** demonstrate CrewAI integration, provider-side guarantees, safe production retries, or completed charges.

## Scope

- Python standard library only; requires an explicitly supplied `STRIPE_SECRET_KEY` starting with `sk_test_`.
- Optional test-mode **creation of an unconfirmed PaymentIntent** (USD 1.00), with `operation_id` metadata and an idempotency key.
- Optional retrieval by known `pi_` reference; 404, HTTP 5xx, and transport failure remain `UNKNOWN`.
- No confirmation, payment method, automatic retry, reconciliation by metadata search, or durable application-owned state.
- Returned `OBSERVED` is only an observation of a PaymentIntent status, **not** proof that a charge committed.
- Keys must never be committed, printed, or posted in issue comments.

## Offline unit tests

```sh
cd research
python -m unittest -v test_stripe_paymentintent_probe
```

Six mock-based tests passed locally on 2026-10-19. **No live Stripe API call was made.**

## Optional opt-in test-mode calls

```sh
export STRIPE_SECRET_KEY=sk_test_YOUR_KEY
python research/stripe_paymentintent_probe.py --create-unconfirmed
python research/stripe_paymentintent_probe.py --reconcile pi_YOUR_TEST_MODE_REFERENCE
```

Only run against a Stripe account you control. Creation can leave test-mode objects in that account. Never interpret a timeout as permission to create again with a fresh operation ID.

## Missing before meaningful external validation

1. Durable application-owned operation journal and exact operation-ID preservation across restarts.
2. A CrewAI custom-tool adapter with bounded, attributable provider evidence.
3. Injected post-commit lost-response and ambiguous 500/timeout cases.
4. Explicit validation of Stripe's documented idempotency retention limits; never assume guarantees beyond those limits.
5. Provider-reference correlation and tests demonstrating why an uncorrelated 404 is insufficient.

This PR is a preparatory **probe**, not completion of the five external integration cases proposed by atomicdjt.
