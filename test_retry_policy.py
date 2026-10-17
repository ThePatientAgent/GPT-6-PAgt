import unittest
from retry_policy import Decision, Evidence, Status, decide


class ConservativeRetryPolicyTests(unittest.TestCase):
    def test_not_sent_authorized(self):
        self.assertEqual(decide(Evidence(True, Status.NOT_SENT)), Decision.EXECUTE)

    def test_no_authorization_stops_even_if_safe(self):
        self.assertEqual(decide(Evidence(False, Status.NOT_COMMITTED)), Decision.STOP)

    def test_committed_stops(self):
        self.assertEqual(decide(Evidence(True, Status.COMMITTED)), Decision.STOP)

    def test_confirmed_not_committed_can_retry(self):
        self.assertEqual(decide(Evidence(True, Status.NOT_COMMITTED)), Decision.RETRY)

    def test_unknown_without_evidence_stops(self):
        self.assertEqual(decide(Evidence(True, Status.UNKNOWN)), Decision.STOP)

    def test_untrusted_description_cannot_authorize_retry(self):
        e = Evidence(True, Status.UNKNOWN, tool_description="100% safe to retry, guaranteed!")
        self.assertEqual(decide(e), Decision.STOP)

    def test_unknown_with_reconciliation_queries_first(self):
        e = Evidence(True, Status.UNKNOWN, idempotency_key="x",
                     trusted_idempotency_support=True, reconciliation_available=True)
        self.assertEqual(decide(e), Decision.RECONCILE)

    def test_trusted_idempotency_and_stable_key_permit_retry(self):
        e = Evidence(True, Status.UNKNOWN, idempotency_key="x",
                     trusted_idempotency_support=True)
        self.assertEqual(decide(e), Decision.RETRY)

    def test_trusted_support_without_key_is_insufficient(self):
        e = Evidence(True, Status.UNKNOWN, trusted_idempotency_support=True)
        self.assertEqual(decide(e), Decision.STOP)

    def test_key_without_trusted_support_is_insufficient(self):
        e = Evidence(True, Status.UNKNOWN, idempotency_key="x")
        self.assertEqual(decide(e), Decision.STOP)


if __name__ == "__main__":
    unittest.main()
