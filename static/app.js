'use strict';

// URL and QR scans go only to this local Flask server. We never open target URLs.
const $ = id => document.getElementById(id);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const history = []; // Ephemeral, sanitized session values only.
let mode = 'url';
let file = null;
let latest = null;

function announce(message) { $('announcer').textContent = message; }
function showError(message) {
  $('errorBanner').textContent = message;
  $('errorBanner').hidden = false;
  announce(message);
}
function clearError() { $('errorBanner').textContent = ''; $('errorBanner').hidden = true; }
function setBusy(state) {
  $('scanButton').disabled = state;
  $('scanButtonLabel').textContent = state ? 'Analyzing…' : (mode === 'url' ? 'Analyze URL' : 'Analyze QR code');
}
function setMode(next) {
  mode = next;
  $('urlPanel').hidden = next !== 'url';
  $('qrPanel').hidden = next !== 'qr';
  $('urlTab').classList.toggle('active', next === 'url');
  $('qrTab').classList.toggle('active', next === 'qr');
  $('urlTab').setAttribute('aria-selected', String(next === 'url'));
  $('qrTab').setAttribute('aria-selected', String(next === 'qr'));
  setBusy(false);
  clearError();
}
function loadFile(newFile) {
  file = newFile || null;
  $('fileName').textContent = file ? file.name : 'No image selected';
  if (file && file.size > MAX_IMAGE_BYTES) showError('This image is too large. Select a file under 5 MB.');
  else clearError();
}

function drawResult(result) {
  latest = result;
  $('resultEmpty').hidden = true;
  $('resultContent').hidden = false;
  const level = result.risk_level;
  const score = Math.min(100, Math.max(0, Number(result.risk_score) || 0));
  const text = level === 'HIGH' ? 'High risk' : level === 'ELEVATED' ? 'Elevated risk' : 'Low indicators';
  const color = level === 'HIGH' ? '#ff7885' : level === 'ELEVATED' ? '#fbbd72' : '#5de6c2';
  $('riskScore').textContent = String(score);
  $('gauge').style.setProperty('--percent', `${score}%`);
  $('gauge').style.setProperty('--gauge-color', color);
  $('gauge').setAttribute('aria-label', `Risk score ${score} out of 100: ${text}`);
  $('riskLevel').textContent = text;
  $('riskLevel').style.color = color;
  $('riskSummary').textContent = String(result.summary || 'Review the indicators below.');
  $('riskHost').textContent = String(result.hostname || 'Unknown');
  const badge = $('resultBadge');
  badge.className = `pill ${level === 'HIGH' ? 'high' : level === 'ELEVATED' ? 'elevated' : 'low'}`;
  badge.textContent = text;
  const active = (Array.isArray(result.indicators) ? result.indicators : []).filter(item => item && item.active);
  $('indicatorCount').textContent = `${active.length} ${active.length === 1 ? 'signal' : 'signals'}`;
  const target = $('indicators');
  target.replaceChildren();
  if (active.length === 0) {
    const paragraph = document.createElement('div');
    paragraph.className = 'no-findings';
    paragraph.textContent = 'No selected structural risk indicators were detected. This does not guarantee safety.';
    target.append(paragraph);
  } else {
    for (const item of active) {
      const row = document.createElement('div'); row.className = 'indicator';
      const mark = document.createElement('span'); mark.className = 'indicator-mark'; mark.textContent = '!';
      const main = document.createElement('div'); main.className = 'indicator-main';
      const name = document.createElement('strong'); name.textContent = item.title;
      const detail = document.createElement('span'); detail.textContent = item.detail;
      main.append(name, detail);
      const points = document.createElement('span'); points.className = 'indicator-points'; points.textContent = `+${item.points}`;
      row.append(mark, main, points);
      target.append(row);
    }
  }
  announce(`Scan finished. ${text}, ${score} points.`);
}

