"""Regression probe for stale ambiguous evidence overwriting trusted state.

Run with PYTHONPATH=fixture against pinned operation_journal.py.
This is a deterministic journal interleaving, not a live-provider test.
"""
import tempfile
import unittest
from pathlib import Path
from operation_journal import OperationJournal, EffectState

class StaleObservationProbe(unittest.TestCase):
    def test_stale_unknown_can_regress_intent_created(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "journal.sqlite3"
            first = OperationJournal(path)
            second = OperationJournal(path)
            op = first.begin(amount=500, currency="usd", operation_id="stale-observation-probe")
            self.assertTrue(first.begin_dispatch(op.operation_id))
            # Worker A received a correlated provider response.
            confirmed = first.observe(
                op.operation_id, state=EffectState.INTENT_CREATED,
                lookup_method="create", authority="provider",
                provider_reference="pi_mock_trusted",
                raw={"id":"pi_mock_trusted","amount":500,"currency":"usd",
                     "metadata":{"operation_id":op.operation_id}},
                promote_provider_reference=True)
            self.assertEqual(confirmed.state, EffectState.INTENT_CREATED)
            # Worker B's older lost-response handler arrives later.
            regressed = second.observe(
                op.operation_id, state=EffectState.UNKNOWN,
                lookup_method="retry_response_lost", authority="application",
                provider_reference=None, raw={"error":"late stale response"})
            self.assertEqual(regressed.state, EffectState.UNKNOWN)
            self.assertEqual(regressed.provider_reference, "pi_mock_trusted")
            evidence = list(second.db.execute(
                "SELECT state FROM evidence WHERE operation_id=? ORDER BY evidence_id",
                (op.operation_id,)))
            self.assertEqual([r["state"] for r in evidence][-2:],
                             ["INTENT_CREATED", "UNKNOWN"])
            first.db.close()
            second.db.close()

if __name__ == "__main__":
    unittest.main()
