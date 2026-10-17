"""Policy regression cases based on LangGraph issue #9185.

This is NOT a LangGraph integration test. No LangGraph dependency, provider
requests, or payments. It checks Retry Audit's decisions for the reported
timeout-after-commit scenario under explicitly supplied trusted metadata.
"""
import unittest
from retry_audit import Invocation, Verdict, audit_retry


class LangGraphTimeoutCase(unittest.TestCase):
    def payment(self, **overrides):
        fields = dict(operation_id="t1:call_1", authorized=True,
                      commit_status="unknown", trusted_idempotent=False,
                      idempotency_key=None, status_query_available=False)
        fields.update(overrides)
        return audit_retry(Invocation(**fields))

    def test_lost_response_without_provider_guarantees_blocks_resume(self):
        self.assertEqual(self.payment().verdict, Verdict.BLOCK)

    def test_stable_tool_call_id_alone_does_not_make_retry_safe(self):
        self.assertEqual(self.payment(idempotency_key="t1:call_1").verdict,
                         Verdict.BLOCK)

    def test_provider_status_lookup_requires_reconciliation(self):
        self.assertEqual(self.payment(status_query_available=True).verdict,
                         Verdict.VERIFY)

    def test_confirmed_payment_blocks_duplicate(self):
        self.assertEqual(self.payment(commit_status="committed").verdict,
                         Verdict.BLOCK)

    def test_trusted_provider_idempotency_permits_same_key_retry(self):
        self.assertEqual(self.payment(trusted_idempotent=True,
                                      idempotency_key="t1:call_1").verdict,
                         Verdict.ALLOW)

    def test_known_not_committed_permits_retry(self):
        self.assertEqual(self.payment(commit_status="not_committed").verdict,
                         Verdict.ALLOW)


if __name__ == "__main__":
    unittest.main()
