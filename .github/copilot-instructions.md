# CyberGuard AI coding and design instructions

When working on UI/UX, first read `design-system/cyberguard/MASTER.md`, then inspect `templates/index.html`, `static/styles.css`, and `static/app.js`.

We use the published [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) **design principles**. To install the full upstream skill locally for GitHub Copilot, follow `docs/UIUX_PRO_MAX_AR.md` and run the official CLI in your VS Code workspace. This project does not bundle the upstream skill itself, and the instructions here do **not** imply the skill is installed in ChatGPT.

Design checklist:
- Arabic-first, right-to-left layout; English optional and complete.
- Cyber Neon/enterprise style: premium dark card layout, restrained teal accents, accessible contrast.
- Maintain genuine chart data, explainable risk scores and visible empty states.
- Keyboard accessibility, minimum 44px interactive targets, reduced-motion support.
- No external fonts/CDNs, no inline scripts, no unsafe DOM interpolation.
- Preserve Flask API routes and Python analyzer behavior.
- Before committing, run browser interaction tests and GitHub CI.

Risk scoring is heuristic, not a validated phishing detection model. Do not claim real-time threat feeds, AI confidence percentages or guaranteed URL safety.
