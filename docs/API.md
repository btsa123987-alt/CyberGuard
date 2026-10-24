# REST API contract (v2)

Base URL for local development: `http://127.0.0.1:5000`.

### `GET /api/health`

`200` => `{"status":"ok","service":"CyberGuard","engine":"heuristic-v2"}`

### `GET /api/about`

Returns capabilities; `trained_model: false` and `calibrated_probability: false` reflect current behavior.

### `POST /api/analyze/url`

Content-Type: `application/json`.

```json
{"url":"http://paypa1.com/verify/password"}
```

Returns `200` JSON like:

```json
{
  "success": true,
  "result": {
    "url": "http://paypa1.com/verify/password",
    "hostname": "paypa1.com",
    "scheme": "http",
    "risk_level": "HIGH",
    "risk_score": 54,
    "score_type": "uncalibrated_heuristic_points",
    "engine": "CyberGuard deterministic rules v2",
    "summary": "Several structural indicators warrant avoiding this URL until independently verified.",
    "recommendation": "Open the organization's site independently; never enter credentials after an unexpected QR scan.",
    "feature_count": 3,
    "indicators": [{"key":"lookalike_domain","title":"Possible lookalike domain","detail":"The host resembles a brand's domain name.","weight":32,"active":true,"points":32}],
    "limits": "Static URL analysis only: no reputation checks, redirect resolution, live browsing, or calibrated ML probability."
  }
}
```

**Note:** `indicators` here is abbreviated to one item as an illustration; the actual response always includes all nine indicators. The example score is the sum of the active indicators and subject to rule changes. See tests for exact output.

### `POST /api/analyze/qr`

Multipart form-data; required field `image` containing a PNG, JPEG, or WebP file (max. 5 MiB; max. 8 MP). The decoded QR must contain one HTTP(S) URL. Returns the same analysis result envelope.

### `GET /api/history`

Returns `{"success":true,"enabled":false,"items":[]}` by default. If `CYBERGUARD_HISTORY=1`, returns up to 30 sanitized per-worker events (hostname, risk_level, risk_score, timestamp). No image, path, query, URL or user identifier is stored.

### Error status codes

| HTTP status | Meaning |
| --- | --- |
| 400 | Bad JSON/URL or invalid image |
| 404 | Unknown endpoint |
| 413 | Body or image exceeds size limit |
| 415 | JSON content type missing for URL analysis |
| 422 | No QR found or QR content is not a valid URL |
| 429 | Too many requests from one source |
| 500 | Unexpected internal failure (generic body) |

All errors return `{ "success": false, "error": "machine_readable_code", "message": "Human-readable explanation" }` (HTTP framework errors use `http_error`).

For migration from the older prototype, aliases `/health`, `/model_info`, `/analyze-url`, `/analyze`, and `/timeline` remain. Response structures **are not backward-compatible**; prefer the new `/api/` namespace.
