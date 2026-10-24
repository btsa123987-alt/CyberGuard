# Contributing

Thanks for improving CyberGuard. Please report bugs using minimal non-sensitive reproduction examples; never include real login credentials or private scanned URLs. Open pull requests for fixes with tests and documentation.

```bash
python -m pip install -r requirements-dev.txt
python -m pytest tests -q
ruff check cyberguard tests scripts app.py
```

Rules: keep URL analysis **offline**, treat every URL/QR payload as untrusted, never classify low risk as "safe", write tests for edge cases, and don't add third-party analytics, fonts, or LLM forwarding without explicit privacy review and opt-in.
