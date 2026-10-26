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
function addScan(result, inputType, aiContextToken) {
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
    recommendation: safeText(result.recommendation, 500),
    type: inputType === 'QR' ? 'QR' : 'URL',
    indicators: sanitizedIndicators,
    ai_context_token: safeText(aiContextToken, 2000),
    at: new Date().toISOString(),
  };
  // A full submitted URL is deliberately never saved, including paths or query strings.
  return writeHistory([...readHistory(), record]);
}

/* Animated scan experience — presentation only. The bar is indeterminate, never a
   fabricated percentage; navigation waits for the actual Flask response. */
function createScanTransition() {
  const layer = $('scanTransition');
  if (!layer) return null;
  const canvas = $('particleField');
  const ctx = canvas.getContext('2d', {alpha: true});
  const cancelButton = $('cancelScan');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0, height = 0, pixelRatio = 1, dots = [], frame = 0, startTime = 0, active = false;
  let onCancel = () => {};
  const random = seed => { const v = Math.sin(seed * 127.1 + 91.7) * 43758.5453; return v - Math.floor(v); };
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const count = reducedMotion ? 120 : Math.min(1100, Math.max(380, Math.floor(width * height / 1250)));
    dots = Array.from({length: count}, (_, i) => ({seed: i, theta: random(i + 2) * 6.283, phi: Math.acos(2 * random(i + 10) - 1), radius: Math.pow(random(i + 15), .58), offset: random(i + 45), phase: random(i + 65) * 6.283}));
  }
  function draw(now) {
    if (!active || !ctx) return;
    ctx.clearRect(0, 0, width, height);
    const elapsed = reducedMotion ? 1600 : now - startTime;
    const cx = width / 2, cy = height * (width < 720 ? .47 : .53);
    const spread = Math.min(width * .34, 300), tall = Math.min(height * .40, 315);
    const morph = reducedMotion ? .9 : Math.max(0, Math.min(1, (elapsed - 430) / 1450));
    for (const p of dots) {
      const angle = p.theta + elapsed * .00024;
      let x = (Math.cos(angle) * Math.sin(p.phi) * p.radius + Math.cos(angle * 3 + elapsed * .00041) * .13) * spread;
      let y = (Math.cos(p.phi) * p.radius + Math.sin(angle * 2 + elapsed * .00039) * .07) * tall;
      let z = Math.sin(angle) * Math.sin(p.phi) * p.radius;
      const spiral = p.offset * Math.PI * 11 + elapsed * .00135;
      const row = p.seed % 2 ? Math.PI : 0;
      x = (1 - morph) * x + morph * Math.sin(spiral + row) * spread * .47;
      y = (1 - morph) * y + morph * (p.offset - .5) * tall * 1.7;
      z = (1 - morph) * z + morph * Math.cos(spiral + row);
      const perspective = 1 + z * .24;
      const opacity = reducedMotion ? .65 : .23 + .52 * (.5 + .5 * Math.sin(p.phase + elapsed * .0012));
      const isBlue = p.seed % 5 < 2;
      ctx.fillStyle = isBlue ? `rgba(94,191,255,${opacity})` : `rgba(194,129,255,${opacity})`;
      const radius = .55 + (z + 1) * .5 + (p.seed % 27 === 0 ? 1.3 : 0);
      ctx.beginPath(); ctx.arc(cx + x * perspective, cy + y * perspective, radius, 0, Math.PI * 2); ctx.fill();
    }
    if (!reducedMotion) frame = requestAnimationFrame(draw);
  }
  function hide() {
    document.querySelector('.application')?.removeAttribute('inert');
    active = false;
    cancelAnimationFrame(frame);
    layer.hidden = true;
    document.body.classList.remove('scanning-active');
    window.removeEventListener('resize', resize);
    cancelButton.onclick = null;
    document.removeEventListener('keydown', onEscape);
  }
  function onEscape(event) { if (event.key === 'Escape') { event.preventDefault(); onCancel(); } }
  function show(cancel) {
    onCancel = cancel;
    active = true;
    layer.hidden = false;
    document.body.classList.add('scanning-active');
    document.querySelector('.application')?.setAttribute('inert', '');
    $('scanPhase').textContent = 'Evaluating indicators…';
    $('transitionTitle').innerHTML = 'Tracing the <em>unseen.</em>';
    cancelButton.onclick = onCancel;
    document.addEventListener('keydown', onEscape);
    window.addEventListener('resize', resize, {passive:true});
    cancelButton.focus();
    resize();
    startTime = performance.now();
    if (ctx) frame = requestAnimationFrame(draw);
  }
  function completed() {
    $('scanPhase').textContent = 'Assessment complete · Loading dashboard';
    $('transitionTitle').innerHTML = 'Signals <em>resolved.</em>';
  }
  return {show, hide, completed, reducedMotion};
}

