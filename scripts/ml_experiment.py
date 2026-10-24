"""OPTIONAL research-only XGBoost experiment on user-provided labeled URL data.

No training in the live app; no network access and no model artifact generated.
Use domain-grouped holdout to reduce the worst duplicate-domain leakage.
Never interpret these results as live phishing-detection performance.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path
import sys

from cyberguard.analyzer import WEIGHTS, features_for, parse_url, URLValidationError


def load_samples(path: Path):
    data = []
    with path.open('r', encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if not {'url', 'label'} <= set(reader.fieldnames or []):
            raise ValueError('CSV must have columns: url,label')
        for row in reader:
            label = (row.get('label') or '').strip().lower()
            if label not in ('benign', 'phishing'):
                continue
            try:
                parsed = parse_url(row.get('url'))
            except URLValidationError:
                continue
            feats = features_for(parsed)
            data.append(([int(feats[k]) for k in WEIGHTS], int(label == 'phishing'), parsed.hostname))
    return data


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, required=True, help='CSV with columns url,label (benign or phishing).')
    parser.add_argument('--shap', action='store_true', help='Explain one held-out prediction with real SHAP values.')
    args = parser.parse_args(argv)
    try:
        from sklearn.model_selection import GroupShuffleSplit
        from sklearn.metrics import classification_report, confusion_matrix
        from xgboost import XGBClassifier
    except ImportError:
        parser.error('Install optional dependencies: pip install -r requirements-ml.txt')
    samples = load_samples(args.dataset)
    if len(samples) < 60 or len(set(s[2] for s in samples)) < 20:
        parser.error('Need at least 60 labeled URLs from 20 distinct hostnames.')
    counts = Counter(sample[1] for sample in samples)
    if min(counts.values(), default=0) < 20 or len(counts) != 2:
        parser.error('Need at least 20 observations per class.')
    x = [sample[0] for sample in samples]
    y = [sample[1] for sample in samples]
    groups = [sample[2] for sample in samples]
    train_ix, test_ix = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42).split(x, y, groups))
    train_y = [y[i] for i in train_ix]
    test_y = [y[i] for i in test_ix]
    if len(set(train_y)) != 2 or len(set(test_y)) != 2:
        parser.error('Split contains only one class: supply a larger and more diverse dataset.')
    model = XGBClassifier(n_estimators=80, max_depth=3, learning_rate=0.05,
                          subsample=0.8, colsample_bytree=1.0, eval_metric='logloss',
                          random_state=42, n_jobs=2)
    model.fit([x[i] for i in train_ix], train_y)
    predicted = model.predict([x[i] for i in test_ix])
    output = {
        'EXPERIMENTAL_ONLY': True,
        'warning': 'NOT a validated phishing detector. Grouped holdout does not prevent time or campaign leakage.',
        'data_source': 'user-supplied labels, quality not verified',
        'training_samples': len(train_ix), 'holdout_samples': len(test_ix),
        'features': list(WEIGHTS),
        'classification_report': classification_report(test_y, predicted, output_dict=True, zero_division=0),
        'confusion_matrix': confusion_matrix(test_y, predicted, labels=[0, 1]).tolist(),
    }
    if args.shap:
        try:
            import shap
        except ImportError:
            parser.error('Optional SHAP is missing: pip install -r requirements-ml.txt')
        explainer = shap.TreeExplainer(model)
        explanation = explainer([x[test_ix[0]]])
        values = explanation.values[0]
        output['shap_example'] = {k: round(float(v), 5) for k, v in zip(WEIGHTS, values)}
        output['shap_example_note'] = 'Actual model attribution for a single held-out test row, not heuristic weights.'
    print(json.dumps(output, indent=2, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
