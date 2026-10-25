"""Independent positive-evidence monotonicity regression (mock-only)."""
import tempfile
import time
import unittest
from pathlib import Path
from operation_journal import OperationJournal, EffectState

class IndependentPositiveMonotonicity(unittest.TestCase):
    def test_late_positive_then_new_owner_unknown_cannot_demote(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"journal.sqlite"
            old=OperationJournal(path)
            new=OperationJournal(path)
            try:
                op=old.begin(amount=500,currency="usd",operation_id="late-positive-monotonic")
                old_token=old.begin_dispatch(op.operation_id,lease_seconds=0)
                self.assertTrue(old_token)
                time.sleep(.01)
                new_token=new.claim_retry_dispatch(op.operation_id,idempotency_window_seconds=86400,lease_seconds=60)
                self.assertTrue(new_token)
                positive=old.observe(op.operation_id,state=EffectState.INTENT_CREATED,
                    lookup_method="late_create_response",authority="provider",
                    provider_reference="pi_verified",raw={"id":"pi_verified","amount":500,
                    "currency":"usd","metadata":{"operation_id":op.operation_id}},
                    promote_provider_reference=True,owner_token=old_token)
                self.assertEqual(positive.state,EffectState.INTENT_CREATED)
                self.assertEqual(positive.provider_reference,"pi_verified")
                stale=new.observe(op.operation_id,state=EffectState.UNKNOWN,
                    lookup_method="retry_response_lost",authority="application",
                    provider_reference=None,raw={"error":"new worker response lost"},
                    owner_token=new_token)
                self.assertEqual(stale.state,EffectState.INTENT_CREATED)
                self.assertEqual(stale.provider_reference,"pi_verified")
                rows=list(new.db.execute("SELECT state FROM evidence WHERE operation_id=? ORDER BY evidence_id",(op.operation_id,)))
                self.assertEqual([x["state"] for x in rows][-2:],["INTENT_CREATED","UNKNOWN"])
                self.assertIsNone(new.claim_retry_dispatch(op.operation_id,idempotency_window_seconds=86400,lease_seconds=60))
            finally:
                old.db.close()
                new.db.close()

if __name__=="__main__": unittest.main()
