"""Independent regression: conflicting trusted positive must not overwrite first reference."""
import tempfile
import unittest
from pathlib import Path
from operation_journal import OperationJournal, EffectState

class IndependentConflictingPositive(unittest.TestCase):
    def test_conflicting_provider_positive_preserves_first_reference(self):
        with tempfile.TemporaryDirectory() as d:
            journal=OperationJournal(Path(d)/"journal.sqlite")
            try:
                op=journal.begin(amount=500,currency="usd",operation_id="independent-conflicting-positive")
                first=journal.observe(op.operation_id,state=EffectState.INTENT_CREATED,
                    lookup_method="provider_first",authority="provider",
                    provider_reference="pi_first",
                    raw={"id":"pi_first","amount":500,"currency":"usd",
                         "metadata":{"operation_id":op.operation_id}},
                    promote_provider_reference=True)
                self.assertEqual(first.provider_reference,"pi_first")
                second=journal.observe(op.operation_id,state=EffectState.INTENT_CREATED,
                    lookup_method="provider_conflict",authority="provider",
                    provider_reference="pi_second",
                    raw={"id":"pi_second","amount":500,"currency":"usd",
                         "metadata":{"operation_id":op.operation_id}},
                    promote_provider_reference=True)
                self.assertEqual(second.state,EffectState.INTENT_CREATED)
                self.assertEqual(second.provider_reference,"pi_first",
                    "Conflicting positive overwrote previously confirmed provider reference")
                evidence=list(journal.db.execute(
                    "SELECT provider_reference FROM evidence WHERE operation_id=? ORDER BY observed_at",
                    (op.operation_id,)))
                self.assertEqual(len(evidence),2)
                self.assertEqual({r["provider_reference"] for r in evidence},{"pi_first","pi_second"})
                self.assertIsNone(journal.claim_retry_dispatch(op.operation_id,
                    idempotency_window_seconds=86400,lease_seconds=60))
            finally:
                journal.db.close()

if __name__=="__main__": unittest.main()
