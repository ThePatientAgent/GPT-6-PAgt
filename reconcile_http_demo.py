"""Localhost-only payment reconciliation demonstration. Python 3.10+."""
import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


class Provider:
    def __init__(self):
        self.payments = {}
        self.lock = threading.Lock()
        self.delay_first_response = True


def start_provider(provider):
    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            data = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            key = data["operation_id"]
            with provider.lock:
                provider.payments[key] = provider.payments.get(key, 0) + 1
                count = provider.payments[key]
            if provider.delay_first_response and count == 1:
                time.sleep(0.2)
            self.respond({"operation_id": key, "attempts": count})

        def do_GET(self):
            key = urlsplit(self.path).path.removeprefix("/status/")
            with provider.lock:
                count = provider.payments.get(key, 0)
            self.respond({"committed": count > 0, "attempts": count})

        def respond(self, obj):
            data = json.dumps(obj).encode()
            try:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
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


def request(base, key, method="POST", timeout=1):
    if method == "POST":
        req = Request(base + "/pay", data=json.dumps({"operation_id": key}).encode(),
                      headers={"Content-Type": "application/json"}, method="POST")
    else:
        req = Request(base + "/status/" + key, method="GET")
    with urlopen(req, timeout=timeout) as res:
        return json.load(res)


def reconcile_before_retry(base, key):
    """Assumes a trusted, authoritative, strongly consistent status endpoint."""
    status = request(base, key, method="GET")
    if status["committed"]:
        return "already_committed"
    request(base, key, method="POST")
    return "retried_after_confirmed_absence"


def demonstrate():
    provider = Provider()
    server = start_provider(provider)
    base = "http://127.0.0.1:%d" % server.server_address[1]
    try:
        try:
            request(base, "invoice-1", timeout=0.05)
            raise AssertionError("Expected timeout")
        except TimeoutError:
            pass
        result = reconcile_before_retry(base, "invoice-1")
        with provider.lock:
            count = provider.payments["invoice-1"]
        assert result == "already_committed" and count == 1
        return {"timeout_then_reconcile": result, "payments": count}
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    print(json.dumps(demonstrate(), indent=2))
