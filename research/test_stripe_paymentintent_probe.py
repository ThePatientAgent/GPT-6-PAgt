import unittest
from unittest.mock import patch
import stripe_paymentintent_probe as p


class ProbeTests(unittest.TestCase):
    def test_refuses_live_key(self):
        with patch.dict("os.environ", {"STRIPE_SECRET_KEY": "sk_live_fake"}):
            with self.assertRaises(ValueError):
                p.test_key()

    def test_not_found_remains_unknown(self):
        with patch.object(p, "request", return_value={"http_status": 404, "body": {}}):
            self.assertEqual(p.reconcile("pi_example")["classification"], "UNKNOWN")

    def test_500_remains_unknown(self):
        with patch.object(p, "request", return_value={"http_status": 500, "body": {}}):
            self.assertEqual(p.reconcile("pi_example")["classification"], "UNKNOWN")

    def test_timeout_remains_unknown(self):
        with patch.object(p, "request", return_value={"http_status": None, "outcome": "UNKNOWN"}):
            self.assertEqual(p.reconcile("pi_example")["classification"], "UNKNOWN")

    def test_creation_never_confirms(self):
        with patch.object(p, "request", return_value={"http_status": 200, "body": {}}) as mock:
            p.create_probe("op1")
            self.assertEqual(mock.call_args.args[1], p.API)
            self.assertNotIn("confirm", mock.call_args.args[2])
            self.assertEqual(mock.call_args.kwargs["idempotency_key"], "tpa-pi-create-op1")

    def test_reconcile_requires_reference(self):
        with self.assertRaises(ValueError):
            p.reconcile("")


if __name__ == "__main__":
    unittest.main()
