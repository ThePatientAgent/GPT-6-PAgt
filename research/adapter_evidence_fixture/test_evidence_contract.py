import unittest
from dataclasses import replace
from datetime import datetime, timezone, timedelta
from evidence_contract import Evidence, EvidenceBoundary, Verdict, RecoveryDecision

NOW = datetime(2026, 10, 19, tzinfo=timezone.utc)
BASE = Evidence(1, "op-1", "tx-1", NOW.isoformat(), "transaction_status", Verdict.NOT_COMMITTED,
                "provider_attested", True, "authoritative_negative", "mock-provider")

class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.boundary = EvidenceBoundary("mock-provider", {"transaction_status"})

    def check_unknown(self, **changes):
        self.assertEqual(self.boundary.assess(replace(BASE, **changes), "op-1", NOW).verdict, Verdict.UNKNOWN)

    def test_authoritative_negative(self):
        self.assertEqual(self.boundary.assess(BASE, "op-1", NOW).verdict, Verdict.NOT_COMMITTED)

    def test_authoritative_positive(self):
        self.assertEqual(self.boundary.assess(replace(BASE, verdict=Verdict.COMMITTED,
                         finality="authoritative_positive"), "op-1", NOW).verdict, Verdict.COMMITTED)

    def test_eventually_consistent_not_found(self):
        self.check_unknown(finality="eventually_consistent")

    def test_uncorrelated_evidence(self):
        self.check_unknown(correlation_verified=False)
        self.check_unknown(operation_id="different-op")

    def test_untrusted_or_unverified_evidence(self):
        self.check_unknown(authority="adapter_asserted")
        self.check_unknown(provider_id="other-provider")
        self.check_unknown(lookup_method="cached_search")

    def test_missing_receipt_and_version(self):
        self.check_unknown(provider_reference=None)
        self.check_unknown(schema_version=2)

    def test_stale_future_and_naive_timestamps(self):
        self.check_unknown(observed_at=(NOW - timedelta(hours=2)).isoformat())
        self.check_unknown(observed_at=(NOW + timedelta(seconds=2)).isoformat())
        self.check_unknown(observed_at="2026-10-19T00:00:00")

    def test_weak_positive(self):
        self.check_unknown(verdict=Verdict.COMMITTED, finality="provisional")

    def test_unknown_is_never_upgraded(self):
        self.check_unknown(verdict=Verdict.UNKNOWN, finality="authoritative_negative")

    def test_new_operation_preserves_unknown_and_acknowledges_risk(self):
        RecoveryDecision("op-1", Verdict.UNKNOWN, "op-2", True, True).validate()
        with self.assertRaises(ValueError):
            RecoveryDecision("op-1", Verdict.UNKNOWN, "op-2", False, True).validate()
        with self.assertRaises(ValueError):
            RecoveryDecision("op-1", Verdict.UNKNOWN, "op-1", True, True).validate()

if __name__ == "__main__":
    unittest.main()
