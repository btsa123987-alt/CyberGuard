"""Fast, isolated tests of the backend and the English UI contract."""
import io
from pathlib import Path

import pytest
import qrcode

from app import create_app
from analyzer import URLValidationError, analyze
from qr import ImageValidationError, QRNotFoundError, decode_qr


@pytest.fixture
def client():
    app = create_app({"TESTING": True, "RATE_LIMIT_ENABLED": False})
    return app.test_client()


def test_home_and_english(client):
    response = client.get("/")
    assert response.status_code == 200
    text = response.get_data(as_text=True)
    assert '<html lang="en" dir="ltr">' in text
    assert "Know the risk." in text
    assert "Scan QR code" in text


def test_security_headers(client):
    response = client.get("/")
    assert "default-src 'none'" in response.headers["Content-Security-Policy"]
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Cache-Control"] == "no-store"


def test_health(client):
    assert client.get("/api/health").json["status"] == "ok"


@pytest.mark.parametrize("url,expected", [
    ("https://example.com", "LOW"),
    ("http://paypa1.example/verify/password", "HIGH"),
    ("http://192.0.2.1/login/verify", "ELEVATED"),
])
def test_risk_levels(url, expected):
    assert analyze(url)["risk_level"] == expected


@pytest.mark.parametrize("url", [None, "", "file:///etc/passwd", "javascript:alert(1)", "https://a.com\\@evil.com", "https://user:password@example.com"])
def test_reject_bad_url(url):
    with pytest.raises(URLValidationError):
        analyze(url)


def test_url_endpoint(client):
    r = client.post("/api/analyze/url", json={"url": "http://paypa1.example/verify/password"})
    assert r.status_code == 200
    assert r.json["result"]["risk_level"] == "HIGH"
    assert r.json["result"]["score_type"] == "uncalibrated_heuristic_points"


def test_invalid_url_endpoint(client):
    assert client.post("/api/analyze/url", json={"url": "file:///secret"}).status_code == 400
    assert client.post("/api/analyze/url", data="no json").status_code == 415


def test_qr_endpoint(client):
    qr = qrcode.make("https://example.com")
    data = io.BytesIO()
    qr.save(data, format="PNG")
    response = client.post("/api/analyze/qr", data={"image": (io.BytesIO(data.getvalue()), "qr.png")}, content_type="multipart/form-data")
    assert response.status_code == 200
    assert response.json["result"]["hostname"] == "example.com"


def test_invalid_image(client):
    r = client.post("/api/analyze/qr", data={"image": (io.BytesIO(b"not a picture"), "fake.png")}, content_type="multipart/form-data")
    assert r.status_code == 400


def test_qr_image_required(client):
    assert client.post("/api/analyze/qr").status_code == 400


def test_no_url_fetch(monkeypatch):
    import socket
    def forbid(*args, **kwargs):
        raise AssertionError("URL scanning must not access the network")
    monkeypatch.setattr(socket, "create_connection", forbid)
    assert analyze("https://example.com")["hostname"] == "example.com"


def test_english_ui_only():
    root = Path(__file__).parents[1]
    html = (root / "templates/index.html").read_text(encoding="utf-8")
    js = (root / "static/app.js").read_text(encoding="utf-8")
    assert not any("\u0600" <= ch <= "\u06ff" for ch in html + js)
    assert "fetch(endpoint, opts)" in js
