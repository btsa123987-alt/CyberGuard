"""Evidence integrity and exact Shapley tests for the existing rule-based score."""
import pytest
from analyzer import analyze, WEIGHTS
from explainability import explain_score
from security_knowledge import retrieve

@pytest.mark.parametrize("url, expected", [
    ("https://example.com", 0),
    ("http://paypa1.example/verify/password", 54),
    ("http://192.0.2.1/login/verify", 45),
    ("http://google.com.example.test/reset", 53),
])
def test_exact_shapley_matches_actual_engine(url, expected):
    result = analyze(url)
    explanation = explain_score(result)
    assert explanation["score"] == expected
    assert explanation["method"] == "exact_shapley_values"
    assert explanation["explained_engine"] == "deterministic_rule_score_not_ml"
    assert sum(feature["shap_value"] for feature in explanation["features"]) == pytest.approx(expected, abs=1e-4)
    assert all(feature["shap_value"] >= 0 for feature in explanation["features"])


def test_capped_score_distributes_shapley_fairly():
    """Raw rule weights would exceed 100; SHAP still sums to capped result."""
    features = [{"key": key, "active": True} for key in WEIGHTS]
    explanation = explain_score({"indicators": features, "risk_score": 100})
    assert sum(WEIGHTS.values()) > 100
    assert explanation["score"] == 100
    assert sum(f["shap_value"] for f in explanation["features"]) == pytest.approx(100, abs=1e-4)
    assert any(f["shap_value"] < f["raw_rule_weight"] for f in explanation["features"])


def test_mismatched_inputs_rejected():
    with pytest.raises(ValueError, match="differs"):
        explain_score({"indicators": [{"key": "http_only", "active": True}], "risk_score": 99})


def test_bm25_rag_returns_citable_local_sources():
    result = retrieve(["lookalike_domain", "sensitive_terms", "http_only"], "URL")
    assert result["retrieval_algorithm"] == "hybrid_rule_match_plus_bm25"
    assert result["corpus_size"] >= 5
    assert result["evidence_coverage"]["matched_flags"] == 3
    assert all(row["url"].startswith("https://") and isinstance(row["lexical_bm25"], float) for row in result["documents"])
    assert all(row["ranking_score"] >= 0 for row in result["documents"])
