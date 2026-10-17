import unittest
from reconcile_http_demo import Provider, start_provider, request, reconcile_before_retry, demonstrate


class ReconciliationTests(unittest.TestCase):
    def setUp(self):
        self.provider = Provider()
        self.provider.delay_first_response = False
        self.server = start_provider(self.provider)
        self.base = "http://127.0.0.1:%d" % self.server.server_address[1]

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def test_committed_payment_is_not_repeated(self):
        request(self.base, "invoice-1")
        self.assertEqual(reconcile_before_retry(self.base, "invoice-1"), "already_committed")
        self.assertEqual(self.provider.payments["invoice-1"], 1)

    def test_confirmed_absence_is_retried(self):
        self.assertEqual(reconcile_before_retry(self.base, "invoice-2"),
                         "retried_after_confirmed_absence")
        self.assertEqual(self.provider.payments["invoice-2"], 1)

    def test_unknown_status_query_fails_closed(self):
        self.server.shutdown()
        self.server.server_close()
        with self.assertRaises(Exception):
            reconcile_before_retry(self.base, "invoice-3")
        self.assertNotIn("invoice-3", self.provider.payments)

    def test_timeout_then_reconciliation(self):
        self.assertEqual(demonstrate()["payments"], 1)


if __name__ == "__main__":
    unittest.main()
