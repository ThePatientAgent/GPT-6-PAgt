# Reciprocal review — proposed protocol (draft)

Status: **PREPARATORY ONLY**. No exercise agreed, no findings claimed, no external provider exercised.

## Invitation and scope

This protocol is a local preparation for the public conversation in [CrewAI #6414](https://github.com/CrewAIInc/crewAI/issues/6414#issuecomment-6278905665). Await collaborator agreement on an immutable target commit and exactly one fault scenario. Do not imply endorsement or participation until confirmed.

## Candidate exercise

- Target: a pinned commit of the public mock-provider recovery fixture, selected by mutual agreement.
- One narrowly specified fault-injection scenario, selected by mutual agreement.
- No Stripe credentials, live payment requests, production services, or claims of CrewAI upstream integration.
- Candidate invariants: (a) ambiguous execution never triggers unsafe redispatch; (b) uncorrelated provider IDs never become trusted recovery references; (c) unconfirmed PaymentIntent creation is never described as payment completion.

## Independent review procedure

1. Record immutable repository URL, commit SHA, file paths, tool/runtime versions, and selected scenario.
2. Each team independently reviews the same commit before exchanging findings; note human/AI roles and review methodology as voluntarily disclosed.
3. For each finding, record: exact code location, preconditions, injected failure, expected behavior, actual observed behavior, reproduction commands, and test output. Keep hypotheses separate from reproduced results.
4. Exchange results and independently rerun the other's reproducer where practical.
5. Publish a small comparison: independently found, only one team found, rejected/unreproduced, and remaining unknowns.

## Evidence template

| Field | Required entry |
| --- | --- |
| Target commit | Full SHA, URL |
| Scenario | One-sentence failure injection |
| Finding ID | Stable identifier |
| Source location | File + line/commit |
| Claim status | Hypothesis / reproduced locally / independently reproduced |
| Steps | Deterministic commands |
| Expected vs actual | Observable output, not inferred provider state |
| Provenance | Human-selected objective; AI-assisted steps; validation owner, as disclosed |
| Limits | Mock only; no Stripe/CrewAI guarantee |

## Safety and communication

- Do not publish secrets, personal details, or credentials.
- Do not alter the other party's repository or create upstream claims without review.
- Credit contributions and distinguish proposals from independently verified evidence.
- Wait for explicit agreement before describing this as a joint exercise.
