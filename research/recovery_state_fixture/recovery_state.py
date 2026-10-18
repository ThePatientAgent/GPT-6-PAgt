"""The Patient Agent: synthetic durable recovery-state contract.

NOT a CrewAI integration, a real provider adapter, or exactly-once guarantee.
The simulated provider's authoritative receipt store stands in for real trusted
provider evidence. UNKNOWN does not imply NOT_COMMITTED, even after approval.
"""
from __future__ import annotations
from dataclasses import dataclass
from contextlib import contextmanager
import sqlite3
from pathlib import Path
from uuid import uuid4
from typing import Literal

Outcome = Literal['COMMITTED', 'NOT_COMMITTED', 'UNKNOWN']
Decision = Literal['RECONCILED_COMMITTED', 'RECONCILED_NOT_COMMITTED', 'NEW_OPERATION_AUTHORIZED', 'ABANDONED_UNRESOLVED']

class UnsafeTransition(Exception):
    pass

@dataclass(frozen=True)
class ProviderEvidence:
    operation_id: str
    provider: str
    receipt_id: str
    outcome: Outcome
    source: str
    verified: bool

class MockProvider:
    """Controlled provider fixture: evidence is only accepted if lookup verifies it."""
    def __init__(self, provider: str='mock-payment'):
        self.provider = provider
        self._receipts: dict[str, ProviderEvidence] = {}

    def publish_receipt(self, op_id: str, outcome: Outcome, *, verified: bool=True) -> ProviderEvidence:
        receipt=ProviderEvidence(op_id, self.provider, str(uuid4()), outcome, 'mock-provider-status', verified)
        self._receipts[receipt.receipt_id]=receipt
        return receipt

    def attest(self, evidence: ProviderEvidence, operation_id: str, provider: str) -> bool:
        return (self._receipts.get(evidence.receipt_id)==evidence and evidence.verified
                and evidence.operation_id==operation_id and evidence.provider==provider
                and evidence.source=='mock-provider-status' and evidence.outcome in ('COMMITTED','NOT_COMMITTED'))

