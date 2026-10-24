<div align="center">
  <img src="static/favicon.svg" alt="CyberGuard logo" width="78" />

# CyberGuard · QR & URL Security Analyzer

**Explainable phishing indicators · Offline-by-design · Arabic & English**

![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-141e2d?logo=flask&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-3cdadf)
![Security](https://img.shields.io/badge/URL_scanning-no_outbound_requests-42d6a2)

</div>

> **Important:** CyberGuard is a cybersecurity education/portfolio tool for *structural URL risk indicators*. It is **not** a validated anti-phishing engine, a live reputation service, or a guarantee that a low-scoring URL is safe. The risk score is **heuristic points out of 100**, **not an AI confidence percentage**.

**العربية:** CyberGuard أداة تعليمية لتحليل مؤشرات الروابط ورموز QR دون فتح الوجهة أو إرسالها لخدمات خارجية. درجة الخطورة توضيحية وليست احتمالًا إحصائيًا أو ضمانًا لسلامة الرابط. **[شرح المشروع بالعربية](docs/PROJECT_EXPLANATION_AR.md)** · **[دليل التشغيل والنشر على GitHub](docs/GITHUB_AR.md)**.

## 📘 Project at a glance

| Question | Answer |
| --- | --- |
| What does it solve? | Helps users inspect structural phishing signals in a URL extracted from a QR image or entered as text. |
| Does it open or visit suspicious links? | **No.** Analysis is offline and does not perform network lookups. |
| Is the risk score AI confidence? | **No.** It is an explainable, deterministic heuristic score, not a trained-model probability. |
| What makes this an engineering project? | Separated application layers, secure file handling, a documented REST API, automated checks, and container packaging. |

## ✨ Features

- **Arabic / English dashboard** — responsive dark interface, keyboard-friendly controls, URL paste, QR upload/drag-drop, live indicator breakdown, session counters, and JSON report export.
- **Explainable rules** — 9 deterministic indicators: IP host, shorteners, possible brand impersonation, lookalike domains, punycode, deep subdomains, sensitive terms, unencrypted HTTP, and unusual ports.
- **Private by default** — no requests to submitted URLs, no external CDNs or LLM calls, no URL/image storage, and disabled server-side history by default.
- **Hardened image handling** — validated PNG/JPEG/WebP, 5-MiB payload limit and 8-million-pixel limit, with explicit errors for QR decoding issues.
- **REST API** — error codes, health checks, optional redacted history, and request rate limiting.
- **Testable deployment** — Flask app factory, offline engine, tests, GitHub Actions, Docker, Compose, security notes, and optional isolated XGBoost/SHAP research lab.

## 🚀 Quick start

**Python 3.11+** is recommended.

```bash
# 1) Clone your new GitHub repository (or unzip the downloaded project)
git clone https://github.com/YOUR_USERNAME/CyberGuard.git
cd CyberGuard

# 2) Create and activate a virtual environment
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1

# 3) Install and run
python -m pip install -r requirements.txt
python app.py
```

Open **http://127.0.0.1:5000**. The local server binds to loopback by default and will not expose the app publicly.

### Run with Docker

```bash
docker compose up --build
```

Open **http://127.0.0.1:8000**. Compose publishes on localhost only, runs under a non-root account, drops Linux capabilities, and uses a read-only root filesystem.

## 🔍 API examples

```bash
curl http://127.0.0.1:5000/api/health

curl -X POST http://127.0.0.1:5000/api/analyze/url \
  -H "Content-Type: application/json" \
  -d '{"url":"http://paypa1.com/verify/password"}'

curl -X POST http://127.0.0.1:5000/api/analyze/qr \
  -F 'image=@sample-qr.png'
```

Responses return `{ "success": true, "result": { ... } }` with the risk score, level, hostname, score contributions, explanations, and limitations. Detailed examples are in [docs/API.md](docs/API.md). For a complete walkthrough in Arabic, see [Project Explanation](docs/PROJECT_EXPLANATION_AR.md).

## 🧪 Test and quality checks

```bash
python -m pip install -r requirements-dev.txt
python -m pytest tests -q
ruff check cyberguard tests scripts app.py
```

GitHub Actions runs tests against Python 3.11, 3.12, 3.13 and builds a container image. A private-only local environment may lack packages required for integration tests; CI installs them.

## 🧱 Project architecture

```text
CyberGuard/
├── app.py                    # Local dev entry point / WSGI export
├── cyberguard/
│   ├── __init__.py           # Lazy Flask app factory
│   ├── server.py             # API, limits, headers, rate limiting
│   ├── analyzer.py           # Pure URL validation and risk engine
│   └── qr.py                 # Safe image checks and QR decoder
├── templates/index.html      # Arabic/English dashboard
├── static/styles.css         # Responsive UI
├── static/app.js             # UI interactions; no remote libraries
├── static/favicon.svg
├── tests/                    # URL, QR and API integration tests
├── scripts/ml_experiment.py  # OPTIONAL genuine ML/SHAP lab
├── docs/                     # API, security model, research notes
├── .github/workflows/ci.yml
├── Dockerfile
├── compose.yaml
├── requirements*.txt
├── pyproject.toml
├── LICENSE
└── README.md
```

## 🧠 About the AI / ML component

**The live result is rule-based, not generated by a trained XGBoost classifier.** Earlier prototypes sometimes presented rule weights as "SHAP" or classification confidence, which is incorrect. Rather than make unsupported model claims, this version shows each active rule and its explicit point contribution. The optional [XGBoost + true SHAP research script](docs/ML_RESEARCH.md) uses a *user-supplied labeled dataset* and never affects live scoring or transmits URLs. You can build a real calibrated predictive model once you have ethically sourced, independently evaluated data.

## 🔐 Security considerations

The detector never connects to a scanned website, avoiding SSRF from link-following. Validation, response headers, file limits, and safe DOM rendering reduce common risks but **do not eliminate all threats**. Native image codecs and public-facing API endpoints require additional hardening, gateway-based rate limiting, HTTPS termination, resource caps, monitoring, and deployment review. See [docs/SECURITY.md](docs/SECURITY.md).

Server-side history is disabled by default. To opt in locally, set `CYBERGUARD_HISTORY=1`; it saves only hostnames, risk levels, scores, and timestamps, per worker, in memory. The browser shows an ephemeral session history without persisting complete scanned URLs.

## 🗺️ Suggested roadmap

- [ ] Source and independently label real-world URL data with proper rights and provenance.
- [ ] Validate detection on chronological domain-disjoint holdouts, calibrate probabilities, and report uncertainty.
- [ ] Conduct a security review, fuzz-test image decoding, add production gateway policies, and threat-model auth if introduced.
- [ ] Add end-to-end browser accessibility checks and optional RTL visual regression screenshots.

## 📦 Publishing to GitHub

The ZIP file is a delivery package: **extract it and commit its contents**, not the ZIP itself. Create a blank repository first, then use Git or the documented upload flow. See [Arabic GitHub publishing guide](docs/GITHUB_AR.md), including a Windows PowerShell helper at `scripts/publish_github.ps1`, suggested repository topics, Actions verification, and portfolio descriptions.

## 🤝 Contributing & license

See [CONTRIBUTING.md](CONTRIBUTING.md). Released under the [MIT License](LICENSE), subject to your ownership/rights to all project code and assets.

---

*Built to demonstrate secure engineering and clear security explanations, not inflated model-accuracy claims.*
