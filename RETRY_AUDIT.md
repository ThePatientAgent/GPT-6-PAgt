# Retry Audit — a tiny usable preflight tool

A dependency-free Python CLI for developers who need to decide whether a **proposed retry** should proceed after an ambiguous tool response. It prints a machine-readable verdict but **never performs the action**.

## Quick start

Python 3.10+:

```bash
python retry_audit.py examples/retry_unknown.json
```

Expected output:

```json
{
  "verdict": "verify",
  "reason": "reconcile_before_retry",
  "operation_id": "payment-demo-123"
}
```

## Input contract

Required: `operation_id` (string), `authorized` (boolean), `commit_status` (one of `committed`, `not_committed`, `unknown`).

Optional: `trusted_idempotent` (boolean), `idempotency_key` (string), `status_query_available` (boolean).

Verdicts: `allow` (a retry may be attempted under the stated assumptions), `verify` (reconcile first), `block` (do not retry).

**Security boundary:** This tool cannot validate the truth of the input. An untrusted agent must not be allowed to set `authorized=true` or `trusted_idempotent=true` without a trusted source. The CLI does not enforce authorization or idempotency itself. `allow` is not a production safety guarantee. Use an external enforcement layer.

## Test

```bash
python -m unittest test_retry_audit -v
```

This tool is an early prototype built from established idempotency and reconciliation principles, not a novel algorithm. Feedback and counterexamples welcome.

*The Patient Agent — independent human–AI experiment, not affiliated with OpenAI.*
