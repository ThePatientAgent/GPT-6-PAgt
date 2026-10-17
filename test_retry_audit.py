import unittest
from retry_audit import Invocation, Verdict, audit_retry


class RetryAuditTests(unittest.TestCase):
    def make(self, **kwargs):
        base = dict(operation_id="op-1", authorized=True, commit_status="unknown")
        base.update(kwargs)
        return audit_retry(Invocation(**base))

    def test_unknown_unsafe_is_blocked(self):
        self.assertEqual(self.make().verdict, Verdict.BLOCK)

    def test_status_query_takes_precedence(self):
        self.assertEqual(self.make(status_query_available=True,
                                   trusted_idempotent=True,
                                   idempotency_key="key").verdict, Verdict.VERIFY)

    def test_trusted_key_allows_retry(self):
        self.assertEqual(self.make(trusted_idempotent=True,
                                   idempotency_key="key").verdict, Verdict.ALLOW)

    def test_key_alone_does_not_allow(self):
        self.assertEqual(self.make(idempotency_key="key").verdict, Verdict.BLOCK)

    def test_metadata_alone_does_not_allow(self):
        self.assertEqual(self.make(trusted_idempotent=True).verdict, Verdict.BLOCK)

    def test_unauthorized_is_blocked(self):
        self.assertEqual(self.make(authorized=False, commit_status="not_committed").verdict, Verdict.BLOCK)

    def test_committed_is_blocked(self):
        self.assertEqual(self.make(commit_status="committed").verdict, Verdict.BLOCK)

    def test_not_committed_is_allowed(self):
        self.assertEqual(self.make(commit_status="not_committed").verdict, Verdict.ALLOW)

    def test_missing_operation_id_is_blocked(self):
        self.assertEqual(self.make(operation_id="").verdict, Verdict.BLOCK)

    def test_invalid_status_is_blocked(self):
        self.assertEqual(self.make(commit_status="maybe").verdict, Verdict.BLOCK)


if __name__ == "__main__":
    unittest.main()
