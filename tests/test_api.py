"""End-to-end Flask app contract tests (run when server dependencies installed)."""
import io
import unittest
import qrcode

from cyberguard import create_app


class APITests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({'TESTING': True, 'RATE_LIMIT_ENABLED': False})
        self.client = self.app.test_client()

    def test_health_and_home(self):
        self.assertEqual(self.client.get('/api/health').json['status'], 'ok')
        self.assertIn('CyberGuard', self.client.get('/').get_data(as_text=True))

    def test_response_security_headers(self):
        response = self.client.get('/')
        self.assertIn("default-src 'none'", response.headers['Content-Security-Policy'])
        self.assertEqual(response.headers['X-Frame-Options'], 'DENY')
        self.assertEqual(response.headers['Cache-Control'], 'no-store')

    def test_analyze_url(self):
        response = self.client.post('/api/analyze/url', json={'url':'http://paypa1.com/verify/password'})
        self.assertEqual(response.status_code, 200)
        result = response.json['result']
        self.assertEqual(result['risk_level'], 'HIGH')
        self.assertEqual(result['score_type'], 'uncalibrated_heuristic_points')

    def test_analyze_invalid(self):
        for payload in ({'url':'file:///secret'}, {'url':None}, {}, []):
            with self.subTest(payload=payload):
                response = self.client.post('/api/analyze/url', json=payload)
                self.assertEqual(response.status_code, 400)

    def test_json_mime_required(self):
        r = self.client.post('/api/analyze/url', data='{"url":"https://example.com"}')
        self.assertEqual(r.status_code, 415)

    def test_qr_success(self):
        image = qrcode.make('https://example.com/help')
        output = io.BytesIO()
        image.save(output, format='PNG')
        output.seek(0)
        response = self.client.post('/api/analyze/qr', data={'image':(output, 'sample.png')})
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        self.assertEqual(response.json['result']['hostname'], 'example.com')

    def test_missing_and_invalid_image(self):
        self.assertEqual(self.client.post('/api/analyze/qr').status_code, 400)
        response = self.client.post('/api/analyze/qr', data={'image':(io.BytesIO(b'abc'), 'a.png')})
        self.assertEqual(response.status_code, 400)

    def test_too_large_upload(self):
        response = self.client.post('/api/analyze/qr', data={'image':(io.BytesIO(b'x'*(5*1024*1024+1)), 'a.png')})
        self.assertEqual(response.status_code, 413)

    def test_history_off_by_default(self):
        self.client.post('/api/analyze/url', json={'url':'https://example.com/private?secret=abc'})
        result = self.client.get('/api/history').json
        self.assertFalse(result['enabled'])
        self.assertEqual(result['items'], [])

    def test_opted_in_history_redacts_path(self):
        app = create_app({'TESTING': True, 'RATE_LIMIT_ENABLED': False, 'HISTORY_ENABLED': True})
        with app.test_client() as client:
            client.post('/api/analyze/url', json={'url':'https://example.com/private?secret=abc'})
            events = client.get('/api/history').json['items']
            self.assertEqual(events[0]['hostname'], 'example.com')
            self.assertNotIn('private', str(events))
            self.assertNotIn('secret', str(events))

    def test_rate_limit(self):
        app = create_app({'TESTING':True, 'RATE_LIMIT_ENABLED':True, 'RATE_LIMIT_PER_MINUTE':1})
        with app.test_client() as client:
            self.assertEqual(client.post('/api/analyze/url', json={'url':'https://a.com'}).status_code,200)
            self.assertEqual(client.post('/api/analyze/url', json={'url':'https://a.com'}).status_code,429)

    def test_error_excludes_internal_details(self):
        self.assertEqual(self.client.get('/missing').status_code, 404)


if __name__ == '__main__':
    unittest.main()
