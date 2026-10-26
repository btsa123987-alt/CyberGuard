"""CyberGuard's Flask web server and API.

Start locally with ``python app.py`` or ``RUN.bat`` on Windows.
Submitted URLs are inspected as text; they are never opened or requested.
"""
from __future__ import annotations

from collections import deque
from threading import Lock
import os
import time
import secrets

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

from analyzer import URLValidationError, analyze
from explainability import explain_score
from qr import ImageValidationError, QRNotFoundError, MAX_IMAGE_BYTES, decode_qr
from ai_assistant import AIError, create_token, verify_token, knowledge_for, explain_with_claude, claude_ready, DEFAULT_MODEL


def create_app(config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.update(
        MAX_CONTENT_LENGTH=MAX_IMAGE_BYTES + 64 * 1024,
        MAX_FORM_MEMORY_SIZE=6 * 1024 * 1024,
        RATE_LIMIT_ENABLED=True,
        RATE_LIMIT_PER_MINUTE=40,
    )
    if config:
        app.config.update(config)
    signing_secret = secrets.token_bytes(32)

    recent: dict[str, deque[float]] = {}
    lock = Lock()

    @app.before_request
    def rate_limit():
        if request.method != "POST" or not app.config["RATE_LIMIT_ENABLED"]:
            return None
        now = time.monotonic()
        client = request.remote_addr or "unknown"  # Do not trust unverified forwarded headers.
        with lock:
            if len(recent) > 2048 and client not in recent:
                recent.clear()
            bucket = recent.setdefault(client, deque())
            while bucket and bucket[0] < now - 60:
                bucket.popleft()
            if len(bucket) >= app.config["RATE_LIMIT_PER_MINUTE"]:
                return jsonify(error="rate_limit", message="Too many requests. Please try again later."), 429
            bucket.append(now)
        return None

    @app.after_request
    def security_headers(response):
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; script-src 'self'; style-src 'self'; "
            "img-src 'self' data:; font-src 'self'; connect-src 'self'; "
            "base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/")
    def home():
        return render_template("index.html")

    @app.get("/dashboard")
    def dashboard():
        return render_template("dashboard.html")

    @app.get("/api/health")
    def health():
        return jsonify(status="ok", service="CyberGuard", mode="offline-heuristics", ai_optional=True)

    @app.post("/api/analyze/url")
    def analyze_url():
        if not request.is_json:
            return jsonify(error="invalid_content_type", message="Send application/json."), 415
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(error="invalid_json", message="Expected a JSON object."), 400
        try:
            result = analyze(data.get("url"))
            result["explainability"] = explain_score(result)
            return jsonify(success=True, result=result, ai_context_token=create_token(signing_secret, result, "URL"))
        except URLValidationError as exc:
            return jsonify(error="invalid_url", message=str(exc)), 400

    @app.post("/api/analyze/qr")
    def analyze_qr():
        if "image" not in request.files:
            return jsonify(error="missing_image", message="Select a QR code image."), 400
        raw = request.files["image"].stream.read(MAX_IMAGE_BYTES + 1)
        if len(raw) > MAX_IMAGE_BYTES:
            return jsonify(error="image_too_large", message="The image must be under 5 MB."), 413
        try:
            result = analyze(decode_qr(raw))
            result["explainability"] = explain_score(result)
            return jsonify(success=True, result=result, ai_context_token=create_token(signing_secret, result, "QR"))
        except QRNotFoundError as exc:
            return jsonify(error="qr_not_found", message=str(exc)), 422
        except ImageValidationError as exc:
            return jsonify(error="invalid_image", message=str(exc)), 400
        except URLValidationError as exc:
            return jsonify(error="qr_not_url", message=str(exc)), 422

    @app.get("/api/ai/status")
    def ai_status():
        return jsonify(claude_configured=claude_ready(), model=(os.environ.get("CLAUDE_MODEL") or DEFAULT_MODEL) if claude_ready() else None,
                       rag_enabled=True, confidence_status="not_calibrated", remote_processing_opt_in=True)

    @app.post("/api/ai/knowledge")
    def ai_knowledge():
        if not request.is_json:
            return jsonify(error="invalid_content_type", message="Send application/json."), 415
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(error="invalid_json", message="Expected a JSON object."), 400
        try:
            context = verify_token(signing_secret, data.get("token"))
            return jsonify(success=True, result=knowledge_for(context))
        except AIError as exc:
            return jsonify(error="invalid_scan_context", message=str(exc)), exc.status

    @app.post("/api/ai/assess")
    def ai_assess():
        if not request.is_json:
            return jsonify(error="invalid_content_type", message="Send application/json."), 415
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(error="invalid_json", message="Expected a JSON object."), 400
        if data.get("consent") is not True:
            return jsonify(error="consent_required", message="Explicit consent is required before using Claude."), 403
        try:
            context = verify_token(signing_secret, data.get("token"))
            knowledge = knowledge_for(context)
            result = explain_with_claude(context, knowledge)
            return jsonify(success=True, result=result)
        except AIError as exc:
            return jsonify(error="claude_unavailable" if exc.status >= 500 else "invalid_scan_context", message=str(exc)), exc.status

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(error="http_error", message=error.description), error.code

    @app.errorhandler(Exception)
    def unexpected_error(error):
        app.logger.exception("Unhandled request error: %s", type(error).__name__)
        return jsonify(error="internal_error", message="Unexpected server error."), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "5000")), debug=False)
