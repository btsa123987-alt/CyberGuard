"""Exact Shapley (SHAP-method) attribution of CyberGuard's existing heuristic scorer.

This is a mathematically exact, model-agnostic explanation of the *deterministic*
rule score, NOT a machine-learning classifier or prediction confidence estimate.

We use a zero-feature reference (all currently active warning flags switched off),
then enumerate all feature coalitions of active flags. This naturally handles
100-point clipping, where naive display of raw rule weights is not additive.
"""
from __future__ import annotations

from itertools import combinations
from math import comb

from analyzer import WEIGHTS, DESCRIPTIONS


def _score(keys: tuple[str, ...]) -> int:
    return min(100, sum(WEIGHTS[key] for key in keys))


def explain_score(result: dict) -> dict:
    """Return additive Shapley explanations using the verified analyzer flags.

    For n active rules, each phi_i = sum_{S subset N without {i}} [f(S+i)-f(S)] /
    (n * C(n-1, |S|)). For nine rules total this is at most 2304 deltas.
    No pandas, network traffic or SHAP runtime dependency is required.
    """
    active = tuple(key for key in WEIGHTS if any(
        row.get("key") == key and row.get("active") is True for row in result["indicators"]
    ))
    expected = _score(active)
    if expected != result["risk_score"]:
        raise ValueError("Rule-based explanation differs from analyzer score")
    n = len(active)
    output = []
    for key in active:
        others = tuple(k for k in active if k != key)
        shapley = 0.0
        for count in range(n):
            factor = 1 / (n * comb(n - 1, count))
            for subset in combinations(others, count):
                shapley += (_score(subset + (key,)) - _score(subset)) * factor
        output.append({
            "key": key,
            "label": DESCRIPTIONS[key][0],
            "shap_value": round(shapley, 6),
            "raw_rule_weight": WEIGHTS[key],
            "present": True,
        })
    return {
        "method": "exact_shapley_values",
        "display_name": "Exact SHAP (Shapley attribution)",
        "explained_engine": "deterministic_rule_score_not_ml",
        "baseline": 0,
        "score": expected,
        "features": sorted(output, key=lambda r: (-r["shap_value"], r["key"])),
        "description": (
            "Exact Shapley values explain how the original binary warning flags "
            "contribute to the 0–100 capped heuristic score. The baseline means "
            "all active flags turned off; it is not a learned data baseline. "
            "Values are not a probability, model accuracy, or a safety verdict."
        ),
        "validity": "exact_additive_attribution",
    }
