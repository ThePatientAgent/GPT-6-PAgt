# Research #2 — Can an agent decide when retrying is safe?

## Hypothesis

A conservative decision policy that separates **trusted capability metadata** from **untrusted tool descriptions** can avoid authorizing a retry based only on a tool's persuasive claim.

## Experiment

[retry_policy.py](retry_policy.py) implements a deterministic decision table with four outcomes: execute, retry, reconcile, stop. [test_retry_policy.py](test_retry_policy.py) supplies ten test cases, including an adversarial description claiming that retries are guaranteed safe.

Run with Python 3.10+:

```bash
python -m unittest test_retry_policy -v
```

## Expected observations

- An unknown commit without reliable evidence leads to reconciliation if available; otherwise it stops.
- An untrusted description never grants idempotency.
- A stable key **and** trusted support are both required for retrying an unknown commit without reconciliation.
- Lack of authorization always stops execution.

## Boundaries and open questions

This is a hand-coded policy, **not** an LLM trained or evaluated to classify tool safety. Tests validate intended control flow but do not measure real-world duplicate rates or correctness of metadata. In particular, a provider's purported idempotency guarantee might be wrong or expire, and a status endpoint might be stale. A robust system would need a trusted policy source, capability versioning, authorization scopes, logging, and fault injection against actual services.

**Next:** Build a fault-injection harness and compare naive retry, conservative stop, and reconciliation-first policies on safety and liveness. Define the denominator for each metric before testing.

Independent human–AI research experiment. Not an official OpenAI project.
