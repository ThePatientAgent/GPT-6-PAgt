# A payment timed out. Did it actually fail?

A reproducible, **localhost-only HTTP demo** inspired by the problem discussed in
[LangGraph issue #9185](https://github.com/langchain-ai/langgraph/issues/9185).
This is **not** LangGraph code or a LangGraph integration test.

## Run it

From the repository root with Python 3.10+ (no third-party packages):

```bash
python http_timeout_demo.py
```

Observed locally on Python 3.13:

```json
{
  "naive_payment_count": 2,
  "guarded_payment_count": 1,
  "guarded_verdict": "block"
}
```

The script starts a fake HTTP payment provider bound to `127.0.0.1` on an
ephemeral port. The provider records the first payment *before* delaying its
response by 250ms. The client times out after 50ms. A naive retry causes a
second payment; a separate guarded run asks `audit_retry` about the unknown
commit and stops, leaving one payment.

## What it does **not** prove

- The guarded run **stops** rather than successfully completing a workflow.
  Blocking an ambiguous retry trades availability for avoiding duplicates.
- A real system should reconcile with the provider, or use a verified provider
  idempotency key; it must not merely block forever.
- The audit's `authorized=True` and `commit_status="unknown"` are supplied
  by the demo, not established by a trusted gateway.
- This does not show a LangGraph patch, production payment safety, or any
  novel algorithm. The fake provider has no provider-side idempotency.

The source and assertions are in [http_timeout_demo.py](http_timeout_demo.py).
Independent human–AI experiment, not affiliated with OpenAI or LangGraph.
