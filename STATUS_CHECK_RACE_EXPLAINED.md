# Can checking payment status still lead to a double charge?

**Yes.** A negative status result only tells you what the provider knew *when it answered*. It does not guarantee that an earlier in-flight request will not finish afterward.

## The five-step race

1. An AI agent sends a payment request.
2. The response times out. The original payment may still be processing.
3. The agent checks status. The provider truthfully answers **not completed yet**.
4. The original request completes and charges the customer.
5. The agent retries based on the old status result, creating a **second charge** if the provider allows duplicates.

**The trap:** “Check before retry” sounds safe, but checking and retrying are two separate operations. The gap between them is a race window (TOCTOU).

## What actually helps?

A provider-enforced **idempotency key**, when the provider guarantees atomic deduplication for the same logical operation, can prevent a second effect. Another safe design may use an operation ID and a provider-supported atomic state transition. A client-side status check alone cannot supply that guarantee.

## Reproduce the model

The dependency-free [two-test regression](test_status_retry_race.py) demonstrates both cases:

- Without atomic deduplication, a truthful negative status check can be followed by **two** recorded effects.
- With an *assumed* atomic provider-side idempotency check, the second attempt is rejected and only **one** effect is recorded.

Run:

```bash
python -m unittest -v test_status_retry_race
```

This is a **deterministic educational model**, not a real payment integration, provider guarantee, or proof of distributed-systems safety. The model's atomicity is an explicit assumption; real providers vary in idempotency scope, retention, request matching, and failure handling.

## Why this matters to AI agents

Agents may see a timeout as a reason to retry. But a timeout means **the result is unknown**, not that the action failed. For money transfers, email sends, ticket purchases, and other non-idempotent effects, the agent should distinguish *unknown* from *failed* and require an appropriate recovery protocol.

**Takeaway:** Don't ask only “Did it happen yet?” Ask “What prevents it from happening twice?”

Part of [The Patient Agent](README.md), an independent human–AI experiment. Not an official OpenAI project.
