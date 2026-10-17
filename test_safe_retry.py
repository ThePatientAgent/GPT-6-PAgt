"""Run with: python -m unittest discover -v"""
import unittest
from safe_retry import (CommitStatus, FakeRemote, ResponseLost,
                        Unauthorized, UnsafeRetry, safe_retry)


class SafeRetryTests(unittest.TestCase):
    def test_lost_response_is_reconciled_without_duplicate(self):
        remote = FakeRemote()
        with self.assertRaises(ResponseLost):
            remote.execute('payment-1', drop_reply=True)
        self.assertEqual(safe_retry(remote, 'payment-1', authorized=True,
                                    prior_status=CommitStatus.UNKNOWN), 1)
        self.assertEqual(remote.effects, 1)

    def test_idempotency_handles_lost_response_without_status_query(self):
        remote = FakeRemote(supports_status_query=False)
        with self.assertRaises(ResponseLost):
            remote.execute('payment-2', drop_reply=True)
        self.assertEqual(safe_retry(remote, 'payment-2', authorized=True,
                                    prior_status=CommitStatus.UNKNOWN), 1)
        self.assertEqual(remote.effects, 1)

    def test_unknown_non_idempotent_operation_must_pause(self):
        remote = FakeRemote(supports_idempotency=False,
                            supports_status_query=False)
        with self.assertRaises(ResponseLost):
            remote.execute('payment-3', drop_reply=True)
        with self.assertRaises(UnsafeRetry):
            safe_retry(remote, 'payment-3', authorized=True,
                       prior_status=CommitStatus.UNKNOWN)
        self.assertEqual(remote.effects, 1)

    def test_revoked_authorization_blocks_retry(self):
        remote = FakeRemote()
        with self.assertRaises(Unauthorized):
            safe_retry(remote, 'payment-4', authorized=False,
                       prior_status=CommitStatus.NOT_DISPATCHED)
        self.assertEqual(remote.effects, 0)

    def test_known_not_dispatched_can_execute(self):
        remote = FakeRemote()
        self.assertEqual(safe_retry(remote, 'payment-5', authorized=True,
                                    prior_status=CommitStatus.NOT_DISPATCHED), 1)
        self.assertEqual(remote.effects, 1)

    def test_known_committed_without_reconciliation_must_pause(self):
        remote = FakeRemote(supports_status_query=False)
        with self.assertRaises(UnsafeRetry):
            safe_retry(remote, 'payment-6', authorized=True,
                       prior_status=CommitStatus.COMMITTED)
        self.assertEqual(remote.effects, 0)

    def test_naive_retry_duplicates_effect_when_not_idempotent(self):
        remote = FakeRemote(supports_idempotency=False)
        with self.assertRaises(ResponseLost):
            remote.execute('payment-7', drop_reply=True)
        remote.execute('payment-7')  # Deliberately unsafe baseline
        self.assertEqual(remote.effects, 2)


if __name__ == '__main__':
    unittest.main()
