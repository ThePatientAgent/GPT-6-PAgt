"""Minimal simulation of safe retries for ambiguous remote commits.

Educational fixture, not a production payment system.
"""
from dataclasses import dataclass, field
from enum import Enum


class CommitStatus(Enum):
    NOT_DISPATCHED = 'not_dispatched'
    COMMITTED = 'committed'
    NOT_COMMITTED = 'not_committed'
    UNKNOWN = 'unknown'


class ResponseLost(Exception):
    """The remote operation may have completed, but its reply was lost."""


class UnsafeRetry(Exception):
    """A non-idempotent retry cannot be proven safe."""


class Unauthorized(Exception):
    """The current attempt is not authorized."""


@dataclass
class FakeRemote:
    supports_idempotency: bool = True
    supports_status_query: bool = True
    ledger: dict[str, int] = field(default_factory=dict)
    effects: int = 0

    def execute(self, operation_id: str, *, drop_reply: bool = False) -> int:
        if self.supports_idempotency and operation_id in self.ledger:
            return self.ledger[operation_id]
        self.effects += 1
        result = self.effects
        # The ledger doubles as a status store; only consult it when supported.
        self.ledger[operation_id] = result
        if drop_reply:
            raise ResponseLost(operation_id)
        return result

    def query(self, operation_id: str) -> int | None:
        if not self.supports_status_query:
            raise RuntimeError('status query unavailable')
        return self.ledger.get(operation_id)


def safe_retry(remote: FakeRemote, operation_id: str, *, authorized: bool,
               prior_status: CommitStatus) -> int:
    """Authorize each attempt, then reconcile ambiguous previous outcomes."""
    if not authorized:
        raise Unauthorized(operation_id)
    if prior_status == CommitStatus.COMMITTED:
        if remote.supports_status_query:
            result = remote.query(operation_id)
            if result is not None:
                return result
        raise UnsafeRetry('prior commit confirmed; result unavailable')
    if prior_status == CommitStatus.UNKNOWN:
        if remote.supports_status_query:
            result = remote.query(operation_id)
            if result is not None:
                return result
        if not remote.supports_idempotency:
            raise UnsafeRetry('unknown commit and no idempotency guarantee')
    return remote.execute(operation_id)
