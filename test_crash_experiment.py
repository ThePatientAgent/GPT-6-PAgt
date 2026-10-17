import unittest
from crash_experiment import AtomicLedgerService, SimulatedCrash, SplitLedgerService


class CrashWindowTests(unittest.TestCase):
    def test_split_ledger_crash_causes_duplicate_after_retry(self):
        svc = SplitLedgerService()
        with self.assertRaises(SimulatedCrash):
            svc.execute('op-1', crash_after_effect=True)
        svc.execute('op-1')
        self.assertEqual(svc.effects, 2)

    def test_atomic_commit_crash_then_retry_has_one_effect(self):
        svc = AtomicLedgerService()
        with self.assertRaises(SimulatedCrash):
            svc.execute('op-2', crash_before_commit=True)
        svc.execute('op-2')
        self.assertEqual(svc.effects, 1)

    def test_atomic_duplicate_retry_does_not_reapply(self):
        svc = AtomicLedgerService()
        svc.execute('op-3')
        svc.execute('op-3')
        self.assertEqual(svc.effects, 1)


if __name__ == '__main__':
    unittest.main()
