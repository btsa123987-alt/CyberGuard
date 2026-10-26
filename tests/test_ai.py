"""Unit/integration tests for the optional opt-in AI and offline RAG layer."""
from __future__ import annotations

import io
import json

import pytest

from app import create_app
from ai_assistant import AIError, claude_ready, create_token, explain_with_claude, verify_token
from analyzer import analyze
from security_knowledge import VALID_KEYS, retrieve


@pytest.fixture
def client():
    return create_app({"TESTING": True, "RATE_LIMIT_ENABLED": False}).test_client()


def get_token(client, url="http://paypa1.example/verify/password?session=secret-123"):
    response = client.post('/api/analyze/url', json={'url': url})
    assert response.status_code == 200
    return response.json['ai_context_token']


def test_missing_key_is_an_explicit_status(client, monkeypatch):
    monkeypatch.delenv('ANTHROPIC_API_KEY', raising=False)
    data = client.get('/api/ai/status').json
    assert data['claude_configured'] is False
    assert data['rag_enabled'] is True
    assert data['confidence_status'] == 'not_calibrated'
    assert 'ANTHROPIC_API_KEY' not in json.dumps(data)


def test_url_token_excludes_path_query_and_username_data(client):
    token = get_token(client)
    # The raw token is signed and compressed; retrieve endpoints prove what it holds.
    knowledge = client.post('/api/ai/knowledge', json={'token': token})
    assert knowledge.status_code == 200
    result = knowledge.json['result']
    assert result['retrieval_mode'] == 'offline_rule_keyed_reference_retrieval'
    assert result['evidence_coverage']['active_flags'] == 3
    assert len(result['documents']) >= 1
    assert 'session=secret-123' not in json.dumps(result)
    assert all(doc['url'].startswith('https://') for doc in result['documents'])


def test_consent_is_mandatory_even_with_api_key(client, monkeypatch):
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'test-key')
    token = get_token(client)
    response = client.post('/api/ai/assess', json={'token': token})
    assert response.status_code == 403
    assert response.json['error'] == 'consent_required'
    response = client.post('/api/ai/assess', json={'token': token, 'consent': False})
    assert response.status_code == 403


def test_offline_rag_and_no_key_ai(client, monkeypatch):
    monkeypatch.delenv('ANTHROPIC_API_KEY', raising=False)
    token = get_token(client)
    response = client.post('/api/ai/knowledge', json={'token': token})
    assert response.status_code == 200
    blocked = client.post('/api/ai/assess', json={'token': token, 'consent': True})
    assert blocked.status_code == 503
    assert blocked.json['error'] == 'claude_unavailable'


def test_invalid_token_is_rejected(client):
    for token in ('garbage', '', None, 'x'*2400):
        response = client.post('/api/ai/knowledge', json={'token': token})
        assert response.status_code == 400
        response = client.post('/api/ai/assess', json={'token': token, 'consent': True})
        assert response.status_code == 400


def test_all_rules_have_rag_documents():
    result = retrieve(list(VALID_KEYS), 'URL', limit=8)
    assert result['evidence_coverage'] == {
        'matched_flags': len(VALID_KEYS),
        'active_flags': len(VALID_KEYS),
        'meaning': 'Relevant published guidance for active rule flags; not prediction accuracy.',
    }
    assert len(result['documents']) <= 8
    assert retrieve([], 'QR')['documents'][0]['id'] in ('ftc-qr', 'ftc-qr-update')


def test_claude_request_uses_whitelisted_evidence_and_no_url_path(client, monkeypatch):
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'private-test-key')
    monkeypatch.setenv('CLAUDE_MODEL', 'claude-sonnet-4-6')
    captured = {}

    class DummyResponse:
        def __enter__(self): return self
        def __exit__(self, *args): return False
        def read(self, max_bytes):
            return json.dumps({
                'content': [{'type': 'text', 'text': json.dumps({
                    'summary': 'The structure includes multiple selected warning signs.',
                    'recommendations': ['Do not enter passwords.', 'Navigate via a known official bookmark.'],
                    'limitations': 'No reputation verification was performed.',
                    'citation_ids': ['ftc-phishing', 'FAKE-ID', 'cisa-phishing']
                })}]
            }).encode()

    def fake_send(request, timeout):
        assert request.full_url == 'https://api.anthropic.com/v1/messages'
        assert timeout == 20
        assert request.get_header('Authorization') == 'Bearer private-test-key'
        captured['json'] = json.loads(request.data)
        return DummyResponse()

    monkeypatch.setattr('ai_assistant.urlopen', fake_send)
    token = get_token(client)
    response = client.post('/api/ai/assess', json={'token': token, 'consent': True})
    assert response.status_code == 200
    info = response.json['result']
    assert info['provider'] == 'Anthropic Claude API'
    assert info['confidence']['percent'] is None
    assert info['confidence']['status'] == 'not_calibrated'
    assert all(cid != 'FAKE-ID' for cid in info['citation_ids'])
    assert 'secret-123' not in json.dumps(captured['json'])
    assert '/verify/password' not in json.dumps(captured['json'])
    assert 'private-test-key' not in json.dumps(response.json)
    assert captured['json']['messages'][0]['role'] == 'user'


def test_ai_token_has_no_full_url_or_path():
    secret = b'some-test-key-not-real'
    result = analyze('http://paypa1.example/verify/password?api_token=sensitive')
    token = create_token(secret, result, 'URL')
    context = verify_token(secret, token)
    assert context['host'] == 'paypa1.example'
    assert context['score'] == 54
    assert context['keys'] == ['lookalike_domain', 'sensitive_terms', 'http_only']
    assert 'url' not in context and 'path' not in context and 'api_token' not in json.dumps(context)
    with pytest.raises(AIError): verify_token(secret, token + 'invalid')


def test_json_required_on_all_ai_posts(client):
    assert client.post('/api/ai/knowledge',data='not json').status_code == 415
    assert client.post('/api/ai/assess',data='not json').status_code == 415


def test_ai_integration_does_not_change_legacy_scans(client):
    assert client.get('/').status_code == 200
    assert client.get('/dashboard').status_code == 200
    response = client.post('/api/analyze/url', json={'url': 'https://example.com'})
    assert response.status_code == 200
    assert response.json['result']['risk_score'] == 0
    assert response.json['result']['score_type'] == 'uncalibrated_heuristic_points'
    assert 'ai_context_token' in response.json
    html = client.get('/dashboard').get_data(as_text=True)
    assert 'id="aiExplainButton"' in html
    assert 'id="ragReferences"' in html
    assert 'Not calibrated' in html
