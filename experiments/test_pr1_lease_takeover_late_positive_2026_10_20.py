"""Independent PR #1 regression: lease takeover followed by late positive evidence.

No Stripe requests are made. This tests the SQLite journal projection only.
"""
import os
import tempfile
import time
import unittest

from operation_journal import EffectState, OperationJournal


class LatePositiveAfterLeaseTakeover(unittest.TestCase):
    def test_old_owner_positive_survives_new_owner_ambiguous_result(self):
        tmp = tempfile.NamedTemporaryFile(delete=False)
        path = tmp.name
        tmp.close()
        a = b = None
        try:
            a = OperationJournal(path)
            b = OperationJournal(path)
            a.begin(amount=500, currency="usd", operation_id="takeover")
            old_token = a.begin_dispatch("takeover", lease_seconds=60)
            self.assertIsNotNone(old_token)
            # Expire the first lease, not the original provider idempotency window.
            a.db.execute(
                "UPDATE operations SET dispatch_lease_expires_at=? WHERE operation_id=?",
                (time.time() - 1, "takeover"),
            )
            a.db.commit()
            new_token = b.claim_retry_dispatch(
                "takeover", idempotency_window_seconds=3600, lease_seconds=60
            )
            self.assertIsNotNone(new_token)
            self.assertNotEqual(old_token, new_token)

            # The first (now stale) HTTP request may still return valid evidence.
            positive = a.observe(
                "takeover", state=EffectState.INTENT_CREATED,
                lookup_method="old_owner_late_provider_positive",
                authority="provider", provider_reference="pi_takeover",
                promote_provider_reference=True, owner_token=old_token,
                raw={"id": "pi_takeover", "correlated": True},
            )
            self.assertEqual(positive.state, EffectState.INTENT_CREATED)
            self.assertEqual(positive.provider_reference, "pi_takeover")

            # The newer worker's ambiguous result must not demote that evidence.
            final = b.observe(
                "takeover", state=EffectState.UNKNOWN,
                lookup_method="new_owner_response_lost",
                authority="application", provider_reference=None,
                owner_token=new_token, raw={"reason": "lost_response"},
            )
            self.assertEqual(final.state, EffectState.INTENT_CREATED)
            self.assertEqual(final.provider_reference, "pi_takeover")
            self.assertIsNone(a.claim_retry_dispatch(
                "takeover", idempotency_window_seconds=3600,
            ))
        finally:
            if a is not None:
                a.db.close()
            if b is not None:
                b.db.close()
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
