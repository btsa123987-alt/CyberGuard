'use strict';

/* CyberGuard browser-only UI. No external libraries, analytics calls, or URLs fetched.
   URL submissions go only to the local Flask application. Scan history stores hostnames,
   heuristic scores and rule explanations in this browser tab's sessionStorage. */

const $ = id => document.getElementById(id);
const SESSION_KEY = 'cyberguard:session:v1';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_RECORDS = 24;
const COLORS = {HIGH: '#ff7582', ELEVATED: '#f8c86c', LOW: '#69d5a7'};
const SVG_NS = 'http://www.w3.org/2000/svg';

function announce(message) {
  const region = $('announcer');
  if (region) region.textContent = message;
}
function safeText(value, max = 320) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}
function safeScore(value) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.min(100, Math.max(0, Math.round(num))) : 0;
}
function readHistory() {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item === 'object'
      && ['HIGH', 'ELEVATED', 'LOW'].includes(item.level)
      && typeof item.hostname === 'string' && Array.isArray(item.indicators))
      .slice(-MAX_RECORDS);
  } catch (_error) {
    return [];
  }
}
function writeHistory(items) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(items.slice(-MAX_RECORDS)));
    return true;
  } catch (_error) {
    return false;
  }
}
function addScan(result, inputType) {
  const indicators = Array.isArray(result.indicators) ? result.indicators : [];
  const sanitizedIndicators = indicators.filter(item => item && item.active).slice(0, 12).map(item => ({
    key: safeText(item.key, 50),
    title: safeText(item.title, 110),
    detail: safeText(item.detail, 250),
    points: safeScore(item.points),
  }));
  const record = {
    hostname: safeText(result.hostname, 253),
    score: safeScore(result.risk_score),
    level: ['HIGH', 'ELEVATED', 'LOW'].includes(result.risk_level) ? result.risk_level : 'LOW',
    summary: safeText(result.summary, 500),
    type: inputType === 'QR' ? 'QR' : 'URL',
    indicators: sanitizedIndicators,
    at: new Date().toISOString(),
  };
  // A full submitted URL is deliberately never saved, including paths or query strings.
  return writeHistory([...readHistory(), record]);
}

function initScanner() {
  let mode = 'URL';
  let file = null;
  const error = $('errorBanner');
  const showError = message => {
    error.textContent = message;
    error.hidden = false;
    announce(message);
  };
  const clearError = () => { error.hidden = true; error.textContent = ''; };
  const busy = state => {
    $('scanButton').disabled = state;
    $('scanButtonLabel').textContent = state ? 'Analyzing…' : 'Analyze and open dashboard';
  };
  function selectMode(next) {
    mode = next;
    $('urlPanel').hidden = next !== 'URL';
    $('qrPanel').hidden = next !== 'QR';
    $('urlTab').classList.toggle('selected', next === 'URL');
    $('qrTab').classList.toggle('selected', next === 'QR');
    $('urlTab').setAttribute('aria-selected', String(next === 'URL'));
    $('qrTab').setAttribute('aria-selected', String(next === 'QR'));
    clearError();
  }
  $('urlTab').addEventListener('click', () => selectMode('URL'));
  $('qrTab').addEventListener('click', () => selectMode('QR'));
  document.querySelectorAll('[data-url]').forEach(button => button.addEventListener('click', () => {
    selectMode('URL');
    $('urlInput').value = button.dataset.url;
    $('urlInput').focus();
  }));
  const setFile = newFile => {
    file = newFile || null;
    $('fileName').textContent = file ? file.name.slice(0, 100) : 'No file selected · max 5 MB';
    if (file && file.size > MAX_IMAGE_BYTES) showError('Image exceeds 5 MB. Please choose a smaller image.');
    else clearError();
  };
  $('qrFile').addEventListener('change', event => setFile(event.target.files[0]));
  const zone = $('dropzone');
  zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('dragging'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', event => {
    event.preventDefault();
    zone.classList.remove('dragging');
    setFile(event.dataTransfer.files[0]);
  });
  $('scanForm').addEventListener('submit', async event => {
    event.preventDefault();
    clearError();
    let endpoint = '/api/analyze/url';
    let opts;
    if (mode === 'URL') {
      const url = $('urlInput').value.trim();
      if (!/^https?:\/\//i.test(url)) { showError('Enter a full URL beginning with http:// or https://'); return; }
      opts = {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({url})};
    } else {
      if (!file) { showError('Choose a QR code image first.'); return; }
      if (file.size > MAX_IMAGE_BYTES) { showError('Image exceeds 5 MB.'); return; }
      const formData = new FormData(); formData.append('image', file);
      endpoint = '/api/analyze/qr';
      opts = {method: 'POST', body: formData};
    }
    busy(true);
    try {
      const response = await fetch(endpoint, opts);
      const data = await response.json();
      if (!response.ok || !data.success || !data.result) {
        throw new Error(safeText(data.message, 250) || `Analysis failed (${response.status}).`);
      }
      if (!addScan(data.result, mode)) throw new Error('Browser session storage is unavailable. Please allow session storage and try again.');
      announce('Scan finished. Opening dashboard.');
      window.location.assign('/dashboard');
    } catch (exception) {
      showError(exception.message || 'Analysis could not be completed.');
      busy(false);
    }
  });
}

