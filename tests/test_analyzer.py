"""Pure-Python tests for URL validation and the transparent scoring engine."""
import unittest

from cyberguard.analyzer import (
    URLValidationError, WEIGHTS, analyze, edit_distance, features_for,
    is_exact_or_subdomain, parse_url,
)


class ValidationTests(unittest.TestCase):
    def test_accepts_https_http_unicode_ipv6(self):
        for url in ('https://example.com/path?a=b', 'http://example.org:8080/',
                    'https://bücher.de/path', 'https://[::1]:443/test',
                    'HTTPS://example.com/'):
            with self.subTest(url=url):
                self.assertTrue(parse_url(url).hostname)

    def test_rejects_invalid_or_unsafe_schemes(self):
        values = [None, '', 14, 'javascript:alert(1)', 'file:///etc/passwd',
                  'ftp://example.com', 'https://', 'example.com',
                  'https://user:pass@example.com/', 'https://user@example.com/',
                  'https://a.com\\@evil.org/', 'https://a.com:abc/',
                  'https://a.com:99999/', 'https://bad_domain.com',
                  'https://a.com\n/', 'https://a.com /', ' https://a.com',
                  'https://a.com/%00\n', 'https://a.com:0/',
                  'https://a.com/' + 'z' * 2050]
        for item in values:
            with self.subTest(value=repr(item)):
                with self.assertRaises(URLValidationError):
                    parse_url(item)

    def test_normalizes_unicode_domains(self):
        self.assertIn('xn--', parse_url('https://bücher.de').hostname)

    def test_hostname_boundary(self):
        self.assertTrue(is_exact_or_subdomain('accounts.google.com', 'google.com'))
        self.assertFalse(is_exact_or_subdomain('google.com.bad.org', 'google.com'))
        self.assertFalse(is_exact_or_subdomain('fakegoogle.com', 'google.com'))


class DetectionTests(unittest.TestCase):
    def test_familiar_site_still_not_marked_guaranteed_safe(self):
        result = analyze('https://github.com/login')
        self.assertEqual(result['risk_level'], 'LOW')
        self.assertIn('does NOT establish', result['summary'])

    def test_lookalike_paypal(self):
        result = analyze('http://paypa1.com/verify/password')
        self.assertEqual(result['risk_level'], 'HIGH')
        self.assertTrue(next(x for x in result['indicators'] if x['key'] == 'lookalike_domain')['active'])

    def test_compound_lookalike(self):
        f = features_for(parse_url('https://paypa1-account.com/verify'))
        self.assertTrue(f['lookalike_domain'])

    def test_actual_brand_subdomain_not_impersonation(self):
        f = features_for(parse_url('https://accounts.google.com/login'))
        self.assertFalse(f['brand_impersonation'])
        self.assertFalse(f['lookalike_domain'])

    def test_brand_in_fake_subdomain(self):
        f = features_for(parse_url('https://paypal.com.evil.com/'))
        self.assertTrue(f['brand_impersonation'])

    def test_shortener(self):
        f = features_for(parse_url('https://bit.ly/a'))
        self.assertTrue(f['shortener'])
        self.assertFalse(f['http_only'])

    def test_ip_url(self):
        self.assertTrue(features_for(parse_url('http://192.0.2.30/login'))['ip_host'])
        self.assertTrue(features_for(parse_url('http://[::1]'))['ip_host'])

    def test_typo_not_false_positive_for_full_brand(self):
        self.assertFalse(features_for(parse_url('https://docs.python.org/'))['lookalike_domain'])

    def test_keyword_boundary(self):
        f = features_for(parse_url('https://example.com/cataloging'))
        self.assertFalse(f['sensitive_terms'])
        self.assertTrue(features_for(parse_url('https://example.com/reset'))['sensitive_terms'])

    def test_score_is_sum_of_active_contributions(self):
        for url in ['http://a.example.com/reset', 'https://bit.ly/xyz',
                    'http://[2001:db8::1]:8080/login', 'https://google.com']:
            with self.subTest(url=url):
                result = analyze(url)
                points = sum(item['points'] for item in result['indicators'])
                self.assertEqual(result['risk_score'], min(100, points))
                self.assertEqual(len(result['indicators']), len(WEIGHTS))
                self.assertEqual(result['feature_count'], sum(item['active'] for item in result['indicators']))
                self.assertIsInstance(result['risk_score'], int)

    def test_edit_distance(self):
        self.assertEqual(edit_distance('paypal', 'paypa1'), 1)
        self.assertEqual(edit_distance('google', 'google'), 0)


if __name__ == '__main__':
    unittest.main()
