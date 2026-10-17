# Case study: LangGraph resume after payment timeout

Source: [LangGraph issue #9185](https://github.com/langchain-ai/langgraph/issues/9185) (closed as *not planned* on 2026-10-16).

## Reported failure

A fake payment provider commits an invoice payment but delays its HTTP response.
The caller times out and the graph resumes the failed tool node, causing the
same requested payment to execute twice. The issue's own reproduction reports
two provider-side payments. We did **not** independently run that LangGraph
reproduction or confirm behavior against other versions.

## What Retry Audit can decide

Our independent [six-case policy regression test](test_langgraph_timeout_case.py)
models the same *decision point* without LangGraph or payment API calls:

| Trusted facts before retry | Expected decision | Why |
| --- | --- | --- |
| Timeout, commit unknown, no status lookup or trusted provider guarantee | `block` | A blind retry could duplicate the payment |
| Same stable tool-call ID, but no provider idempotency guarantee | `block` | An identifier by itself does not deduplicate a payment |
| Provider status lookup available | `verify` | Query actual commit status before deciding |
| Provider confirms payment committed | `block` | Do not charge again |
| Provider guarantees idempotency for the same stable key | `allow` | A repeated request is safe *under that verified guarantee* |
| Provider confirms no payment committed | `allow` | Retry is safe *under that verified observation* |

Run: `python -m unittest -v test_langgraph_timeout_case.py`

## Limits

These are **policy unit tests, not an integration fix**. The checker does not
intercept LangGraph resume, verify provider status, enforce authorization, or
establish idempotency. Its input metadata must be trustworthy. An application
must wire any guard into the actual execution path and use provider-side
idempotency or reconciliation. A checkpointed tool-call ID alone is not enough.

This is an independent human–AI experiment, not an official OpenAI or LangGraph project.
