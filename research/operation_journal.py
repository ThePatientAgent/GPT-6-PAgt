"""Educational SQLite operation journal; no provider effects or automatic retries.

Single-process research fixture only: not a production recovery coordinator.
"""
import sqlite3
import time
import uuid

class Journal:
    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.execute('PRAGMA busy_timeout=5000')
        self.db.execute('CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, state TEXT NOT NULL, provider_ref TEXT, predecessor TEXT, created REAL NOT NULL)')
        self.db.commit()

    def begin(self, operation_id=None):
        op = operation_id or str(uuid.uuid4())
        with self.db:
            self.db.execute('INSERT INTO operations VALUES (?, ?, ?, ?, ?)', (op, 'DISPATCHED', None, None, time.time()))
        return op

    def get(self, operation_id):
        row = self.db.execute('SELECT state, provider_ref, predecessor FROM operations WHERE id=?', (operation_id,)).fetchone()
        return dict(zip(('state','provider_ref','predecessor'), row)) if row else None

    def record_unknown(self, operation_id, provider_ref=None):
        with self.db:
            cur = self.db.execute("UPDATE operations SET state='UNKNOWN', provider_ref=COALESCE(?,provider_ref) WHERE id=? AND state='DISPATCHED'", (provider_ref, operation_id))
            if cur.rowcount != 1:
                raise ValueError('operation must be DISPATCHED')

    def reconcile_observed(self, operation_id, provider_ref, observed_operation_id):
        if observed_operation_id != operation_id:
            raise ValueError('uncorrelated evidence')
        with self.db:
            cur = self.db.execute("UPDATE operations SET state='OBSERVED', provider_ref=? WHERE id=? AND state='UNKNOWN'", (provider_ref, operation_id))
            if cur.rowcount != 1:
                raise ValueError('operation must be UNKNOWN')

    def authorize_new(self, predecessor, acknowledged_duplicate_risk):
        if acknowledged_duplicate_risk is not True:
            raise ValueError('explicit risk acknowledgement required')
        new_id = str(uuid.uuid4())
        with self.db:
            prior = self.db.execute('SELECT state FROM operations WHERE id=?', (predecessor,)).fetchone()
            if prior != ('UNKNOWN',):
                raise ValueError('predecessor must remain UNKNOWN')
            self.db.execute('INSERT INTO operations VALUES (?, ?, ?, ?, ?)', (new_id, 'AUTHORIZED_NEW', None, predecessor, time.time()))
        return new_id
