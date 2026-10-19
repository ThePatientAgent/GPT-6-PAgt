"""Opt-in Stripe TEST MODE PaymentIntent creation/retrieval probe.

Educational diagnostic, not production-safe reconciliation. Never confirms a
PaymentIntent, charges a card, or automatically retries an ambiguous request.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid

API = "https://api.stripe.com/v1/payment_intents"


def test_key():
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    if not key.startswith("sk_test_"):
        raise ValueError("Only Stripe sk_test_ keys are accepted")
    return key


def request(method, url, data=None, idempotency_key=None):
    key = test_key()
    headers = {"Authorization": "Bearer " + key}
    if data is not None:
        data = urllib.parse.urlencode(data).encode("ascii")
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return {"http_status": response.status, "body": json.loads(response.read())}
    except urllib.error.HTTPError as e:
        return {"http_status": e.code, "body": json.loads(e.read())}
    except (TimeoutError, OSError) as e:
        return {"http_status": None, "outcome": "UNKNOWN", "error_type": type(e).__name__}


def create_probe(operation_id):
    # Creation only: no confirmation, payment method, or charge.
    return request("POST", API, {
        "amount": "100",
        "currency": "usd",
        "metadata[operation_id]": operation_id,
        "description": "THE PATIENT AGENT test-mode research; no confirmation",
    }, idempotency_key="tpa-pi-create-" + operation_id)


def reconcile(payment_intent_id):
    if not payment_intent_id.startswith("pi_"):
        raise ValueError("PaymentIntent reference required")
    result = request("GET", API + "/" + urllib.parse.quote(payment_intent_id, safe=""))
    if result["http_status"] is None or result["http_status"] >= 500:
        return {"classification": "UNKNOWN", "evidence": result}
    if result["http_status"] == 404:
        return {"classification": "UNKNOWN", "reason": "not_found_is_not_proof_of_no_effect"}
    if result["http_status"] != 200:
        return {"classification": "UNKNOWN", "evidence": result}
    body = result["body"]
    return {
        "classification": "OBSERVED",
        "id": body.get("id"),
        "status": body.get("status"),
        "operation_id": body.get("metadata", {}).get("operation_id"),
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--create-unconfirmed", action="store_true")
    parser.add_argument("--reconcile", metavar="PI_ID")
    args = parser.parse_args()
    if args.create_unconfirmed == bool(args.reconcile):
        parser.error("select exactly one of --create-unconfirmed or --reconcile")
    result = create_probe(str(uuid.uuid4())) if args.create_unconfirmed else reconcile(args.reconcile)
    print(json.dumps(result, indent=2))
