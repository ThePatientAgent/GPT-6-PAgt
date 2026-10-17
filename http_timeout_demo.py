"""Localhost HTTP timeout-after-commit demonstration (no external requests).

Run: python http_timeout_demo.py

The fake payment endpoint commits before deliberately delaying its first
response. This is a controlled illustration, NOT a LangGraph integration test.
Requires retry_audit.py from this repository. No real payment is performed.
"""
import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import URLError
from urllib.request import Request, urlopen

from retry_audit import Invocation, audit_retry


class Ledger:
    def __init__(self):
        self.payments = []
        self.lock = threading.Lock()


def serve(ledger):
    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            self.rfile.read(int(self.headers.get("Content-Length", "0")))
            with ledger.lock:
                ledger.payments.append("INV-1")
                count = len(ledger.payments)
            if count == 1:
                time.sleep(0.25)  # commit before reply; client times out at 0.05s
            data = json.dumps({"payment_number": count}).encode()
            try:
                self.send_response(200)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def charge(url, timeout):
    req = Request(url, data=b"{}", method="POST")
    with urlopen(req, timeout=timeout) as response:
        return json.loads(response.read())


def run_case(guarded):
    ledger = Ledger()
    server = serve(ledger)
    url = "http://127.0.0.1:%d/pay" % server.server_address[1]
    try:
        try:
            charge(url, timeout=0.05)
            raise AssertionError("Expected first response timeout")
        except (TimeoutError, URLError):
            pass
        assert len(ledger.payments) == 1, "Payment must commit before timeout"
        verdict = None
        if guarded:
            # Real callers MUST obtain authorization/commit facts from trusted sources.
            verdict = audit_retry(Invocation(operation_id="INV-1", authorized=True,
                                             commit_status="unknown"))
            if verdict.verdict.value == "allow":
                charge(url, timeout=1)
        else:
            charge(url, timeout=1)  # naive unconditional retry
        return len(ledger.payments), verdict.verdict.value if verdict else None
    finally:
        server.shutdown()
        server.server_close()


def run():
    naive_count, _ = run_case(guarded=False)
    guarded_count, verdict = run_case(guarded=True)
    assert naive_count == 2 and guarded_count == 1 and verdict == "block"
    print(json.dumps({"naive_payment_count": naive_count,
                      "guarded_payment_count": guarded_count,
                      "guarded_verdict": verdict}, indent=2))


if __name__ == "__main__":
    run()
