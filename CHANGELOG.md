# Changelog

## 3.0.0 — 2026-10-24

- Redesigned Arabic-first dashboard as Cyber Neon enterprise UI, with an animated SVG security radar and responsive layout.
- Added fully data-driven session risk distribution, score timeline and summary analytics; never includes fabricated metrics.
- Preserved URL and QR analysis APIs, safe DOM rendering, bilingual UI and existing Flask engine.
- Published project-specific UI design tokens and accessibility guidelines inspired by UI/UX Pro Max.
- Added optional upstream installer instructions for VS Code/GitHub Copilot and browser-facing frontend contract tests.

## 2.0.1 — 2026-10-24

- Expanded the English README with an at-a-glance architecture and publishing notes.
- Added a comprehensive Arabic explanation, interview Q&A and ethical scoring limitations.
- Added a GitHub publishing guide tailored to the connected account and a cautious PowerShell publisher.
- Added consistent editor and Git line-ending rules for cross-platform collaboration.

## 2.0.0 — 2026-10-24

- Rebuilt the inherited single-file prototype into a modular Flask application.
- New bilingual, responsive dashboard with safe DOM rendering, QR upload, URL input, score breakdown, and exportable JSON reports.
- Introduced 9 explainable URL indicators and removed uncalibrated "ML confidence" and mislabeled "SHAP" claims from live detection.
- Hardened input parsing, image validation, HTTP headers and best-effort per-worker rate limiting.
- Server scan history opt-in only; no full URL persistence or third-party enrichment.
- Added Flask/QR/URL tests, GitHub CI, Docker/Compose, security documentation and an isolated optional XGBoost+SHAP research script.

Previous prototype remains available in the original user-supplied file; this release is a redesigned API rather than a backwards-compatible drop-in replacement.
