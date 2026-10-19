"""Adversarial trust-boundary regression cases.

These are expected failures against the current synthetic policy, not evidence
of a secure provider adapter. Remove @expectedFailure only after a trusted
provider-derived envelope, receipt binding, and replay/conflict policy exist.
Run from research/adapter_evidence_fixture:
    python -m unittest -v test_adversarial_evidence.py
"""
import unittest
from dataclasses import replace
from datetime import datetime, timezone
from evidence_contract import Evidence, EvidenceBoundary, Verdict

NOW = datetime(2026, 10, 19, tzinfo=timezone.utc)
BASE = Evidence(
    schema_version=1, operation_id="op-A", provider_reference="receipt-A",
    observed_at=NOW.isoformat(), lookup_method="transaction_status",
    verdict=Verdict.NOT_COMMITTED, authority="provider_attested",
    correlation_verified=True, finality="authoritative_negative",
    provider_id="mock-provider",
)


class AdversarialEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.boundary = EvidenceBoundary("mock-provider", {"transaction_status"})

    @unittest.expectedFailure
    def test_forged_authority_and_finality_must_not_be_trusted(self):
        # A caller can currently set all the trusted-looking strings/booleans.
        # A future API must require a verified provider-derived envelope.
        forged = replace(BASE, authority="provider_attested",
                         finality="authoritative_negative",
                         correlation_verified=True)
        self.assertEqual(
            self.boundary.assess(forged, "op-A", NOW).verdict, Verdict.UNKNOWN
        )

    @unittest.expectedFailure
    def test_reference_must_be_bound_to_operation(self):
        # The operation ID matches but the receipt belongs to another operation.
        mismatched = replace(BASE, provider_reference="receipt-for-op-B")
        self.assertEqual(
            self.boundary.assess(mismatched, "op-A", NOW).verdict, Verdict.UNKNOWN
        )

    @unittest.expectedFailure
    def test_replayed_receipt_must_be_rejected(self):
        # Identical receipts accepted twice can drive independent decisions.
        first = self.boundary.assess(BASE, "op-A", NOW)
        second = self.boundary.assess(BASE, "op-A", NOW)
        self.assertEqual(first.verdict, Verdict.NOT_COMMITTED)
        self.assertEqual(second.verdict, Verdict.UNKNOWN)

    @unittest.expectedFailure
    def test_conflicting_observations_must_fail_closed(self):
        # The present stateless assessor cannot reconcile contradictory receipts.
        positive = replace(BASE, verdict=Verdict.COMMITTED,
                           finality="authoritative_positive")
        self.assertEqual(
            self.boundary.assess(positive, "op-A", NOW).verdict,
            Verdict.COMMITTED
        )
        self.assertEqual(
            self.boundary.assess(BASE, "op-A", NOW).verdict,
            Verdict.UNKNOWN
        )


if __name__ == "__main__":
    unittest.main()
