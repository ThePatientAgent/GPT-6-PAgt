"""Independent regression: original idempotency window vs active dispatch lease.

PR #1 revision 4fc1009 preserves a live owner on refusal, then clears
expired ownership when both the original window and lease have expired.
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
    def test_expired_window_preserves_live_owner_then_clears_expired_lease(self):
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
            # A window refusal must not demote a still-active owner.
            self.assertEqual(result.state, EffectState.DISPATCHING)
            self.assertEqual(after["state"], EffectState.DISPATCHING.value)
            self.assertEqual(after["dispatch_owner_token"], token)
            self.assertEqual(after["dispatch_lease_expires_at"],
                             before["dispatch_lease_expires_at"])
            self.assertIsNone(first.claim_retry_dispatch(
                "window-owner", idempotency_window_seconds=3600))

            # Expire only the lease; the original idempotency window was
            # already zero. A subsequent refusal can now project UNKNOWN.
            first.db.execute(
                "UPDATE operations SET dispatch_lease_expires_at=? "
                "WHERE operation_id='window-owner'", (time.time() - 10,))
            first.db.commit()
            later = boundary.recover("window-owner")
            final = first.db.execute(
                "SELECT state,dispatch_owner_token,dispatch_lease_expires_at "
                "FROM operations WHERE operation_id='window-owner'"
            ).fetchone()
            self.assertEqual(later.state, EffectState.UNKNOWN)
            self.assertEqual(final["state"], EffectState.UNKNOWN.value)
            self.assertIsNone(final["dispatch_owner_token"])
            self.assertIsNone(final["dispatch_lease_expires_at"])
        finally:
            if first is not None:
                first.db.close()
            if second is not None:
                second.db.close()
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
