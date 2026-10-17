import unittest
from fault_injection import simulate


class FaultInjectionTests(unittest.TestCase):
    def test_deterministic_seed(self):
        self.assertEqual(simulate("blind_retry", trials=100, seed=17),
                         simulate("blind_retry", trials=100, seed=17))

    def test_blind_retry_duplicates_when_everything_commits_and_response_lost(self):
        m = simulate("blind_retry", trials=100, commit_probability=1,
                     response_loss_probability=1)
        self.assertEqual(m.duplicate_effects, 100)
        self.assertEqual(m.incomplete_operations, 0)

    def test_stop_prevents_duplicates_but_may_not_complete(self):
        m = simulate("stop_on_unknown", trials=100, commit_probability=0,
                     response_loss_probability=1)
        self.assertEqual(m.duplicate_effects, 0)
        self.assertEqual(m.incomplete_operations, 100)

    def test_perfect_reconciliation_avoids_both(self):
        m = simulate("reconcile_first", trials=100, commit_probability=0,
                     response_loss_probability=1, status_availability=1)
        self.assertEqual(m.duplicate_effects, 0)
        self.assertEqual(m.incomplete_operations, 0)

    def test_no_reconciliation_matches_stop(self):
        a = simulate("reconcile_first", trials=100, commit_probability=0,
                     response_loss_probability=1, status_availability=0)
        self.assertEqual(a.incomplete_operations, 100)
        self.assertEqual(a.duplicate_effects, 0)

    def test_invalid_parameters_rejected(self):
        with self.assertRaises(ValueError):
            simulate("invented")
        with self.assertRaises(ValueError):
            simulate("blind_retry", trials=0)
        with self.assertRaises(ValueError):
            simulate("blind_retry", response_loss_probability=1.1)


if __name__ == "__main__":
    unittest.main()
