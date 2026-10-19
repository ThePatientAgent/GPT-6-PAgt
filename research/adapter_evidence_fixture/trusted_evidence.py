"""Synthetic signed receipt gateway. HMAC key models trusted adapter; NOT provider authentication."""
import hashlib, hmac, json, sqlite3
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

class Verdict(str, Enum):
    COMMITTED="COMMITTED"
    NOT_COMMITTED="NOT_COMMITTED"
    UNKNOWN="UNKNOWN"

@dataclass(frozen=True)
class Assessment:
    verdict: Verdict
    reason: str

class MockProvider:
    def __init__(self, secret: bytes): self._secret=secret
    def issue(self, *, operation_id, reference, verdict, observed_at, nonce, finality):
        doc=dict(schema=1,provider="mock-provider",operation=operation_id,reference=reference,
                 verdict=verdict.value,observed_at=observed_at,nonce=nonce,
                 finality=finality,lookup="transaction_status")
        payload=json.dumps(doc,sort_keys=True,separators=(",",":")).encode()
        return payload,hmac.new(self._secret,payload,hashlib.sha256).hexdigest()

class TrustedEvidenceGateway:
    """Reject forged, uncorrelated, replayed or conflicting synthetic receipts."""
    def __init__(self, secret: bytes, database: sqlite3.Connection, max_age_seconds=300):
        self._secret=secret
        self.db=database
        self.max_age_seconds=max_age_seconds
        self.db.execute("CREATE TABLE IF NOT EXISTS evidence (nonce TEXT PRIMARY KEY, operation TEXT NOT NULL, reference TEXT NOT NULL, verdict TEXT NOT NULL, digest TEXT NOT NULL)")
        self.db.commit()

    def assess(self, payload: bytes, signature: str, operation_id: str, reference: str, now: datetime) -> Assessment:
        unknown=lambda reason: Assessment(Verdict.UNKNOWN,reason)
        if not isinstance(payload,bytes) or not isinstance(signature,str):
            return unknown("invalid envelope")
        expected=hmac.new(self._secret,payload,hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected,signature):
            return unknown("invalid signature")
        try:
            doc=json.loads(payload)
            if not isinstance(doc,dict) or set(doc)!={"schema","provider","operation","reference","verdict","observed_at","nonce","finality","lookup"}:
                return unknown("invalid schema")
            if doc["schema"]!=1 or doc["provider"]!="mock-provider" or doc["lookup"]!="transaction_status":
                return unknown("invalid provider contract")
            if doc["operation"]!=operation_id or doc["reference"]!=reference:
                return unknown("operation or reference mismatch")
            if not all(isinstance(doc[k],str) and doc[k] for k in ("operation","reference","nonce")):
                return unknown("invalid identifiers")
            verdict=Verdict(doc["verdict"])
            required={Verdict.COMMITTED:"authoritative_positive",Verdict.NOT_COMMITTED:"authoritative_negative"}
            if verdict not in required or doc["finality"]!=required[verdict]:
                return unknown("nonfinal evidence")
            observed=datetime.fromisoformat(doc["observed_at"].replace("Z","+00:00"))
            if observed.tzinfo is None or now.tzinfo is None:
                return unknown("missing timezone")
            age=(now-observed).total_seconds()
            if not 0<=age<=self.max_age_seconds:
                return unknown("stale or future evidence")
        except (ValueError,TypeError,KeyError,AttributeError):
            return unknown("malformed evidence")
        digest=hashlib.sha256(payload).hexdigest()
        try:
            with self.db:
                self.db.execute("INSERT INTO evidence VALUES (?,?,?,?,?)",
                                (doc["nonce"],operation_id,reference,verdict.value,digest))
                conflict=self.db.execute(
                    "SELECT 1 FROM evidence WHERE operation=? AND (reference<>? OR verdict<>?) LIMIT 1",
                    (operation_id,reference,verdict.value)).fetchone()
                if conflict:
                    return unknown("conflicting observations")
        except sqlite3.IntegrityError:
            return unknown("replayed nonce")
        return Assessment(verdict,"authenticated synthetic evidence")
