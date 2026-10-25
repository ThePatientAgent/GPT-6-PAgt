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
            # A cleared lease must never become permission to retry after the
            # original provider idempotency window has already expired.
            self.assertIsNone(second.claim_retry_dispatch(
                "window-owner", idempotency_window_seconds=0))
        finally:
            if first is not None:
                first.db.close()
            if second is not None:
                second.db.close()
            os.unlink(path)


    def test_valid_late_positive_after_window_refusal_is_not_dropped(self):
        """A real prior owner's positive receipt may arrive after retry refusal."""
        tmp = tempfile.NamedTemporaryFile(delete=False)
        path = tmp.name
        tmp.close()
        first = second = None
        try:
            first = OperationJournal(path)
            second = OperationJournal(path)
            first.begin(amount=500, currency="usd", operation_id="late-positive")
            owner_token = first.begin_dispatch("late-positive", lease_seconds=300)
            self.assertIsNotNone(owner_token)

            # Independently observe that the original retry window is over
            # while the previous dispatch still has a live owner.
            boundary = PaymentIntentBoundary(
                second, NoGatewayCalls(), idempotency_window_seconds=0)
            refused = boundary.recover("late-positive")
            self.assertEqual(refused.state, EffectState.DISPATCHING)

            # The original owner now supplies a correlated positive result.
            # The refusal must not erase this evidence or permit redispatch.
            positive = first.observe(
                "late-positive", state=EffectState.INTENT_CREATED,
                lookup_method="original_owner_late_positive",
                authority="provider", provider_reference="pi_late_positive",
                promote_provider_reference=True, owner_token=owner_token,
                raw={"id": "pi_late_positive", "correlated": True},
            )
            self.assertEqual(positive.state, EffectState.INTENT_CREATED)
            self.assertEqual(positive.provider_reference, "pi_late_positive")
            observed = second.get("late-positive")
            self.assertEqual(observed.state, EffectState.INTENT_CREATED)
            self.assertEqual(observed.provider_reference, "pi_late_positive")
            self.assertIsNone(second.claim_retry_dispatch(
                "late-positive", idempotency_window_seconds=0))
        finally:
            if first is not None:
                first.db.close()
            if second is not None:
                second.db.close()
            os.unlink(path)



    def test_repeated_expired_window_recovery_never_redispatches(self):
        """Repeated polling after both windows expire must not create again.

        Uses a gateway that raises on *any* provider operation. This checks
        a repeated caller, not just a single refusal transition.
        """
        tmp = tempfile.NamedTemporaryFile(delete=False)
        path = tmp.name
        tmp.close()
        journal = observer = None
        try:
            journal = OperationJournal(path)
            observer = OperationJournal(path)
            journal.begin(amount=500, currency="usd", operation_id="repeat-expired")
            token = journal.begin_dispatch("repeat-expired", lease_seconds=60)
            self.assertIsNotNone(token)
            journal.db.execute(
                "UPDATE operations SET dispatch_lease_expires_at=? "
                "WHERE operation_id=?", (time.time() - 10, "repeat-expired"))
            journal.db.commit()

            boundary = PaymentIntentBoundary(
                observer, NoGatewayCalls(), idempotency_window_seconds=0)
            for attempt in range(3):
                with self.subTest(attempt=attempt):
                    outcome = boundary.recover("repeat-expired")
                    self.assertEqual(outcome.state, EffectState.UNKNOWN)
                    row = journal.db.execute(
                        "SELECT state, dispatch_owner_token, "
                        "dispatch_lease_expires_at FROM operations "
                        "WHERE operation_id=?", ("repeat-expired",)
                    ).fetchone()
                    self.assertEqual(row["state"], EffectState.UNKNOWN.value)
                    self.assertIsNone(row["dispatch_owner_token"])
                    self.assertIsNone(row["dispatch_lease_expires_at"])
                    self.assertIsNone(observer.claim_retry_dispatch(
                        "repeat-expired", idempotency_window_seconds=0))
        finally:
            if journal is not None:
                journal.db.close()
            if observer is not None:
                observer.db.close()
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
