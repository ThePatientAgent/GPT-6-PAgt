import sqlite3
import unittest
from datetime import datetime, timezone
from trusted_evidence import MockProvider, TrustedEvidenceGateway, Verdict

NOW=datetime(2026,10,19,tzinfo=timezone.utc)

class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(":memory:")
        self.issuer=MockProvider(b"test-secret")
        self.gateway=TrustedEvidenceGateway(b"test-secret",self.db)

    def receipt(self,**changes):
        params=dict(operation_id="op-A",reference="receipt-A",verdict=Verdict.NOT_COMMITTED,
                    observed_at=NOW.isoformat(),nonce="nonce-1",finality="authoritative_negative")
        params.update(changes)
        return self.issuer.issue(**params)

    def check(self,receipt,operation="op-A",reference="receipt-A"):
        return self.gateway.assess(*receipt,operation,reference,NOW).verdict

    def test_authenticated_negative(self):
        self.assertEqual(self.check(self.receipt()),Verdict.NOT_COMMITTED)

    def test_forged_signature(self):
        payload,sig=self.receipt()
        self.assertEqual(self.check((payload.replace(b"NOT_COMMITTED",b"COMMITTED"),sig)),Verdict.UNKNOWN)

    def test_wrong_reference(self):
        self.assertEqual(self.check(self.receipt(reference="receipt-B")),Verdict.UNKNOWN)

    def test_replay_survives_gateway_restart(self):
        receipt=self.receipt()
        self.assertEqual(self.check(receipt),Verdict.NOT_COMMITTED)
        restarted=TrustedEvidenceGateway(b"test-secret",self.db)
        self.assertEqual(restarted.assess(*receipt,"op-A","receipt-A",NOW).verdict,Verdict.UNKNOWN)

    def test_conflicting_observations(self):
        self.assertEqual(self.check(self.receipt()),Verdict.NOT_COMMITTED)
        positive=self.receipt(verdict=Verdict.COMMITTED,finality="authoritative_positive",nonce="nonce-2")
        self.assertEqual(self.check(positive),Verdict.UNKNOWN)

    def test_nonfinal_negative(self):
        self.assertEqual(self.check(self.receipt(finality="eventually_consistent")),Verdict.UNKNOWN)

    def test_stale_evidence(self):
        self.assertEqual(self.check(self.receipt(observed_at="2026-10-18T00:00:00+00:00")),Verdict.UNKNOWN)

    def test_different_operation(self):
        self.assertEqual(self.check(self.receipt(operation_id="op-B")),Verdict.UNKNOWN)

if __name__=="__main__":
    unittest.main()
