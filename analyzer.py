"""Offline, explainable URL triage. No link is ever fetched or resolved.

This is a heuristic risk indicator, not a malicious-URL verdict or calibrated ML score.
"""
from __future__ import annotations

from dataclasses import dataclass
import ipaddress
import re
from urllib.parse import unquote, urlsplit

MAX_URL_LENGTH = 2048

# A deliberately small brand set. These domains are *not* treated as safe:
# impersonation is only checked against their exact domain and subdomains.
BRANDS = {
    "google.com", "github.com", "microsoft.com", "apple.com", "amazon.com",
    "paypal.com", "facebook.com", "instagram.com", "linkedin.com",
    "netflix.com", "youtube.com", "wikipedia.org", "dropbox.com",
    "adobe.com", "office.com", "cloudflare.com", "alrajhibank.com.sa",
}
SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly",
    "rb.gy", "cutt.ly", "is.gd", "tiny.cc", "rebrand.ly", "t.ly",
    "shorturl.at", "s.id", "v.gd", "lnkd.in",
}
SENSITIVE_TOKENS = {
    "verify", "verification", "password", "passwd", "credential", "credentials",
    "recover", "recovery", "reset", "suspend", "suspended", "unlock",
    "confirm", "signin", "login", "authenticate", "security-update",
}
WEIGHTS = {
    "ip_host": 23,
    "shortener": 20,
    "brand_impersonation": 31,
    "lookalike_domain": 32,
    "punycode_hostname": 12,
    "deep_subdomains": 11,
    "sensitive_terms": 12,
    "http_only": 10,
    "nonstandard_port": 8,
}
DESCRIPTIONS = {
    "ip_host": ("IP-address host", "Direct IP hosts hide an easily recognizable domain name."),
    "shortener": ("Shortened URL", "The destination is concealed behind a shortening service."),
    "brand_impersonation": ("Brand in unrelated host", "A well-known brand is referenced outside its exact domain."),
    "lookalike_domain": ("Possible lookalike domain", "The host resembles a brand's domain name."),
    "punycode_hostname": ("Encoded domain", "Internationalized hostname uses punycode and deserves closer inspection."),
    "deep_subdomains": ("Unusual subdomain depth", "Many subdomain labels can obscure the effective host."),
    "sensitive_terms": ("Account-action words", "The URL contains words commonly used to prompt account actions."),
    "http_only": ("No HTTPS", "Plain HTTP does not provide transport encryption."),
    "nonstandard_port": ("Nonstandard port", "The URL specifies an uncommon TCP port for web browsing."),
}

class URLValidationError(ValueError):
    """Invalid or unsupported URL input."""


@dataclass(frozen=True)
class ParsedURL:
    raw: str
    scheme: str
    hostname: str
    port: int | None
    path_query: str


def parse_url(value: object) -> ParsedURL:
    if not isinstance(value, str) or not (1 <= len(value) <= MAX_URL_LENGTH):
        raise URLValidationError("URL must be a string between 1 and 2048 characters.")
    if value != value.strip() or any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in value):
        raise URLValidationError("Spaces and control characters are not allowed in URLs.")
    if "\\" in value:
        raise URLValidationError("Backslashes are not allowed in URLs.")
    try:
        parts = urlsplit(value)
        if parts.scheme.lower() not in ("https", "http") or not parts.netloc:
            raise URLValidationError("Only absolute HTTP and HTTPS URLs are supported.")
        if parts.username is not None or parts.password is not None or "@" in parts.netloc:
            raise URLValidationError("URLs containing userinfo are not supported.")
        hostname = (parts.hostname or "").rstrip(".").lower()
        port = parts.port  # Triggers ValueError for malformed ports.
        if not hostname or len(hostname) > 253:
            raise URLValidationError("Invalid hostname.")
        # Reject percent-encoded or malformed hosts and labels; allow IPv6 literals.
        if "%" in hostname or "#" in parts.netloc:
            raise URLValidationError("Encoded or malformed hostnames are not supported.")
        try:
            ipaddress.ip_address(hostname)
        except ValueError:
            ascii_host = hostname.encode("idna").decode("ascii")
            labels = ascii_host.split(".")
            if (len(labels) < 2 or any(not (1 <= len(label) <= 63)
                    or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", label)
                    for label in labels)):
                raise URLValidationError("Invalid hostname labels.")
            hostname = ascii_host
        if port == 0:
            raise URLValidationError("Port 0 is invalid.")
        if "[" in parts.netloc and not parts.netloc.startswith("["):
            raise URLValidationError("Malformed IPv6 address.")
    except (ValueError, UnicodeError) as exc:
        if isinstance(exc, URLValidationError):
            raise
        raise URLValidationError("Malformed URL or port.") from exc
    return ParsedURL(value, parts.scheme.lower(), hostname, port, f"{parts.path}?{parts.query}")


