"""Conservative retry decision policy for ambiguous remote operations.

This is a deterministic reference policy, NOT a learned classifier. Untrusted tool
descriptions never establish idempotency. Trusted capability metadata is provided
out-of-band by an operator, and even that is scoped to an operation.
"""
from dataclasses import dataclass
from enum import Enum


class Decision(str, Enum):
    EXECUTE = "execute"
    RETRY = "retry"
    RECONCILE = "reconcile"
    STOP = "stop"


class Status(str, Enum):
    NOT_SENT = "not_sent"
    COMMITTED = "committed"
    NOT_COMMITTED = "not_committed"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class Evidence:
    authorized: bool
    status: Status
    idempotency_key: str | None = None
    trusted_idempotency_support: bool = False
    reconciliation_available: bool = False
    tool_description: str = ""  # Untrusted; intentionally ignored for safety.


def decide(e: Evidence) -> Decision:
    # Authorization applies to every execution, including retry.
    if not e.authorized:
        return Decision.STOP
    if e.status == Status.COMMITTED:
        return Decision.STOP
    if e.status == Status.NOT_SENT:
        return Decision.EXECUTE
    if e.status == Status.NOT_COMMITTED:
        return Decision.RETRY
    if e.status == Status.UNKNOWN:
        if e.reconciliation_available:
            return Decision.RECONCILE
        if e.trusted_idempotency_support and e.idempotency_key:
            return Decision.RETRY
        return Decision.STOP
    raise ValueError("unrecognized status")
