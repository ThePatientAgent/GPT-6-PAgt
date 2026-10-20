"""Characterization test: expiry while an earlier dispatch lease is active.

This test documents current PR #1 behavior; it does not assert that the
projection is a defect. Run against atomicdjt PR #1 operation_journal.py.
"""
import os
import tempfile
import time
import unittest
from operation_journal import EffectState, OperationJournal, PaymentIntentBoundary


class NoGatewayCalls:
    def create_payment_intent(self, **kwargs):
        raise AssertionError("expired idempotency window must not call provider")

    def retrieve_payment_intent(self, *args, **kwargs):
        raise AssertionError("unexpected retrieval")


class ActiveOwnerWindowExpiryTest(unittest.TestCase):
    def test_expiry_changes_projection_but_preserves_active_lease(self):
        tmp = tempfile.NamedTemporaryFile(delete=False)
        path = tmp.name
        tmp.close()
        first = second = None
        try:
            first = OperationJournal(path)
            second = OperationJournal(path)
            first.begin(amount=500, currency="usd", operation_id="window-owner")
            token = first.begin_dispatch("window-owner", lease_seconds=300)
            self.assertIsNotNone(token)
            before = first.db.execute(
                "SELECT state,dispatch_owner_token,dispatch_lease_expires_at "
                "FROM operations WHERE operation_id='window-owner'"
            ).fetchone()
            self.assertEqual(before["state"], EffectState.DISPATCHING.value)
            self.assertGreater(before["dispatch_lease_expires_at"], time.time())

            boundary = PaymentIntentBoundary(
                second, NoGatewayCalls(), idempotency_window_seconds=0)
            result = boundary.recover("window-owner")
            after = first.db.execute(
                "SELECT state,dispatch_owner_token,dispatch_lease_expires_at "
                "FROM operations WHERE operation_id='window-owner'"
            ).fetchone()
            # Characterize the currently observed code path, not an agreed invariant.
            self.assertEqual(result.state, EffectState.UNKNOWN)
            self.assertEqual(after["dispatch_owner_token"], token)
            self.assertEqual(after["dispatch_lease_expires_at"],
                             before["dispatch_lease_expires_at"])
            self.assertIsNone(first.claim_retry_dispatch(
                "window-owner", idempotency_window_seconds=3600))
        finally:
            if first is not None:
                first.db.close()
            if second is not None:
                second.db.close()
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