function renderHistory() {
  const counts = {LOW: 0, ELEVATED: 0, HIGH: 0};
  let scoreSum = 0;
  for (const entry of history) {
    counts[entry.level] += 1;
    scoreSum += entry.score;
  }
  $('scanCount').textContent = String(history.length);
  $('highCount').textContent = String(counts.HIGH);
  $('averageScore').textContent = history.length ? String(Math.round(scoreSum / history.length)) : '0';
  $('lowTotal').textContent = String(counts.LOW);
  $('elevatedTotal').textContent = String(counts.ELEVATED);
  $('highTotal').textContent = String(counts.HIGH);
  $('ringTotal').textContent = String(history.length);
  if (history.length === 0) {
    $('distributionRing').style.background = 'conic-gradient(#314456 0 100%)';
  } else {
    const low = 100 * counts.LOW / history.length;
    const mid = low + 100 * counts.ELEVATED / history.length;
    $('distributionRing').style.background = `conic-gradient(#5de6c2 0 ${low}%, #fbbd72 ${low}% ${mid}%, #ff7885 ${mid}% 100%)`;
  }
  const list = $('activityList'); list.replaceChildren();
  if (!history.length) {
    const p = document.createElement('p'); p.className = 'activity-empty'; p.textContent = 'No scans yet. Your history will appear here.';
    list.append(p); return;
  }
  for (const item of history.slice(0, 5)) {
    const row = document.createElement('div'); row.className = 'activity-row';
    const left = document.createElement('div'); left.className = 'activity-domain';
    const dot = document.createElement('i'); dot.className = `legend-dot ${item.level.toLowerCase()}`;
    const name = document.createElement('span'); name.textContent = item.host;
    const value = document.createElement('span'); value.className = 'activity-score';
    const bold = document.createElement('b'); bold.textContent = String(item.score);
    value.append(bold, document.createTextNode('/ 100'));
    left.append(dot, name); row.append(left, value); list.append(row);
  }
}

async function runScan(event) {
  event.preventDefault(); clearError();
  const opts = {method: 'POST'};
  let endpoint;
  if (mode === 'url') {
    const url = $('urlInput').value.trim();
    if (!url) { showError('Enter a URL to analyze.'); $('urlInput').focus(); return; }
    endpoint = '/api/analyze/url';
    opts.headers = {'Content-Type': 'application/json'};
    opts.body = JSON.stringify({url});
  } else {
    if (!file) { showError('Select a QR code image first.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { showError('This image is too large. Select a file under 5 MB.'); return; }
    endpoint = '/api/analyze/qr';
    const form = new FormData(); form.append('image', file);
    opts.body = form;
  }
  setBusy(true);
  try {
    const response = await fetch(endpoint, opts);
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Could not analyze this input.');
    drawResult(payload.result);
    history.unshift({host: payload.result.hostname, score: payload.result.risk_score, level: payload.result.risk_level});
    if (history.length > 50) history.pop();
    renderHistory();
    $('results').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest'});
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
  } finally { setBusy(false); }
}
function exportReport() {
  if (!latest) return;
  const blob = new Blob([JSON.stringify({generated_at: new Date().toISOString(), result: latest}, null, 2)], {type:'application/json'});
  const address = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = address; anchor.download = 'cyberguard-report.json';
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(address), 0);
  announce('Report downloaded.');
}

$('urlTab').addEventListener('click', () => setMode('url'));
$('qrTab').addEventListener('click', () => setMode('qr'));
$('scanForm').addEventListener('submit', runScan);
$('qrFile').addEventListener('change', event => loadFile(event.target.files[0]));
$('exportButton').addEventListener('click', exportReport);
$('clearButton').addEventListener('click', () => { history.length = 0; renderHistory(); announce('Session history cleared.'); });
document.querySelectorAll('.example').forEach(button => button.addEventListener('click', () => {
  setMode('url'); $('urlInput').value = button.dataset.url; $('urlInput').focus();
}));
const dropzone = $('dropzone');
for (const type of ['dragenter','dragover']) dropzone.addEventListener(type, event => {event.preventDefault(); dropzone.classList.add('dragging');});
for (const type of ['dragleave','drop']) dropzone.addEventListener(type, event => {event.preventDefault(); dropzone.classList.remove('dragging');});
dropzone.addEventListener('drop', event => {if (event.dataTransfer.files.length) loadFile(event.dataTransfer.files[0]);});
renderHistory();
