import unittest

from concurrency_experiment import (
    LockedService, NonAtomicService, simultaneous_calls
)


class ConcurrentIdempotencyTests(unittest.TestCase):
    def test_check_then_act_race_duplicates_effect(self):
        service = NonAtomicService()
        simultaneous_calls(service, 'same-operation')
        self.assertEqual(service.effects, 2)

    def test_lock_prevents_duplicate_effect(self):
        service = LockedService()
        self.assertEqual(simultaneous_calls(service, 'same-operation'), [1, 1])
        self.assertEqual(service.effects, 1)

    def test_distinct_operations_each_commit(self):
        service = LockedService()
        self.assertEqual(service.execute('a'), 1)
        self.assertEqual(service.execute('b'), 2)
        self.assertEqual(service.effects, 2)


if __name__ == '__main__':
    unittest.main()
