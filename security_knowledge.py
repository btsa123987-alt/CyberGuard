"""Small, auditable, offline retrieval collection for cybersecurity explanations.

Excerpts are ORIGINAL short summaries of linked public guidance; they are not live
reputation lookups and must never be described as website-specific verification.
"""
from __future__ import annotations

from collections import Counter
from math import log
import re

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


# Reproducible local hybrid retrieval. Each excerpt is a curated, human-reviewed
# summary; this is NOT a live indexed web crawler or a vector/embedding database.
_TOKEN_RE = re.compile(r"[a-z0-9]{2,}")
RULE_TERMS = {
    "ip_host": "ip address numeric hostname direct address",
    "shortener": "shortened disguised redirect shortened links",
    "brand_impersonation": "impersonation spoofed trusted brands",
    "lookalike_domain": "lookalike domain changed letters impersonation phishing",
    "punycode_hostname": "encoded unicode hostname visual deception",
    "deep_subdomains": "subdomain misleading domain hostname",
    "sensitive_terms": "login password verification account urgent credential",
    "http_only": "insecure http encryption destination",
    "nonstandard_port": "nonstandard network port destination",
}


def _terms(value: str) -> list[str]:
    return _TOKEN_RE.findall(value.lower())


_INDEX = tuple(Counter(_terms(doc["title"] + " " + doc["text"])) for doc in DOCUMENTS)
_AVG_LENGTH = sum(sum(doc.values()) for doc in _INDEX) / len(_INDEX)
_DF = Counter(token for doc in _INDEX for token in doc)


def _bm25(query: list[str], index: Counter) -> float:
    """BM25 lexical similarity against small curated local reference snippets."""
    k1, b = 1.2, 0.75
    length = sum(index.values())
    result = 0.0
    for term in set(query):
        tf = index.get(term, 0)
        if not tf:
            continue
        df = _DF[term]
        idf = log(1 + (len(_INDEX) - df + 0.5) / (df + 0.5))
        result += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * length / _AVG_LENGTH))
    return result


def retrieve(indicator_keys: list[str], input_type: str = "URL", limit: int = 4) -> dict:
    """Run a local lexical BM25 + indicator-match retriever with cited sources.

    All query terms are fixed trusted analyzer vocabulary, never a submitted URL.
    The resulting match score ranks *guidance relevance*, not URL risk or confidence.
    """
    keys = set(indicator_keys) & VALID_KEYS
    qr = input_type == "QR"
    query = _terms(" ".join(RULE_TERMS[key] for key in sorted(keys)) + (" qr code image scam" if qr else " phishing url"))
    scored = []
    for doc, index in zip(DOCUMENTS, _INDEX):
        matched = sorted(keys & set(doc["tags"]))
        lexical = _bm25(query, index)
        rank = lexical + len(matched) * 2.5 + (3 if qr and "qr" in doc["tags"] else 0)
        if matched or (qr and "qr" in doc["tags"]):
            scored.append((rank, doc["id"], doc, matched, lexical))
    if not scored:
        # Honest no-rule fallback: general safety advice with no matched indicators.
        scored = [(_bm25(query, _INDEX[i]), DOCUMENTS[i]["id"], DOCUMENTS[i], [], _bm25(query, _INDEX[i])) for i in (2, 5)]
    scored.sort(key=lambda entry: (-entry[0], entry[1]))
    selected = scored[:max(1, min(8, limit))]
    covered = keys & set().union(*(set(doc["tags"]) for _, _, doc, _, _ in selected)) if selected else set()
    return {
        "documents": [
            {
                **{name: doc[name] for name in ("id", "title", "source", "url", "text")},
                "matched_indicators": matched,
                "ranking_score": round(rank, 3),
                "lexical_bm25": round(lexical, 3),
            }
            for rank, _, doc, matched, lexical in selected
        ],
        "evidence_coverage": {
            "matched_flags": len(covered),
            "active_flags": len(keys),
            "meaning": "Relevant published guidance for active rule flags; not prediction accuracy.",
        },
        "retrieval_mode": "offline_rule_keyed_reference_retrieval",
        "retrieval_algorithm": "hybrid_rule_match_plus_bm25",
        "corpus_size": len(DOCUMENTS),
    }
