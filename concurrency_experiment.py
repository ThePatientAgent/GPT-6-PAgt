"""Deterministic race fixture for duplicate side effects.

Models non-atomic check-then-act and a locked single-process variant.
Not a distributed transaction implementation.
"""
import threading
from concurrent.futures import ThreadPoolExecutor


class NonAtomicService:
    def __init__(self):
        self.ledger = {}
        self.effects = 0
        self.barrier = threading.Barrier(2)

    def execute(self, operation_id):
        cached = self.ledger.get(operation_id)
        if cached is not None:
            return cached
        self.barrier.wait(timeout=5)  # Both pass the check before either commits.
        self.effects += 1
        result = self.effects
        self.ledger[operation_id] = result
        return result


class LockedService:
    def __init__(self):
        self.ledger = {}
        self.effects = 0
        self.lock = threading.Lock()

    def execute(self, operation_id):
        with self.lock:
            if operation_id in self.ledger:
                return self.ledger[operation_id]
            self.effects += 1
            self.ledger[operation_id] = self.effects
            return self.effects


def simultaneous_calls(service, operation_id):
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(service.execute, operation_id) for _ in range(2)]
        return [f.result(timeout=10) for f in futures]
