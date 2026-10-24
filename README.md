# CyberGuard — URL & QR Security Scanner

A clean, English-language cybersecurity project with **two separate screens**:

1. **Scanner** (`/`) — analyze a URL or QR image.
2. **Security dashboard** (`/dashboard`) — see the score, indicators, charts, and your recent scans after analysis.

The dashboard is styled as a dark security-operations console with violet highlights. **Charts use only real scans performed in your browser tab; there are no fake live feeds or fabricated detection-confidence metrics.**

> CyberGuard is an educational, deterministic URL-risk analyzer, **not** a trained AI phishing detector or proof that a website is safe. It does not visit scanned URLs.

## Start on Windows

You need **Python 3.11 or newer**. Internet access is required for the first package installation.

1. Click **Code → Download ZIP** above.
2. Extract the ZIP.
3. Open the `CyberGuard-main` folder in VS Code.
4. Open **Terminal → New Terminal** (PowerShell) and run:

```powershell
.\RUN.bat
```

5. Open **http://127.0.0.1:5000**. Stop the app with **Ctrl+C**.

You can also double-click `RUN.bat` from the extracted folder. You do **not** need Git, Node.js, Docker, or any design plugin.

### Mac / Linux

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

## Test the flow

On the **Scanner** page, try the reserved example address `http://paypa1.example/verify/password`. Click **Analyze and open dashboard**. You will be taken to the Dashboard, where the assessment, trend, and activity table display the scan. Select **New scan** to run another scan.

You can compare with `https://example.com`, or upload one QR image (PNG, JPEG, WebP, max 5 MB).

## Where is the code?

| File | What it does |
| --- | --- |
| `app.py` | Flask routes: scanner, dashboard, URL API, QR API |
| `analyzer.py` | Offline URL parsing and explainable risk rules |
| `qr.py` | QR image validation and decoding |
| `templates/index.html` | Standalone scanner interface |
| `templates/dashboard.html` | **Post-scan security dashboard** |
| `static/styles.css` | Complete layout, colors and mobile design |
| `static/app.js` | Scan interactions, temporary history and real-data SVG charts |
| `RUN.bat` | One-click Windows launcher |
| `tests/test_app.py` | Automated security and Flask route checks |

## Privacy and limitations

- URL analysis calls **only the local Flask API**; the destination URL is never opened or resolved.
- The dashboard's session history is stored in browser `sessionStorage` (up to 24 scans). Only **hostname**, category, score, explanations and timestamp are kept; complete URL paths and query strings are **not stored**. It can survive page reloads in the same tab and may be restored by the browser. Choose **Clear session** to erase it.
- No background monitoring, third-party tracking, CDN, or external threat intelligence is involved.
- Scores represent heuristic points, **not** calibrated threat probabilities or confirmed attacks.
- The server binds to localhost by default. Public deployment requires additional security review.

## API and tests

- `GET /api/health`
- `POST /api/analyze/url` — JSON `{ "url": "https://example.com" }`
- `POST /api/analyze/qr` — multipart upload, field `image`

Run tests (after the main requirements are installed):

```bash
python -m pip install pytest qrcode[pil]
python -m pytest tests -q
```

GitHub Actions tests on Python 3.11, 3.12 and 3.13.

## License

MIT — see [LICENSE](LICENSE).
