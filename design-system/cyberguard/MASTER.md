# CyberGuard — UI / UX Master Design System (v3)

> This file is our project-specific, human-authored design standard inspired by the public UI/UX Pro Max guidance. It is **not** an automatic CLI export. When using the upstream skill, treat this document as the persistent project specification and preserve it unless deliberately updating the design.

## Product and content contract

- **Product:** Cybersecurity awareness tool / security analysis dashboard.
- **Audience:** Arabic-speaking users, junior security analysts, employers reviewing a portfolio.
- **Language:** Arabic is the default (`lang="ar"`, `dir="rtl"`). English is optional (`lang="en"`, `dir="ltr"`). Translate all UI labels in both modes; technical URLs and hostnames stay left-to-right.
- **Accuracy:** Risk scores are deterministic indicator points (0–100), **not** model probabilities, verified maliciousness, threat intelligence or real-time attacks. Never use fake scan counters, fake graph data, or fabricated detection accuracy.
- **Privacy:** Analysis doesn't visit target URLs; no third-party tracking, CDN, analytics or URL logging. Session charts are computed from real scans only and cleared in-memory.

## Visual direction: Cyber Neon · Enterprise Calm

Premium cyber-security dashboard combining subtle neon highlights with an accessible dark canvas. Restrained motion and whitespace; avoid gaming clichés and meaningless animated charts.

### Color roles (approximate tokens)

| Role | CSS token | Value | Use |
| --- | --- | --- | --- |
| Canvas | `--bg` | `#060B16` | Page background |
| Surface | `--panel` | `#0F1C2D` | Main cards |
| Strong surface | `--panel-strong` | `#13253A` | Raised content |
| Text | `--fg` | `#F0F7FF` | Primary copy |
| Secondary text | `--muted` | `#A8BAD1` | Hints, metadata |
| Primary accent | `--cyan` | `#67F4DF` | Focus, CTA, highlights |
| Supporting accent | `--blue` | `#7394FF` | Gradient/links |
| Risk low | `--green` | `#62E3AC` | Low indicator score |
| Risk elevated | `--amber` | `#FFD17B` | Elevated indicator score |
| Risk high | `--red` | `#FF859D` | High indicator score |

Do not rely on color alone; provide numeric scores plus translated labels. Avoid raw colors in individual components except SVG rendering gradients for charts. Verify visible text contrast against actual card backgrounds.

## Typography, layout, interaction

- Font stack: local `'Segoe UI', Tahoma, Arial, system-ui` (no external font downloads).
- Base 16px with 1.55 body line-height; main headings scale responsively. Small caption labels should remain readable; do not shrink below 12px unless nonessential ornamental metadata.
- Sidebar navigation on desktop, compact header on mobile. Cards adapt at 1240, 990, 720, 410px widths. No horizontal overflow on 390px mobile.
- Buttons, controls and tappable tabs minimum 44px height, with minimum 8px spacing.
- Full keyboard navigation, visible focus rings, meaningful aria-labels and live messages for scanning/status changes. Form labels always visible.
- Animation 150–300ms for interactive feedback; optional radar orbit is decorative and disabled under `prefers-reduced-motion`.
- Empty data stays honestly empty; graph placeholders are labeled, not prefilled with sample data.
- Progressive disclosure: scan input first, result breakdown second, analytics and guidance follow.

## Visualizations

1. Circular score indicator represents current scan points only (0–100).
2. Session distribution ring counts LOW/ELEVATED/HIGH results in current tab. Provide a textual legend and screen-reader label.
3. Trend chart plots the last 12 real scores with SVG and titled points; if no data, show explicit empty state.
4. Snapshot shows mean, highest, latest score. Numeric values are *not* model-confidence probabilities.
5. All values come from `/api/analyze/url` or `/api/analyze/qr` responses, never random samples or hidden fixtures.

## Technical constraints

- Backend: Python + Flask with immutable API contracts (`/api/analyze/url`, `/api/analyze/qr`).
- Frontend: `templates/index.html`, `static/styles.css`, `static/app.js` — framework-free JS and local SVG/CSS.
- Maintain Content Security Policy: `script-src 'self'`, `style-src 'self'`; no inline JS or external libraries.
- Use `textContent` for untrusted hostnames, messages and features; do not interpolate API values as HTML.
- Do not enable outgoing network calls to inspected URLs, telemetry services, or remote image/font hosts.
- Respect changes to the backend security contract and test suite.

## Acceptance checklist

- [ ] Arabic default + English toggle work for all new labels.
- [ ] Keyboard focus works for scan form, tabs, language and export controls.
- [ ] Responsive at mobile 390px and desktop 1440px with zero x-scroll.
- [ ] URL analysis and QR image input still call Flask's existing endpoints.
- [ ] Live charts update from real analysis; empty state has no fabricated metrics.
- [ ] Reset clears all session counters and charts.
- [ ] No JS runtime errors, no outside assets, no inaccessible chart colors alone.
- [ ] All Python and API tests remain green on GitHub Actions.

## Upstream attribution

Design review approach adapted from **[UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)**, MIT License, © its respective contributors. This repo includes our own design decisions and a documented optional installer, not a redistributed copy of the upstream skill database.
