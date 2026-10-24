"""Runnable standard-library regression suite for atomicdjt's 7 recovery controls."""
import concurrent.futures
import tempfile
import threading
import unittest
from pathlib import Path
from recovery_state import MockProvider, ProviderEvidence, RecoveryStore, UnsafeTransition

class RecoveryContractTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path=Path(self.tmp.name)/'durable.sqlite'
        self.provider=MockProvider()
        self.store=RecoveryStore(self.path,self.provider)
        self.op=self.store.unknown_after_dispatch()

    def test_01_unknown_blocks_automatic_retry(self):
        self.assertFalse(self.store.authorize_retry(self.op, False))
        self.assertEqual(self.store.operation(self.op)[2],'UNKNOWN')

    def test_02_new_permit_cannot_redispatch_unresolved_operation(self):
        self.assertFalse(self.store.authorize_retry(self.op, True))
        self.store.investigate(self.op,'operator','checking records')
        self.assertFalse(self.store.authorize_retry(self.op, True))

    def test_03_weak_or_ambiguous_evidence_cannot_upgrade_unknown(self):
        for outcome,verified in [('UNKNOWN',True),('NOT_COMMITTED',False)]:
            rec=self.provider.publish_receipt(self.op,outcome,verified=verified)
            with self.assertRaises(UnsafeTransition): self.store.reconcile(self.op,rec)
        forged=ProviderEvidence(self.op,'mock-payment','made-up','NOT_COMMITTED','mock-provider-status',True)
        with self.assertRaises(UnsafeTransition): self.store.reconcile(self.op,forged)
        self.assertEqual(self.store.operation(self.op)[2],'UNKNOWN')

    def test_04_adequate_provider_receipt_reconciles(self):
        receipt=self.provider.publish_receipt(self.op,'NOT_COMMITTED')
        self.assertEqual(self.store.reconcile(self.op,receipt),'RECONCILED_NOT_COMMITTED')
        self.assertTrue(self.store.authorize_retry(self.op,True))
        self.assertFalse(self.store.authorize_retry(self.op,False))
        with self.assertRaises(UnsafeTransition): self.store.reconcile(self.op,receipt)

    def test_04b_confirmed_commit_blocks_retry(self):
        receipt=self.provider.publish_receipt(self.op,'COMMITTED')
        self.assertEqual(self.store.reconcile(self.op,receipt),'RECONCILED_COMMITTED')
        self.assertFalse(self.store.authorize_retry(self.op,True))

    def test_05_new_operation_is_linked_without_rewriting_unknown(self):
        with self.assertRaises(UnsafeTransition):
            self.store.authorize_new_operation(self.op,actor='operator',reason='urgent',acknowledges_duplicate_risk=False)
        new=self.store.authorize_new_operation(self.op,actor='operator',reason='business necessity',acknowledges_duplicate_risk=True)
        self.assertNotEqual(new,self.op)
        self.assertEqual(self.store.operation(self.op)[2],'UNKNOWN')
        self.assertEqual(self.store.operation(new)[2],'NOT_DISPATCHED')
        self.assertEqual(self.store.operation(new)[3:],(self.op,'business necessity',1))
        self.assertEqual(self.store.decision(self.op)[:2],('NEW_OPERATION_AUTHORIZED',new))
        self.assertFalse(self.store.authorize_retry(self.op,True))
        with self.assertRaises(UnsafeTransition):
            self.store.authorize_new_operation(self.op,actor='operator',reason='another action',acknowledges_duplicate_risk=True)

    def test_06_restart_preserves_unknown_history_and_risk(self):
        self.store.investigate(self.op,'alice','no reliable receipt available')
        new=self.store.authorize_new_operation(self.op,actor='alice',reason='documented exception',acknowledges_duplicate_risk=True)
        restarted=RecoveryStore(self.path,self.provider)
        self.assertEqual(restarted.operation(self.op)[2],'UNKNOWN')
        self.assertEqual(restarted.operation(new)[3],self.op)
        self.assertEqual(restarted.decision(self.op)[1],new)
        self.assertEqual([a[0] for a in restarted.history(self.op)],
                         ['DISPATCHED_RESULT_UNKNOWN','INVESTIGATING','NEW_OPERATION_AUTHORIZED'])

    def test_07_operator_and_reconciliation_race_has_one_terminal_decision(self):
        gate=threading.Barrier(2)
        evidence=self.provider.publish_receipt(self.op,'NOT_COMMITTED')
        def authorize():
            gate.wait()
            try: return ('new',self.store.authorize_new_operation(self.op,actor='alice',reason='exception',acknowledges_duplicate_risk=True))
            except UnsafeTransition: return ('blocked',None)
        def reconcile():
            gate.wait()
            try: return ('reconcile',self.store.reconcile(self.op,evidence))
            except UnsafeTransition: return ('blocked',None)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
            a=ex.submit(authorize);b=ex.submit(reconcile)
            results=[a.result(timeout=10),b.result(timeout=10)]
        self.assertEqual(sum(x[0]!='blocked' for x in results),1)
        self.assertIn(self.store.decision(self.op)[0],('RECONCILED_NOT_COMMITTED','NEW_OPERATION_AUTHORIZED'))
        decision=self.store.decision(self.op)[0]
        self.assertEqual(self.store.operation(self.op)[2],
                         'NOT_COMMITTED' if decision=='RECONCILED_NOT_COMMITTED' else 'UNKNOWN')

    def test_07b_concurrent_authorizations_are_single_use(self):
        gate=threading.Barrier(8)
        def worker(k):
            gate.wait()
            try:
                return self.store.authorize_new_operation(self.op,actor=f'op{k}',reason='exception',acknowledges_duplicate_risk=True)
            except UnsafeTransition:
                return None
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
            results=list(ex.map(worker,range(8)))
        self.assertEqual(len([x for x in results if x]),1)
        self.assertEqual(self.store.operation(self.op)[2],'UNKNOWN')

if __name__=='__main__':
    unittest.main(verbosity=2)