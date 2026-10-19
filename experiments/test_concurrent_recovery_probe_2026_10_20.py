"""Independent two-worker recovery probe for atomicdjt fixture at fd931767.

Run only against a local copy of the collaborator's pinned fixture:
  python -m unittest -v test_concurrent_recovery_probe.py

Requires operation_journal.py on PYTHONPATH. This is a mock-only concurrency
probe. It does not exercise Stripe and is not proof of double payment.
"""
import tempfile
import threading
import unittest
from pathlib import Path
from operation_journal import OperationJournal, PaymentIntentBoundary, LostResponse


class BarrierGateway:
    def __init__(self):
        self.lock = threading.Lock()
        self.calls = []
        self.first = True
        self.both_retries = threading.Event()

    def create_payment_intent(self, *, amount, currency, idempotency_key, metadata):
        with self.lock:
            self.calls.append(idempotency_key)
            call_number = len(self.calls)
        if call_number == 1:
            raise LostResponse("ambiguous first dispatch")
        if call_number >= 3:
            self.both_retries.set()
        # Block retry calls until both workers have reached the provider,
        # or timeout so the test never hangs.
        self.both_retries.wait(timeout=2)
        return {"id": "pi_mock_1", "amount": amount, "currency": currency,
                "metadata": dict(metadata), "status": "requires_payment_method"}

    def retrieve_payment_intent(self, provider_reference):
        return None


class ConcurrentRecoveryProbe(unittest.TestCase):
    def test_two_workers_can_both_reach_provider_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "journal.sqlite3"
            gateway = BarrierGateway()
            initial = PaymentIntentBoundary(OperationJournal(path), gateway)
            operation = initial.create(amount=500, currency="usd", operation_id="concurrent-recovery-probe")
            self.assertEqual(operation.state.value, "UNKNOWN")
            initial.journal.db.close()

            barrier = threading.Barrier(3)
            results, errors = [], []
            def worker():
                journal = OperationJournal(path)
                try:
                    boundary = PaymentIntentBoundary(journal, gateway)
                    barrier.wait(timeout=5)
                    results.append(boundary.recover(operation.operation_id))
                except BaseException as exc:
                    errors.append(exc)
                finally:
                    journal.db.close()

            threads = [threading.Thread(target=worker) for _ in range(2)]
            for thread in threads: thread.start()
            barrier.wait(timeout=5)
            for thread in threads: thread.join(timeout=8)
            self.assertFalse(any(thread.is_alive() for thread in threads), "workers hung")
            self.assertFalse(errors, repr(errors))
            # First call was deliberately ambiguous. The assertion below checks
            # whether BOTH recovery workers dispatched, not whether the provider
            # created two intents. Same idempotency key may deduplicate upstream.
            self.assertEqual(len(gateway.calls), 3, f"provider call history: {gateway.calls}")
            self.assertEqual(len(set(gateway.calls)), 1, "idempotency key must remain stable")


if __name__ == "__main__":
    unittest.main()