function svgEl(tag, attrs = {}, text = null) {
  const item = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, String(value));
  if (text !== null) item.textContent = String(text);
  return item;
}
function formatTime(iso) {
  const time = new Date(iso);
  return Number.isNaN(time.getTime()) ? '—' : time.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
}
function riskName(level) {
  return level === 'HIGH' ? 'High risk' : level === 'ELEVATED' ? 'Elevated' : 'Low';
}
function renderTimeline(history) {
  const svg = $('trendChart');
  svg.replaceChildren();
  const w = 640, h = 248, left = 42, right = 22, top = 18, bottom = 34;
  const pw = w - left - right, ph = h - top - bottom;
  for (let value = 0; value <= 100; value += 25) {
    const y = top + (100 - value) / 100 * ph;
    svg.append(svgEl('line', {x1: left, y1: y, x2: w - right, y2: y, stroke: '#3a3345', 'stroke-dasharray': value ? '4 7' : '0', 'stroke-width': 1}));
    svg.append(svgEl('text', {x: left - 11, y: y + 4, 'text-anchor': 'end', fill: '#8b809d', 'font-size': 11}, value));
  }
  if (!history.length) { $('trendEmpty').hidden = false; return; }
  $('trendEmpty').hidden = true;
  const entries = history.slice(-12);
  const points = entries.map((r, i) => ({
    x: entries.length === 1 ? left + pw / 2 : left + (i / (entries.length - 1)) * pw,
    y: top + (100 - safeScore(r.score)) / 100 * ph,
    score: safeScore(r.score),
  }));
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1].x},${top + ph} L${points[0].x},${top + ph} Z`;
  const defs = svgEl('defs');
  const gradient = svgEl('linearGradient', {id: 'riskAreaFill', x1: 0, y1: 0, x2: 0, y2: 1});
  gradient.append(svgEl('stop', {offset: '0%', 'stop-color': '#a881f5', 'stop-opacity': '.26'}), svgEl('stop', {offset: '100%', 'stop-color': '#a881f5', 'stop-opacity': '.005'}));
  defs.append(gradient); svg.append(defs);
  svg.append(svgEl('path', {d: area, fill: 'url(#riskAreaFill)'}));
  svg.append(svgEl('path', {d: line, stroke: '#bb94ff', fill: 'none', 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}));
  points.forEach((point, index) => {
    const circle = svgEl('circle', {cx: point.x, cy: point.y, r: 5, fill: '#c5a2ff', stroke: '#181420', 'stroke-width': 3});
    circle.append(svgEl('title', {}, `Scan ${history.length - entries.length + index + 1}: ${point.score}/100`));
    svg.append(circle);
  });
  const labels = [...new Set([0, Math.floor((entries.length - 1) / 2), entries.length - 1])];
  labels.forEach(index => {
    const point = points[index];
    svg.append(svgEl('text', {x: point.x, y: h - 9, 'text-anchor': 'middle', fill: '#8e859e', 'font-size': 11}, `#${history.length - entries.length + index + 1}`));
  });
}
function renderDonut(counts) {
  const total = counts.HIGH + counts.ELEVATED + counts.LOW;
  $('donutTotal').textContent = String(total);
  $('highCount').textContent = String(counts.HIGH);
  $('elevatedCount').textContent = String(counts.ELEVATED);
  $('lowCount').textContent = String(counts.LOW);
  const circumference = 2 * Math.PI * 78;
  let offset = 0;
  const target = $('donutSegments'); target.replaceChildren();
  if (!total) return;
  for (const level of ['HIGH', 'ELEVATED', 'LOW']) {
    if (counts[level] === 0) continue;
    const length = circumference * counts[level] / total;
    const circle = svgEl('circle', {cx: 110, cy: 110, r: 78, class: 'donut-segment', stroke: COLORS[level], 'stroke-dasharray': `${length} ${circumference - length}`, 'stroke-dashoffset': -offset});
    circle.append(svgEl('title', {}, `${riskName(level)}: ${counts[level]} scans`));
    target.append(circle); offset += length;
  }
}
function renderAssessment(item) {
  $('assessmentEmpty').hidden = !!item;
  $('assessmentContent').hidden = !item;
  if (!item) return;
  const score = safeScore(item.score);
  const gauge = $('miniGauge');
  gauge.style.setProperty('--score-angle', `${score * 3.6}deg`);
  gauge.style.setProperty('--score-color', COLORS[item.level]);
  $('assessmentScore').textContent = String(score);
  $('assessmentHost').textContent = safeText(item.hostname, 253);
  $('assessmentSummary').textContent = safeText(item.summary, 500);
  $('assessmentSignals').textContent = String(item.indicators.length);
  $('assessmentTime').textContent = formatTime(item.at);
  const pill = $('assessmentLevel');
  pill.className = `severity-pill ${item.level.toLowerCase()}`;
  pill.textContent = riskName(item.level);
  $('downloadReport').onclick = () => {
    // Do not export the full URL, query, or any secret-bearing URL path.
    const clean = {type: item.type, hostname: item.hostname, risk_score: score,
      risk_level: item.level, indicators: item.indicators, analyzed_at: item.at,
      score_note: 'Uncalibrated heuristic points; no proof of safety or maliciousness.'};
    const blob = new Blob([JSON.stringify(clean, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'cyberguard-assessment.json';
    document.body.append(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
    announce('Assessment report downloaded.');
  };
}
function renderSignals(history) {
  const map = new Map();
  history.forEach(record => record.indicators.forEach(indicator => {
    const key = safeText(indicator.key, 50);
    if (!key) return;
    const existing = map.get(key) || {title: safeText(indicator.title, 110) || key, count: 0};
    existing.count += 1;
    map.set(key, existing);
  }));
  const entries = [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const bars = $('signalBars'); bars.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('p'); empty.className = 'widget-empty';
    empty.textContent = 'No active indicators recorded yet.'; bars.append(empty); return;
  }
  const maximum = entries[0].count;
  entries.forEach(entry => {
    const row = document.createElement('div'); row.className = 'signal-entry';
    const title = document.createElement('span'); title.className = 'signal-label'; title.textContent = entry.title;
    const count = document.createElement('span'); count.className = 'signal-value'; count.textContent = String(entry.count);
    const track = document.createElement('div'); track.className = 'signal-track';
    const fill = document.createElement('span'); fill.className = 'signal-fill'; fill.style.width = `${entry.count / maximum * 100}%`;
    track.append(fill); row.append(title, count, track); bars.append(row);
  });
}
function renderTable(history, onSelect) {
  const tbody = $('activityBody'); tbody.replaceChildren();
  if (!history.length) {
    const tr = document.createElement('tr'), td = document.createElement('td');
    td.colSpan = 7; td.className = 'table-empty'; td.textContent = 'No scans yet — start with the scanner.';
    tr.append(td); tbody.append(tr); return;
  }
  [...history].reverse().forEach((record, displayIndex) => {
    const tr = document.createElement('tr');
    const domain = document.createElement('td'); domain.className = 'domain'; domain.textContent = record.hostname;
    const type = document.createElement('td'); type.textContent = record.type;
    const indicator = document.createElement('td'); indicator.textContent = String(record.indicators.length);
    const risk = document.createElement('td'); const pill = document.createElement('span');
    pill.className = `table-pill ${record.level.toLowerCase()}`; pill.textContent = riskName(record.level); risk.append(pill);
    const score = document.createElement('td'); score.className = 'score-cell'; score.textContent = String(safeScore(record.score));
    const time = document.createElement('td'); time.textContent = formatTime(record.at);
    const details = document.createElement('td'), button = document.createElement('button');
    button.type = 'button'; button.className = 'table-button'; button.textContent = 'Inspect';
    button.setAttribute('aria-label', `Inspect scan of ${record.hostname}`);
    button.addEventListener('click', () => onSelect(history.length - 1 - displayIndex));
    details.append(button); tr.append(domain, type, indicator, risk, score, time, details); tbody.append(tr);
  });
}
function initDashboard() {
  let history = readHistory();
  let selected = history.length - 1;
  function render() {
    history = readHistory();
    const counts = {HIGH: 0, ELEVATED: 0, LOW: 0};
    let sum = 0, indicators = 0;
    history.forEach(record => { counts[record.level]++; sum += safeScore(record.score); indicators += record.indicators.length; });
    $('totalScans').textContent = String(history.length);
    $('highScans').textContent = String(counts.HIGH);
    $('averageRisk').textContent = history.length ? String(Math.round(sum / history.length)) : '0';
    $('totalSignals').textContent = String(indicators);
    renderTimeline(history); renderDonut(counts); renderSignals(history);
    if (selected >= history.length) selected = history.length - 1;
    renderAssessment(history[selected] || null);
    renderTable(history, index => {
      selected = index; renderAssessment(history[selected]);
      $('assessmentHeading').textContent = 'Selected assessment';
      document.querySelector('.assessment-widget').scrollIntoView({behavior: 'smooth', block: 'center'});
      announce(`Now inspecting ${history[selected].hostname}`);
    });
  }
  $('clearHistory').addEventListener('click', () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_error) { /* blocked storage */ }
    selected = -1;
    $('assessmentHeading').textContent = 'Risk assessment';
    render(); announce('Session history cleared.');
  });
  render();
}
if (document.body.dataset.page === 'scanner') initScanner();
if (document.body.dataset.page === 'dashboard') initDashboard();