def edit_distance(a: str, b: str) -> int:
    if len(a) < len(b):
        a, b = b, a
    previous = list(range(len(b) + 1))
    for i, char in enumerate(a, 1):
        row = [i]
        for j, other in enumerate(b, 1):
            row.append(min(row[-1] + 1, previous[j] + 1, previous[j - 1] + (char != other)))
        previous = row
    return previous[-1]


def is_exact_or_subdomain(host: str, root: str) -> bool:
    return host == root or host.endswith("." + root)


def features_for(parsed: ParsedURL) -> dict[str, bool]:
    host = parsed.hostname
    labels = host.split(".")
    brand_names = {brand.split(".")[0] for brand in BRANDS}
    is_brand_host = any(is_exact_or_subdomain(host, brand) for brand in BRANDS)
    # Base domain approximation: for the curated brand set (incl. .com.sa), compare
    # against the complete brand root rather than treating every path as a brand name.
    host_words = set(re.split(r"[^a-z0-9]+", host)) - {""}
    impersonation = not is_brand_host and bool(host_words & brand_names)
    lookalike = False
    if not is_brand_host and not impersonation and not _is_ip(host):
        # Check probable host-name labels and hyphen-separated hostname segments.
        # This catches both paypa1.com and paypa1-account.com without treating
        # arbitrary query text as domain ownership evidence.
        candidates = set(labels[:-1])
        candidates.update(segment for label in labels[:-1] for segment in label.split("-"))
        lookalike = any(
            len(candidate) >= 4 and len(name) >= 5
            and candidate != name and edit_distance(candidate, name) == 1
            for candidate in candidates for name in brand_names
        )
    decoded_path = unquote(parsed.path_query).lower()
    # Only exact token boundaries, rather than substring matches inside arbitrary words.
    tokens = set(re.split(r"[^a-z0-9-]+", (host + " " + decoded_path).lower()))
    return {
        "ip_host": _is_ip(host),
        "shortener": host in SHORTENERS,
        "brand_impersonation": impersonation,
        "lookalike_domain": lookalike,
        "punycode_hostname": any(label.startswith("xn--") for label in labels),
        "deep_subdomains": not _is_ip(host) and len(labels) >= 5,
        "sensitive_terms": bool(tokens & SENSITIVE_TOKENS),
        "http_only": parsed.scheme == "http",
        "nonstandard_port": parsed.port is not None and parsed.port not in (80, 443),
    }


def _is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def analyze(value: object) -> dict:
    """Perform deterministic, non-networked analysis and return JSON-safe output."""
    url = parse_url(value)
    features = features_for(url)
    contributions = [
        {"key": key, "title": DESCRIPTIONS[key][0], "detail": DESCRIPTIONS[key][1],
         "weight": weight, "active": features[key], "points": weight if features[key] else 0}
        for key, weight in WEIGHTS.items()
    ]
    points = sum(item["points"] for item in contributions)
    score = min(points, 100)
    if score >= 50:
        level = "HIGH"
    elif score >= 20:
        level = "ELEVATED"
    else:
        level = "LOW"
    triggers = [item for item in contributions if item["active"]]
    summary = (
        "Several structural indicators warrant avoiding this URL until independently verified."
        if level == "HIGH" else
        "Some structural indicators warrant checking the destination through a trusted channel."
        if level == "ELEVATED" else
        "Few selected indicators were observed. This does NOT establish that the URL is safe."
    )
    return {
        "url": url.raw,
        "hostname": url.hostname,
        "scheme": url.scheme,
        "risk_level": level,
        "risk_score": score,
        "score_type": "uncalibrated_heuristic_points",
        "engine": "CyberGuard deterministic rules v2",
        "summary": summary,
        "recommendation": "Open the organization's site independently; never enter credentials after an unexpected QR scan.",
        "feature_count": len(triggers),
        "indicators": contributions,
        "limits": "Static URL analysis only: no reputation checks, redirect resolution, live browsing, or calibrated ML probability.",
    }
