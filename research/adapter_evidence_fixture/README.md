# Synthetic adapter evidence contract

This independent fixture follows the adapter evidence boundary discussion in CrewAI issue 6414.

Run: `cd research/adapter_evidence_fixture && python -m unittest -v test_evidence_contract.py`

10 local tests passed. They cover versioning, provider and operation correlation, evidence age, trusted lookup methods, positive and negative finality, ambiguous absence, and separate risk acknowledgment for a new logical operation.

Limitations: this is a mock adapter policy. Its evidence flags are supplied by tests, not verified with real provider authentication. It does not integrate with CrewAI or establish exactly-once execution. Eventual-consistency not-found must remain UNKNOWN. The prior unresolved operation must not be rewritten as NOT_COMMITTED simply because a new operation is authorized.
