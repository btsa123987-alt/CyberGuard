"""Guardrails against accidentally removing Arabic-first charts or weakening UI safety."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_arabic_first_and_accessible_charts_exist():
    html = (ROOT / 'templates' / 'index.html').read_text(encoding='utf-8')
    assert '<html lang="ar" dir="rtl">' in html
    for expected in ('id="distributionRing"', 'id="trendChart"', 'id="trendEmpty"', 'id="scanForm"'):
        assert expected in html
    assert 'aria-live="polite"' in html


def test_chart_values_come_from_analyzer_and_no_remote_scripts():
    html = (ROOT / 'templates' / 'index.html').read_text(encoding='utf-8')
    js = (ROOT / 'static' / 'app.js').read_text(encoding='utf-8')
    assert 'scoreHistory.push(' in js
    assert 'updateCharts()' in js
    assert "scoreHistory.length=0" in js
    assert 'Math.random' not in js
    assert 'innerHTML' not in js
    assert 'https://' not in html.split('<script defer src=')[1].split('</head>')[0]


def test_design_system_documented():
    assert (ROOT / 'design-system' / 'cyberguard' / 'MASTER.md').is_file()
    assert (ROOT / '.github' / 'copilot-instructions.md').is_file()
