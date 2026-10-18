"""Synthetic adapter evidence boundary. No real provider or CrewAI integration."""
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

class Verdict(str, Enum):
    COMMITTED = "COMMITTED"
    NOT_COMMITTED = "NOT_COMMITTED"
    UNKNOWN = "UNKNOWN"

@dataclass(frozen=True)
class Evidence:
    schema_version: int
    operation_id: str
    provider_reference: str | None
    observed_at: str
    lookup_method: str
    verdict: Verdict
    authority: str
    correlation_verified: bool
    finality: str
    provider_id: str

@dataclass(frozen=True)
class Assessment:
    verdict: Verdict
    reason: str

class EvidenceBoundary:
    """Mock trust policy: configuration, not cryptographic verification."""
    def __init__(self, provider_id: str, trusted_methods: set[str], max_age_seconds=300):
        self.provider_id = provider_id
        self.trusted_methods = trusted_methods
        self.max_age_seconds = max_age_seconds

    def assess(self, evidence: Evidence, expected_operation_id: str, now: datetime) -> Assessment:
        uncertain = lambda reason: Assessment(Verdict.UNKNOWN, reason)
        if evidence.schema_version != 1:
            return uncertain("unsupported schema version")
        if evidence.provider_id != self.provider_id:
            return uncertain("provider mismatch")
        if evidence.operation_id != expected_operation_id or not evidence.correlation_verified:
            return uncertain("uncorrelated evidence")
        if not evidence.provider_reference:
            return uncertain("missing provider reference")
        if evidence.lookup_method not in self.trusted_methods:
            return uncertain("untrusted lookup method")
        if evidence.authority != "provider_attested":
            return uncertain("insufficient authority")
        try:
            observed = datetime.fromisoformat(evidence.observed_at.replace("Z", "+00:00"))
            if observed.tzinfo is None or now.tzinfo is None:
                return uncertain("timestamp without timezone")
            age = (now - observed).total_seconds()
            if age < 0 or age > self.max_age_seconds:
                return uncertain("stale or future observation")
        except (ValueError, TypeError):
            return uncertain("invalid timestamp")
        if evidence.verdict == Verdict.NOT_COMMITTED and evidence.finality != "authoritative_negative":
            return uncertain("negative lookup not final (possible eventual consistency)")
        if evidence.verdict == Verdict.COMMITTED and evidence.finality != "authoritative_positive":
            return uncertain("positive lookup not final")
        if evidence.verdict == Verdict.UNKNOWN:
            return uncertain("provider reports unknown")
        return Assessment(evidence.verdict, "provider-contract evidence accepted")

@dataclass(frozen=True)
class RecoveryDecision:
    predecessor_operation_id: str
    predecessor_outcome: Verdict
    new_operation_id: str | None
    residual_duplicate_effect_risk: bool
    operator_acknowledged: bool

    def validate(self):
        if self.predecessor_outcome == Verdict.UNKNOWN and self.new_operation_id:
            if self.new_operation_id == self.predecessor_operation_id:
                raise ValueError("new operation must have distinct ID")
            if not (self.residual_duplicate_effect_risk and self.operator_acknowledged):
                raise ValueError("unresolved predecessor requires explicit risk acknowledgement")
