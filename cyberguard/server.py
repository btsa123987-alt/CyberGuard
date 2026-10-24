"""CyberGuard package: secure-by-default offline QR/URL triage."""
from __future__ import annotations

from collections import deque
from datetime import datetime, timezone
import os
import time
from threading import Lock

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

from .analyzer import URLValidationError, analyze
from .qr import ImageValidationError, QRNotFoundError, MAX_IMAGE_BYTES, decode_qr


def create_app(config: dict | None = None) -> Flask:
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.config.update(
        MAX_CONTENT_LENGTH=MAX_IMAGE_BYTES + 64 * 1024,  # multipart envelope
        MAX_FORM_MEMORY_SIZE=6 * 1024 * 1024,  # Multipart image buffering; body still capped.
        JSON_SORT_KEYS=False,
        HISTORY_ENABLED=os.environ.get("CYBERGUARD_HISTORY", "0") == "1",
        RATE_LIMIT_ENABLED=True,
        RATE_LIMIT_PER_MINUTE=int(os.environ.get("CYBERGUARD_RATE_LIMIT", "40")),
    )
    if config:
        app.config.update(config)

    # Per-worker best-effort abuse protection. Use gateway limits for deployments.
    recent: dict[str, deque[float]] = {}
    history: deque[dict] = deque(maxlen=30)
    lock = Lock()

    @app.before_request
    def guard_post_requests():
        if request.method != "POST":
            return None
        if not app.config["RATE_LIMIT_ENABLED"]:
            return None
        now = time.monotonic()
        address = request.remote_addr or "unknown"  # Never trust arbitrary X-Forwarded-For.
        with lock:
            if len(recent) >= 2048 and address not in recent:
                recent.clear()
            bucket = recent.setdefault(address, deque())
            while bucket and bucket[0] <= now - 60:
                bucket.popleft()
            if len(bucket) >= app.config["RATE_LIMIT_PER_MINUTE"]:
                return jsonify({"success": False, "error": "rate_limit", "message": "Too many requests. Please retry later."}), 429
            bucket.append(now)
        return None

    @app.after_request
    def secure_headers(response):
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; script-src 'self'; style-src 'self'; "
            "img-src 'self' data:; font-src 'self'; connect-src 'self'; "
            "base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store"
        return response

    def record(result: dict):
        if app.config["HISTORY_ENABLED"]:
            with lock:
                history.appendleft({
                    "hostname": result["hostname"],  # No path, query or full URL.
                    "risk_level": result["risk_level"],
                    "risk_score": result["risk_score"],
                    "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                })

    def ok(result: dict):
        record(result)
        return jsonify({"success": True, "result": result})

    @app.get("/")
    def home():
        return render_template("index.html")

    @app.get("/api/health")
    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "service": "CyberGuard", "engine": "heuristic-v2"})

    @app.get("/api/about")
    @app.get("/model_info")
    def about():
        return jsonify({
            "success": True,
            "engine": "deterministic rules v2",
            "trained_model": False,
            "calibrated_probability": False,
            "network_fetches": False,
            "history_enabled": app.config["HISTORY_ENABLED"],
            "explanation": "Rule contributions only; no SHAP or model confidence claimed.",
        })

    @app.post("/api/analyze/url")
    @app.post("/analyze-url")
    def analyze_url():
        if not request.is_json:
            return jsonify({"success": False, "error": "invalid_content_type", "message": "Send application/json."}), 415
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return jsonify({"success": False, "error": "invalid_json", "message": "Expected a JSON object."}), 400
        try:
            return ok(analyze(body.get("url")))
        except URLValidationError as exc:
            return jsonify({"success": False, "error": "invalid_url", "message": str(exc)}), 400

    @app.post("/api/analyze/qr")
    @app.post("/analyze")
    def analyze_qr():
        if "image" not in request.files:
            return jsonify({"success": False, "error": "missing_image", "message": "Upload an image in field 'image'."}), 400
        image = request.files["image"]
        raw = image.stream.read(MAX_IMAGE_BYTES + 1)
        if len(raw) > MAX_IMAGE_BYTES:
            return jsonify({"success": False, "error": "image_too_large", "message": "Image exceeds 5 MiB."}), 413
        try:
            return ok(analyze(decode_qr(raw)))
        except QRNotFoundError as exc:
            return jsonify({"success": False, "error": "qr_not_found", "message": str(exc)}), 422
        except ImageValidationError as exc:
            return jsonify({"success": False, "error": "invalid_image", "message": str(exc)}), 400
        except URLValidationError as exc:
            return jsonify({"success": False, "error": "qr_not_url", "message": str(exc)}), 422

    @app.get("/api/history")
    @app.get("/timeline")
    def get_history():
        with lock:
            items = list(history)
        return jsonify({"success": True, "enabled": app.config["HISTORY_ENABLED"], "items": items})

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify({"success": False, "error": "http_error", "message": error.description}), error.code

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        app.logger.exception("Unhandled request error: %s", type(error).__name__)
        return jsonify({"success": False, "error": "internal_error", "message": "An unexpected error occurred."}), 500

    return app
