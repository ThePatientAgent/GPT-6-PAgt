"""Independent bounded regressions against atomicdjt recovery fixture PR #1.

Run with PYTHONPATH=fixture-pr1 python -m unittest discover -s experiments
-p 'test_pr1_claim_fencing_2026_10_20.py' -v
"""
import os
import tempfile
import time
import unittest

from operation_journal import EffectState, OperationJournal


class IndependentPR1FencingTests(unittest.TestCase):
    def setUp(self):
        handle = tempfile.NamedTemporaryFile(delete=False)
        self.path = handle.name
        handle.close()
        self.a = OperationJournal(self.path)
        self.b = OperationJournal(self.path)
        self.a.begin(amount=500, currency="usd", operation_id="independent-pr1")

    def tearDown(self):
        self.a.db.close()
        self.b.db.close()
        os.unlink(self.path)

    def observe_unknown(self, journal, token):
        return journal.observe(
            "independent-pr1", state=EffectState.UNKNOWN,
            lookup_method="independent_lost_response",
            authority="application", provider_reference=None,
            raw={"scenario": "independent_pr1"}, owner_token=token,
        )

    def test_one_owner_at_a_time_and_stale_owner_cannot_release_new_lease(self):
        first = self.a.begin_dispatch("independent-pr1", lease_seconds=30)
        self.assertIsNotNone(first)
        self.assertIsNone(self.b.claim_retry_dispatch(
            "independent-pr1", idempotency_window_seconds=3600,
            lease_seconds=30))
        self.observe_unknown(self.a, first)
        second = self.b.claim_retry_dispatch(
            "independent-pr1", idempotency_window_seconds=3600,
            lease_seconds=30)
        self.assertIsNotNone(second)
        self.assertNotEqual(first, second)
        self.observe_unknown(self.a, first)
        self.assertEqual(self.a.get("independent-pr1").state,
                         EffectState.DISPATCHING)
        self.assertIsNone(self.a.claim_retry_dispatch(
            "independent-pr1", idempotency_window_seconds=3600,
            lease_seconds=30))
        self.observe_unknown(self.b, second)
        self.assertEqual(self.a.get("independent-pr1").state,
                         EffectState.UNKNOWN)

    def test_positive_evidence_survives_late_unknown_from_previous_owner(self):
        first = self.a.begin_dispatch("independent-pr1")
        self.assertIsNotNone(first)
        op = self.b.observe(
            "independent-pr1", state=EffectState.INTENT_CREATED,
            lookup_method="independent_provider_response", authority="provider",
            provider_reference="pi_independent_pr1",
            promote_provider_reference=True,
            raw={"id": "pi_independent_pr1"},
        )
        self.assertEqual(op.state, EffectState.INTENT_CREATED)
        self.observe_unknown(self.a, first)
        final = self.b.get("independent-pr1")
        self.assertEqual(final.state, EffectState.INTENT_CREATED)
        self.assertEqual(final.provider_reference, "pi_independent_pr1")
        self.assertIsNone(self.b.claim_retry_dispatch(
            "independent-pr1", idempotency_window_seconds=3600))

    def test_expired_original_idempotency_window_cannot_be_restarted(self):
        first = self.a.begin_dispatch("independent-pr1")
        self.observe_unknown(self.a, first)
        self.a.db.execute(
            "UPDATE operations SET dispatch_started_at=? WHERE operation_id=?",
            (time.time() - 1000, "independent-pr1"))
        self.a.db.commit()
        self.assertIsNone(self.b.claim_retry_dispatch(
            "independent-pr1", idempotency_window_seconds=60))
        self.assertEqual(self.a.get("independent-pr1").state,
                         EffectState.UNKNOWN)


if __name__ == "__main__":
    unittest.main()
