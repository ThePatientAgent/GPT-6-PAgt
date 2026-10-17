"""Deterministic status-check/retry race demonstration.

The model is intentionally minimal: a truthful negative status query is not
proof that an already in-flight original operation cannot commit later.
This is a model test, not a payment-provider integration or safety guarantee.
"""
import unittest


class StatusRetryRaceTest(unittest.TestCase):
    def test_negative_status_check_can_precede_two_effects(self):
        effects = []
        # Accurate at the instant of the query:
        status_committed = bool(effects)
        self.assertFalse(status_committed)
        # An earlier in-flight original request finishes after the query:
        effects.append(("original", "payment-1"))
        # Retrying on the stale negative status creates a second effect:
        if not status_committed:
            effects.append(("retry", "payment-1"))
        self.assertEqual(len(effects), 2)

    def test_atomic_provider_side_idempotency_prevents_duplicate(self):
        effects = []
        committed_keys = set()
        status_committed = False  # accurate before original finishes

        def commit(source, key):
            # Atomic check+effect is an assumption of this model.
            if key in committed_keys:
                return False
            committed_keys.add(key)
            effects.append((source, key))
            return True

        self.assertTrue(commit("original", "payment-1"))
        if not status_committed:
            self.assertFalse(commit("retry", "payment-1"))
        self.assertEqual(effects, [("original", "payment-1")])


if __name__ == "__main__":
    unittest.main()
