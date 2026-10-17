"""Dependency-free retry safety audit for a tool invocation.

A deliberately conservative preflight checker. This does not execute tools,
infer provider guarantees, or substitute for a trusted gateway.
"""
from dataclasses import dataclass
from enum import Enum
import json


class Verdict(str, Enum):
    ALLOW = "allow"
    VERIFY = "verify"
    BLOCK = "block"


@dataclass(frozen=True)
class Invocation:
    operation_id: str
    authorized: bool
    commit_status: str
    trusted_idempotent: bool = False
    idempotency_key: str | None = None
    status_query_available: bool = False


@dataclass(frozen=True)
class Audit:
    verdict: Verdict
    reason: str
    operation_id: str

    def as_dict(self):
        return {"verdict": self.verdict.value, "reason": self.reason,
                "operation_id": self.operation_id}


def audit_retry(inv: Invocation) -> Audit:
    if not inv.operation_id:
        return Audit(Verdict.BLOCK, "missing_operation_id", inv.operation_id)
    if not inv.authorized:
        return Audit(Verdict.BLOCK, "authorization_missing", inv.operation_id)
    if inv.commit_status == "committed":
        return Audit(Verdict.BLOCK, "already_committed", inv.operation_id)
    if inv.commit_status == "not_committed":
        return Audit(Verdict.ALLOW, "confirmed_not_committed", inv.operation_id)
    if inv.commit_status != "unknown":
        return Audit(Verdict.BLOCK, "invalid_commit_status", inv.operation_id)
    if inv.status_query_available:
        return Audit(Verdict.VERIFY, "reconcile_before_retry", inv.operation_id)
    if inv.trusted_idempotent and inv.idempotency_key:
        return Audit(Verdict.ALLOW, "trusted_idempotency_key", inv.operation_id)
    return Audit(Verdict.BLOCK, "ambiguous_unsafe_retry", inv.operation_id)


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Audit a proposed retry; never executes it")
    parser.add_argument("json_file", help="Path to JSON file containing an invocation")
    args = parser.parse_args()
    with open(args.json_file, encoding="utf-8") as f:
        data = json.load(f)
    # Reject unknown keys, missing required keys, and incorrect types.
    expected = {"operation_id", "authorized", "commit_status",
                "trusted_idempotent", "idempotency_key", "status_query_available"}
    if set(data) - expected:
        parser.error("unknown fields in input")
    if not isinstance(data.get("operation_id"), str):
        parser.error("operation_id must be a string")
    if type(data.get("authorized")) is not bool:
        parser.error("authorized must be a boolean")
    if not isinstance(data.get("commit_status"), str):
        parser.error("commit_status must be a string")
    for field in ("trusted_idempotent", "status_query_available"):
        if field in data and type(data[field]) is not bool:
            parser.error(field + " must be a boolean")
    if "idempotency_key" in data and data["idempotency_key"] is not None and not isinstance(data["idempotency_key"], str):
        parser.error("idempotency_key must be a string or null")
    print(json.dumps(audit_retry(Invocation(**data)).as_dict(), indent=2))


if __name__ == "__main__":
    main()
