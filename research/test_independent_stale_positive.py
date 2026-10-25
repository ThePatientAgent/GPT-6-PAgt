"""Independent adversarial test: a late trusted positive from a stale owner.

A provider-confirmed response may arrive after a newer worker acquires the
lease. Verify that an old owner's callback cannot release the new lease.
Mock-only, no Stripe credentials or real payments.
"""
import tempfile
import time
import unittest
from pathlib import Path
from operation_journal import OperationJournal, EffectState

class IndependentLatePositiveTests(unittest.TestCase):
    def test_stale_positive_cannot_release_new_owner_lease(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"journal.sqlite"
            old=OperationJournal(path)
            new=OperationJournal(path)
            try:
                op=old.begin(amount=500,currency="usd",operation_id="independent-stale-positive")
                token_old=old.begin_dispatch(op.operation_id,lease_seconds=0)
                self.assertTrue(token_old)
                time.sleep(.01)
                token_new=new.claim_retry_dispatch(op.operation_id,idempotency_window_seconds=86400,lease_seconds=60)
                self.assertTrue(token_new)
                self.assertNotEqual(token_old,token_new)
                old.observe(op.operation_id,state=EffectState.INTENT_CREATED,
                    lookup_method="late_create_response",authority="provider",
                    provider_reference="pi_late",raw={"id":"pi_late","amount":500,
                    "currency":"usd","metadata":{"operation_id":op.operation_id}},
                    promote_provider_reference=True,owner_token=token_old)
                row=new.db.execute("SELECT dispatch_owner_token,dispatch_generation FROM operations WHERE operation_id=?",(op.operation_id,)).fetchone()
                self.assertEqual(row["dispatch_owner_token"],token_new,
                    "STALE OWNER RELEASED THE NEW WORKER LEASE")
                self.assertEqual(row["dispatch_generation"],2)
            finally:
                old.db.close();new.db.close()

if __name__=="__main__": unittest.main()
