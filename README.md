# CyberGuard

**English-only URL & QR code risk analyzer.** Inspect suspicious web addresses without visiting them, and see why they were flagged.

> **Important:** CyberGuard is a local educational tool. Risk scores are explainable rules, **not AI probabilities** or proof that a website is safe. It does **not** visit scanned websites.

## Start on Windows — one click

1. Download this repository: **Code → Download ZIP**.
2. Extract the ZIP file.
3. Double-click **`RUN.bat`** inside the extracted `CyberGuard-main` folder.
4. Wait for the packages to install on the first run. Keep the terminal window open.
5. Open **http://127.0.0.1:5000** in your browser.

**Requirements:** Python 3.11+ installed on Windows and internet access the first time you run it. To stop the server, press **Ctrl+C** in the terminal.

### VS Code

Open the `CyberGuard-main` folder using **File → Open Folder**. Open the integrated **PowerShell terminal** and run:

```powershell
.\RUN.bat
```

That's the only command you need. You do **not** need Git Clone, Docker, Node.js, or a UI design plugin.

### Mac / Linux

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

## Where is the code?

| File | Purpose |
| --- | --- |
| **`app.py`** | Flask server and API routes |
| **`analyzer.py`** | URL parsing and explainable risk rules |
| **`qr.py`** | Safe QR image decoding |
| **`templates/index.html`** | Dashboard HTML (English) |
| **`static/styles.css`** | Colors, layout, responsive design |
| **`static/app.js`** | Buttons, charts, results, API calls |
| **`RUN.bat`** | One-click Windows startup |
| **`tests/test_app.py`** | Automated tests |

The remaining files are minimal project configuration, a license, and GitHub's automated test workflow. No extra scripts or language packs.

## Try a safe example

Enter `http://paypa1.example/verify/password` into **Scan URL** and press **Analyze URL**. This uses a reserved example domain; do **not** open it in your browser. Compare it with `https://example.com`. The dashboard updates from real session scans only.

Or upload one QR code image (PNG, JPG, or WebP, up to 5 MB).

## API

- `GET /api/health` — application health
- `POST /api/analyze/url` — JSON: `{"url":"https://example.com"}`
- `POST /api/analyze/qr` — multipart form: `image=<file>`

Run tests with `python -m pip install pytest qrcode[pil]` followed by `python -m pytest tests -q` after installing the main dependencies.

**Privacy:** Scanned links are never fetched. Session history stays in the page's memory and disappears when you refresh. This version does not save scans to disk or send them to third parties.

**Limitations:** Rules cannot confirm whether a site is malicious or safe, detect every phishing page, or substitute for security products. Public deployment requires additional protection and review; the default listener is localhost-only.

## License

MIT — see [LICENSE](LICENSE).
