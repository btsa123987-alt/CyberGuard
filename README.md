<div align="center">

# CyberGuard

### Scan links. Watch the signals. Understand the risk.

**An explainable URL & QR security scanner with a cinematic particle animation and a dedicated analytics dashboard.**

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.x-8A5BD9?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-b792ff)](LICENSE)
[![Tests](https://github.com/oull1i/CyberGuard/actions/workflows/ci.yml/badge.svg)](https://github.com/oull1i/CyberGuard/actions/workflows/ci.yml)

</div>

![CyberGuard analysis dashboard, showing a sample test scan](assets/dashboard.jpg)

*Dashboard captured using the example test URL `http://paypa1.example/verify/password`. The figures are from a test scan, not live threat intelligence.*

## The experience

| 01 · Scanner | 02 · Motion transition |
|:---:|:---:|
| ![URL and QR scanner](assets/scanner.jpg) | ![Particle-based scanning transition](assets/scan-animation.jpg) |

**1. Scan → 2. Visualize → 3. Investigate.** Enter a URL or upload a QR image. While the local API examines the input, an animated blue-violet particle field forms an orbital double helix. The animation has **no fabricated percent-complete indicator** and does not claim to represent a trained AI model. After the actual API result returns, you are taken to the **separate security dashboard**.

## Quick start — Windows / VS Code

**Prerequisite:** Python 3.11+ and internet access for the first install. No Git or Node.js required.

**Option A — simplest:** On GitHub, click **Code → Download ZIP**, extract the folder, then double-click **`RUN.bat`**. The Windows launcher creates `.venv`, installs dependencies and starts Flask.

**Option B — copy one PowerShell block** into **VS Code → Terminal → New Terminal**:

```powershell
$folder = Join-Path $HOME ('CyberGuard-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $folder | Out-Null
Invoke-WebRequest 'https://github.com/oull1i/CyberGuard/archive/refs/heads/main.zip' -OutFile "$folder\source.zip"
Expand-Archive "$folder\source.zip" -DestinationPath $folder
Set-Location "$folder\CyberGuard-main"
.\RUN.bat
```

When Flask starts, open **http://127.0.0.1:5000/**. Keep the terminal open; `Ctrl+C` stops the server.

Test with `http://paypa1.example/verify/password` (a reserved example domain) or `https://example.com`. Paste the address into the scanner; **do not open the example link in your browser**.

### macOS / Linux

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

## What it does

- **Two dedicated pages:** Scanner (`/`) and Security Dashboard (`/dashboard`).
- **Explainable phishing indicators:** Looks for numeric IP hosts, lookalike domains, suspicious brand references, URL shorteners, punycode, deep subdomains, account-action wording, HTTP and unusual ports.
- **QR image decoding:** Validates and reads a single QR code from PNG, JPG or WebP, maximum 5 MB.
- **Motion design:** Responsive particle animation with indeterminate activity state, keyboard-accessible cancel button and reduced-motion support.
- **Session analytics:** Severity cards, trend chart, risk distribution, active indicators, recent activity and JSON export based on **actual scans in the current browser tab**.
- **Privacy by design:** No outbound requests to submitted websites. Session history stores hostnames and scoring metadata, not full URL paths or query strings. No trackers or external CDN dependencies.
- **Safety features:** Input validation, restrictive security headers, upload limits, rate limiting and automated API tests.

## Architecture

```text
app.py                    Flask web server and REST API
analyzer.py               Offline URL parser + deterministic scoring
qr.py                     QR image decoding and validation
templates/index.html      Scanner screen + motion overlay
templates/dashboard.html  Post-scan security dashboard
static/app.js             Scanning interactions, particle renderer and charts
static/styles.css         Responsive visual system
RUN.bat                   One-click Windows startup
tests/test_app.py         Automated integration and security checks
assets/                   Real browser screenshots (illustrative test scan)
```

### API

```text
GET  /api/health
POST /api/analyze/url     application/json {"url":"https://example.com"}
POST /api/analyze/qr      multipart/form-data, field "image"
```

### Tests

```bash
python -m pip install pytest 'qrcode[pil]'
python -m pytest tests -q
```

GitHub Actions runs the test suite with Python 3.11, 3.12 and 3.13 on push or pull request.

## Important limitations

CyberGuard is a **defensive educational and portfolio project**. Its score is a sum of transparent heuristic points from 0–100; **it is not an AI confidence percentage, statistical probability, live reputation lookup or proof of maliciousness/safety**. The analyzer does not follow links, detect zero-day vulnerabilities, resolve redirects or monitor external systems. Animation is visual feedback, not a representation of real network activity. The project starts on localhost; **GitHub hosts the source, not a publicly running Flask application**.

## Design credits

The dashboard's visual language was informed by [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT) with a user-directed violet SOC aesthetic. See [STYLE_GUIDE.md](STYLE_GUIDE.md). The particle animation and UI implementation are original CyberGuard application code, not a bundled UI/UX Pro Max runtime.

## License

[MIT](LICENSE).
