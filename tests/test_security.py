import random
import socket
import unittest
from unittest.mock import patch

from cyberguard.analyzer import analyze, URLValidationError


class SecurityTests(unittest.TestCase):
    def test_scanning_does_not_connect_to_any_host(self):
        with patch.object(socket.socket, 'connect', side_effect=AssertionError('unexpected network access')):
            with patch.object(socket, 'create_connection', side_effect=AssertionError('unexpected network access')):
                result = analyze('https://192.0.2.1/login?redirect=https%3A%2F%2Fevil.example')
                self.assertGreater(result['risk_score'], 0)

    def test_url_body_is_data_not_html(self):
        url = 'https://example.com/%3Cscript%3Ealert(1)%3C/script%3E'
        result = analyze(url)
        self.assertEqual(result['url'], url)
        self.assertEqual(result['hostname'], 'example.com')

    def test_random_invalid_inputs_do_not_crash(self):
        rnd = random.Random(120)
        alphabet = '\\x00@#:[ ]\\\\.%&?='
        for _ in range(100):
            candidate = ''.join(rnd.choice(alphabet) for _ in range(rnd.randint(0, 50)))
            try:
                result = analyze(candidate)
                self.assertLessEqual(result['risk_score'], 100)
            except URLValidationError:
                pass


if __name__ == '__main__':
    unittest.main()
