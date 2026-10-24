# Optional ML and SHAP research lab (not part of live scoring)

The original prototype mixed rule-based scores with names like "XGBoost confidence" and "SHAP". That can mislead visitors when no trained model is making the prediction. CyberGuard v2 uses **transparent deterministic rules** for all dashboard and API scores, and keeps genuine ML research isolated from the product.

If you have permission to use a correctly labeled dataset, you can run an optional XGBoost experiment:

```bash
python -m pip install -r requirements-ml.txt
python -m scripts.ml_experiment --dataset /path/to/approved-urls.csv
# Optionally generate *actual* model-attribution values for one held-out row:
python -m scripts.ml_experiment --dataset /path/to/approved-urls.csv --shap
```

Input CSV:

```csv
url,label
https://example.com/docs,benign
http://example.invalid/login,phishing
```

This two-row file is an **illustration only** and is far too small to train. Real runs require at least 60 samples, 20 distinct hostnames, and 20 observations per class. Invalid rows are skipped.

The research pipeline uses domain-grouped train/test splitting to reduce cross-split hostname overlap; it reports holdout precision, recall, F1 and a confusion matrix. It can still overestimate effectiveness due to selection bias, campaign leakage, synthetic labels, time leakage, and domain-generalization failures. Do not claim field effectiveness from these metrics alone. This script does not serialize untrusted models or affect `app.py`.

For a defensible ML study: establish provenance and licensing for all data, de-duplicate, split chronologically and by registrable domain / campaign, benchmark on future independently sourced phishing and benign sets, evaluate precision-recall under real deployment class imbalance, calibrate if using probabilities, and perform adversarial and fairness analysis. Document limitations and abstention policy. Explainability does not itself guarantee that a prediction is correct.