function initScanner() {
  let mode = 'URL';
  let file = null;
  const error = $('errorBanner');
  const transition = createScanTransition();
  let currentController = null;
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
    const controller = new AbortController();
    currentController = controller;
    opts.signal = controller.signal;
    const startAt = performance.now();
    let timedOut = false;
    let cancelled = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    const stop = () => { cancelled = true; controller.abort(); transition?.hide(); busy(false); $('scanButton').focus(); };
    transition?.show(stop);
    try {
      const response = await fetch(endpoint, opts);
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok || !data.success || !data.result) {
        throw new Error(safeText(data.message, 250) || `Analysis failed (${response.status}).`);
      }
      // The motion is cinematic and deliberately not a fake measured percentage.
      // Never complete the UI until the real backend has returned a valid result.
      const minimum = transition?.reducedMotion ? 0 : 1450;
      const elapsed = performance.now() - startAt;
      if (elapsed < minimum) await new Promise(resolve => window.setTimeout(resolve, minimum - elapsed));
      if (cancelled) return;
      transition?.completed();
      if (!transition?.reducedMotion) await new Promise(resolve => window.setTimeout(resolve, 380));
      if (cancelled) return;
      if (!addScan(data.result, mode, data.ai_context_token)) throw new Error('Browser session storage is unavailable. Please allow session storage and try again.');
      announce('Scan finished. Opening dashboard.');
      window.location.assign('/dashboard');
    } catch (exception) {
      if (cancelled) return;
      transition?.hide();
      showError(timedOut ? 'Scan timed out. Please try again.' : exception.message || 'Analysis could not be completed.');
      busy(false);
      $('scanButton').focus();
    } finally {
      window.clearTimeout(timeout);
      if (currentController === controller) currentController = null;
    }
  });
}

function formatTime(iso) {
  const time = new Date(iso);
  return Number.isNaN(time.getTime()) ? '—' : time.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
}
function riskName(level) {
  return level === 'HIGH' ? 'High risk' : level === 'ELEVATED' ? 'Elevated' : 'Low';
}
/* Hologram is decorative: a deterministic non-scannable QR-like grid, never a QR
   encoding of a destination. No external requests or third-party rendering code. */