class RecoveryStore:
    """An orchestration-owned state machine with atomic, durable decisions."""
    def __init__(self, path: str | Path, adapter: MockProvider):
        self.path=str(path)
        self.adapter=adapter
        with self._conn() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS operations (
                id TEXT PRIMARY KEY, provider TEXT NOT NULL, outcome TEXT NOT NULL,
                predecessor_id TEXT REFERENCES operations(id),
                recovery_reason TEXT, residual_risk INTEGER NOT NULL DEFAULT 0,
                CHECK (outcome IN ('NOT_DISPATCHED','UNKNOWN','COMMITTED','NOT_COMMITTED'))
            );
            CREATE TABLE IF NOT EXISTS decisions (
                op_id TEXT PRIMARY KEY REFERENCES operations(id),
                kind TEXT NOT NULL, linked_new_op TEXT, evidence_receipt TEXT,
                actor TEXT NOT NULL, rationale TEXT NOT NULL,
                CHECK (kind IN ('RECONCILED_COMMITTED','RECONCILED_NOT_COMMITTED',
                    'NEW_OPERATION_AUTHORIZED','ABANDONED_UNRESOLVED'))
            );
            CREATE TABLE IF NOT EXISTS audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT, op_id TEXT NOT NULL,
                action TEXT NOT NULL, detail TEXT NOT NULL
            );
            ''')

    @contextmanager
    def _conn(self):
        conn=sqlite3.connect(self.path, timeout=8.0, isolation_level=None)
        try:
            conn.execute('PRAGMA busy_timeout=8000')
            conn.execute('PRAGMA foreign_keys=ON')
            yield conn
        finally:
            conn.close()

    @staticmethod
    def _begin(db):
        db.execute('BEGIN IMMEDIATE')

    @staticmethod
    def _require_unknown_open(db, op_id: str) -> tuple[str, str]:
        row=db.execute('SELECT provider,outcome FROM operations WHERE id=?',(op_id,)).fetchone()
        if row is None or row[1]!='UNKNOWN':
            raise UnsafeTransition('operation is absent or no longer UNKNOWN')
        if db.execute('SELECT 1 FROM decisions WHERE op_id=?',(op_id,)).fetchone():
            raise UnsafeTransition('operation already has a terminal recovery decision')
        return row

    def unknown_after_dispatch(self, provider='mock-payment', op_id: str | None=None) -> str:
        op_id=op_id or str(uuid4())
        with self._conn() as db:
            self._begin(db)
            db.execute('INSERT INTO operations(id,provider,outcome) VALUES (?,?,?)',(op_id,provider,'UNKNOWN'))
            db.execute('INSERT INTO audit(op_id,action,detail) VALUES (?,?,?)',(op_id,'DISPATCHED_RESULT_UNKNOWN','original dispatch only; result unavailable'))
            db.commit()
        return op_id

    def authorize_retry(self, op_id: str, fresh_permit: bool) -> bool:
        """Pre-dispatch gate; a fresh permit never establishes missing commit evidence."""
        with self._conn() as db:
            op=db.execute('SELECT outcome FROM operations WHERE id=?',(op_id,)).fetchone()
            decision=db.execute('SELECT kind FROM decisions WHERE op_id=?',(op_id,)).fetchone()
        return bool(fresh_permit and op and op[0]=='NOT_COMMITTED' and decision and decision[0]=='RECONCILED_NOT_COMMITTED')

    def investigate(self, op_id: str, actor: str, note: str):
        with self._conn() as db:
            self._begin(db)
            self._require_unknown_open(db,op_id)
            db.execute('INSERT INTO audit(op_id,action,detail) VALUES (?,?,?)',(op_id,'INVESTIGATING',f'{actor}: {note}'))
            db.commit()

    def reconcile(self, op_id: str, evidence: ProviderEvidence, actor='reconciler') -> Decision:
        with self._conn() as db:
            self._begin(db)
            provider,_=self._require_unknown_open(db,op_id)
            if not self.adapter.attest(evidence,op_id,provider):
                raise UnsafeTransition('unverified, ambiguous, mismatched or missing provider evidence')
            decision: Decision='RECONCILED_'+evidence.outcome  # type: ignore[assignment]
            db.execute('INSERT INTO decisions(op_id,kind,evidence_receipt,actor,rationale) VALUES (?,?,?,?,?)',
                       (op_id,decision,evidence.receipt_id,actor,'verified provider receipt'))
            db.execute('UPDATE operations SET outcome=? WHERE id=?',(evidence.outcome,op_id))
            db.execute('INSERT INTO audit(op_id,action,detail) VALUES (?,?,?)',
                       (op_id,decision,f'receipt_id={evidence.receipt_id}; provider={provider}'))
            db.commit()
        return decision

    def authorize_new_operation(self, unresolved_id: str, *, actor: str, reason: str,
                                acknowledges_duplicate_risk: bool) -> str:
        if not reason.strip() or not actor.strip() or not acknowledges_duplicate_risk:
            raise UnsafeTransition('operator rationale and explicit residual-risk acknowledgment required')
        new_id=str(uuid4())
        with self._conn() as db:
            self._begin(db)
            provider,_=self._require_unknown_open(db,unresolved_id)
            db.execute('INSERT INTO operations(id,provider,outcome,predecessor_id,recovery_reason,residual_risk) VALUES (?,?,?,?,?,1)',
                       (new_id,provider,'NOT_DISPATCHED',unresolved_id,reason))
            db.execute('INSERT INTO decisions(op_id,kind,linked_new_op,actor,rationale) VALUES (?,?,?,?,?)',
                       (unresolved_id,'NEW_OPERATION_AUTHORIZED',new_id,actor,reason))
            db.execute('INSERT INTO audit(op_id,action,detail) VALUES (?,?,?)',
                       (unresolved_id,'NEW_OPERATION_AUTHORIZED',f'new={new_id}; risk=TRUE; actor={actor}; reason={reason}'))
            db.commit()
        return new_id

    def abandon(self, op_id: str, actor: str, reason: str):
        if not reason.strip(): raise UnsafeTransition('a reason is required')
        with self._conn() as db:
            self._begin(db)
            self._require_unknown_open(db,op_id)
            db.execute('INSERT INTO decisions(op_id,kind,actor,rationale) VALUES (?,?,?,?)',
                       (op_id,'ABANDONED_UNRESOLVED',actor,reason))
            db.execute('INSERT INTO audit(op_id,action,detail) VALUES (?,?,?)',(op_id,'ABANDONED_UNRESOLVED',reason))
            db.commit()

    def operation(self, op_id: str):
        with self._conn() as db:
            return db.execute('SELECT id,provider,outcome,predecessor_id,recovery_reason,residual_risk FROM operations WHERE id=?',(op_id,)).fetchone()

    def decision(self, op_id: str):
        with self._conn() as db:
            return db.execute('SELECT kind,linked_new_op,evidence_receipt FROM decisions WHERE op_id=?',(op_id,)).fetchone()

    def history(self, op_id: str):
        with self._conn() as db:
            return db.execute('SELECT action,detail FROM audit WHERE op_id=? ORDER BY id',(op_id,)).fetchall()