"""Crash-window experiment: idempotency needs an atomic effect+record boundary.

Educational model of a crash after an external effect but before recording its
idempotency key. It deliberately does not model a real transactional database.
"""
from dataclasses import dataclass, field


class SimulatedCrash(RuntimeError):
    pass


@dataclass
class SplitLedgerService:
    effects: int = 0
    recorded: set[str] = field(default_factory=set)

    def execute(self, operation_id: str, *, crash_after_effect: bool = False) -> None:
        if operation_id in self.recorded:
            return
        self.effects += 1
        if crash_after_effect:
            raise SimulatedCrash('effect committed; ledger update lost')
        self.recorded.add(operation_id)


@dataclass
class AtomicLedgerService:
    effects: int = 0
    recorded: set[str] = field(default_factory=set)

    def execute(self, operation_id: str, *, crash_before_commit: bool = False) -> None:
        if operation_id in self.recorded:
            return
        if crash_before_commit:
            raise SimulatedCrash('transaction aborted before commit')
        # Conceptual single atomic commit: both changes become visible together.
        self.effects += 1
        self.recorded.add(operation_id)
