"""Small, auditable, offline retrieval collection for cybersecurity explanations.

Excerpts are ORIGINAL short summaries of linked public guidance; they are not live
reputation lookups and must never be described as website-specific verification.
"""
from __future__ import annotations

DOCUMENTS = (
    {
        "id": "ftc-qr",
        "title": "FTC: Scammers hide harmful links in QR codes",
        "source": "Federal Trade Commission",
        "url": "https://consumer.ftc.gov/consumer-alerts/2023/12/scammers-hide-harmful-links-qr-codes-steal-your-information",
        "text": "Before visiting a QR destination, examine the displayed address for changed letters or impersonation. Independently contact the purported organization when a QR is unexpected.",
        "tags": ("qr", "lookalike_domain", "brand_impersonation", "sensitive_terms"),
    },
    {
        "id": "ftc-qr-update",
        "title": "FTC: Inspect QR links before scanning",
        "source": "Federal Trade Commission",
        "url": "https://consumer.ftc.gov/consumer-alerts/2026/09/see-qr-code-parked-somewhere-dont-scan-ityet",
        "text": "QR stickers and replacement codes can redirect people to spoofed payment pages. Examine the final displayed URL and use known trusted entry points.",
        "tags": ("qr", "lookalike_domain", "brand_impersonation", "shortener"),
    },
    {
        "id": "ftc-phishing",
        "title": "FTC: Protect yourself from phishing scams",
        "source": "Federal Trade Commission",
        "url": "https://consumer.ftc.gov/consumer-alerts/2025/04/protect-yourself-phishing-scams",
        "text": "Unexpected account or payment messages may imitate trusted brands. Instead of following a supplied link, contact the institution via a website or number you already trust.",
        "tags": ("brand_impersonation", "lookalike_domain", "sensitive_terms", "deep_subdomains"),
    },
    {
        "id": "cisa-phishing",
        "title": "CISA: Avoid phishing scams — tip sheet",
        "source": "Cybersecurity and Infrastructure Security Agency",
        "url": "https://www.cisa.gov/sites/default/files/2024-09/Secure-Our-World-Phishing-Tip-Sheet.pdf",
        "text": "Shortened links, urgent requests and mismatched senders are phishing warning signs. Independently verify suspicious requests and report them rather than following embedded links.",
        "tags": ("shortener", "sensitive_terms", "brand_impersonation", "lookalike_domain"),
    },
    {
        "id": "owasp-redirects",
        "title": "OWASP: Unvalidated Redirects and Forwards",
        "source": "OWASP Cheat Sheet Series",
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html",
        "text": "A familiar-looking host can still redirect to an attacker-controlled destination. Static URL structure does not establish where redirects lead without visiting the site.",
        "tags": ("shortener", "deep_subdomains", "ip_host", "nonstandard_port"),
    },
    {
        "id": "ftc-avoid",
        "title": "FTC: How to avoid a scam",
        "source": "Federal Trade Commission",
        "url": "https://consumer.ftc.gov/articles/how-avoid-scam",
        "text": "For unexpected requests involving payment or private data, navigate independently to the organization's known website. Pressure to act immediately is a warning sign.",
        "tags": ("http_only", "punycode_hostname", "sensitive_terms", "ip_host", "nonstandard_port"),
    },
)

VALID_KEYS = frozenset({
    "ip_host", "shortener", "brand_impersonation", "lookalike_domain", "punycode_hostname",
    "deep_subdomains", "sensitive_terms", "http_only", "nonstandard_port",
})


def retrieve(indicator_keys: list[str], input_type: str = "URL", limit: int = 4) -> dict:
    """Rank LOCAL documents against verified analyzer flags; no embeddings or I/O."""
    keys = set(indicator_keys) & VALID_KEYS
    qr = input_type == "QR"
    scored = []
    for doc in DOCUMENTS:
        tags = set(doc["tags"])
        matches = keys & tags
        rank = len(matches) * 5 + (3 if qr and "qr" in tags else 0)
        if rank:
            scored.append((rank, doc["id"], doc))
    if not scored:
        scored = [(1, DOCUMENTS[2]["id"], DOCUMENTS[2]), (1, DOCUMENTS[5]["id"], DOCUMENTS[5])]
    scored.sort(key=lambda entry: (-entry[0], entry[1]))
    selected = [entry[2] for entry in scored[:limit]]
    covered = keys & set().union(*(set(doc["tags"]) for doc in selected)) if selected else set()
    # Evidence coverage measures whether rule names have related guidance,
    # not whether the URL is malicious or whether the model is accurate.
    return {
        "documents": [{key: doc[key] for key in ("id", "title", "source", "url", "text")} for doc in selected],
        "evidence_coverage": {"matched_flags": len(covered), "active_flags": len(keys), "meaning": "Relevant published guidance for active rule flags; not prediction accuracy."},
        "retrieval_mode": "offline_rule_keyed_reference_retrieval",
    }