function initHologram() {
  const grid = $('holoQrCells');
  if (!grid) return;
  const size = 25;
  function finder(x, y, fx, fy) {
    const dx=x-fx, dy=y-fy;
    if (dx<0 || dy<0 || dx>6 || dy>6) return null;
    return dx===0 || dy===0 || dx===6 || dy===6 || (dx>=2 && dx<=4 && dy>=2 && dy<=4);
  }
  const fragment=document.createDocumentFragment();
  for (let y=0;y<size;y++) for(let x=0;x<size;x++){
    const cell=document.createElement('i');
    const corners=[[1,1],[17,1],[1,17]];
    let pixel=null;
    for (const [fx,fy] of corners) {
      const hit=finder(x,y,fx,fy);
      if(hit!==null){pixel=hit;break;}
    }
    if(pixel===null) pixel=((x*73+y*41+x*y*13)%17)<8;
    if(pixel) cell.className='qr-lit';
    fragment.appendChild(cell);
  }
  grid.appendChild(fragment);
  const stage=document.querySelector('.qr-cinematic-stage');
  if(stage && window.matchMedia('(pointer:fine) and (prefers-reduced-motion:no-preference)').matches){
    stage.addEventListener('pointermove', event=>{
      const rect=stage.getBoundingClientRect();
      const dx=(event.clientX-rect.left)/rect.width-.5;
      const dy=(event.clientY-rect.top)/rect.height-.5;
      stage.style.setProperty('--mouse-x', `${(dx*10).toFixed(2)}deg`);
      stage.style.setProperty('--mouse-y', `${(-dy*10).toFixed(2)}deg`);
    });
    stage.addEventListener('pointerleave', ()=>{
      stage.style.setProperty('--mouse-x','0deg');
      stage.style.setProperty('--mouse-y','0deg');
    });
  }
}
function renderFindings(item) {
  const target=$('findingCards');
  if(!target) return;
  target.replaceChildren();
  if(!item){const p=document.createElement('p');p.className='findings-empty';p.textContent='Run a scan to view actual findings.';target.append(p);return;}
  if(!item.indicators.length){const p=document.createElement('p');p.className='findings-empty';p.textContent='No active structural risk indicators were detected by the current rules. This does not prove the destination is safe.';target.append(p);return;}
  item.indicators.forEach((signal,index)=>{
    const card=document.createElement('details');card.className='finding-card';if(index===0)card.open=true;
    const title=document.createElement('summary');
    const name=document.createElement('span');name.textContent=safeText(signal.title,110);
    const points=document.createElement('strong');points.textContent=`+${safeScore(signal.points)} pts`;
    title.append(name,points);
    const description=document.createElement('p');description.textContent=safeText(signal.detail,250);
    card.append(title,description);target.append(card);
  });
}
function renderAssessment(item) {
  $('assessmentEmpty').hidden = !!item;
  $('assessmentContent').hidden = !item;
  renderFindings(item);
  if (!item) return;
  const score = safeScore(item.score);
  const gauge = $('miniGauge');
  gauge.style.setProperty('--score-angle', `${score * 3.6}deg`);
  gauge.style.setProperty('--score-color', COLORS[item.level]);
  $('assessmentScore').textContent = String(score);
  $('assessmentHost').textContent = safeText(item.hostname, 253);
  $('assessmentSummary').textContent = safeText(item.summary, 500);
  $('assessmentRecommendation').textContent = safeText(item.recommendation, 500) || 'Verify the destination independently before entering sensitive information.';
  $('assessmentSignals').textContent = String(item.indicators.length);
  $('assessmentTime').textContent = formatTime(item.at);
  const pill = $('assessmentLevel');
  pill.className = `severity-pill ${item.level.toLowerCase()}`;
  pill.textContent = riskName(item.level);
  $('downloadReport').onclick = () => {
    // Do not export the full URL, query, or any secret-bearing URL path.
    const clean = {type: item.type, hostname: item.hostname, risk_score: score,
      risk_level: item.level, indicators: item.indicators, recommendation: item.recommendation, analyzed_at: item.at,
      score_note: 'Uncalibrated heuristic points; no proof of safety or maliciousness.'};
    const blob = new Blob([JSON.stringify(clean, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'cyberguard-assessment.json';
    document.body.append(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
    announce('Assessment report downloaded.');
  };
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
    if (selected >= history.length) selected = history.length - 1;
    const record = selected >= 0 ? history[selected] : null;
    renderAssessment(record);
    if (!record) $('assessmentRecommendation').textContent = 'Run a scan to receive a recommendation based on its actual findings.';
    renderTable(history, index => {
      selected = index;
      renderAssessment(history[selected]);
      document.querySelector('.focus-assessment').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
      announce(`Now inspecting ${history[selected].hostname}`);
    });
  }
  $('clearHistory').addEventListener('click', () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_error) { /* blocked storage */ }
    selected = -1;
    render();
    announce('Previous scans cleared.');
  });
  render();
}
if (document.body.dataset.page === 'scanner') { initHologram(); initScanner(); }
if (document.body.dataset.page === 'dashboard') initDashboard();
