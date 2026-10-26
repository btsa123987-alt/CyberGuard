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
    explainability: sanitizedShap(result.explainability, safeScore(result.risk_score)),
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
/* Intelligence Studio: original scan API flow is preserved above this block. */
function studioSvg(parent, type, attributes={}, value=null) {
  const element=document.createElementNS(SVG_NS,type);
  Object.entries(attributes).forEach(([name,v])=>element.setAttribute(name,String(v)));
  if(value!==null)element.textContent=String(value);
  parent.appendChild(element);return element;
}
function textNode(tag,content,className='') {
  const el=document.createElement(tag);
  el.textContent=String(content);
  if(className)el.className=className;
  return el;
}
function sanitizedShap(value,score) {
  if(!value || value.method!=='exact_shapley_values' || !Array.isArray(value.features))return null;
  if(value.features.length>9 || !Number.isFinite(value.baseline) || value.baseline!==0 || value.score!==score)return null;
  const features=value.features.filter(feature=>feature && typeof feature.key==='string' && typeof feature.label==='string' && Number.isFinite(feature.shap_value) && Math.abs(feature.shap_value)<=100);
  if(features.length!==value.features.length || Math.abs(features.reduce((a,b)=>a+b.shap_value,0)-score)>0.004)return null;
  return {method:'exact_shapley_values',baseline:0,score,features:features.map(f=>({key:safeText(f.key,50),label:safeText(f.label,110),shap_value:Number(f.shap_value)}))};
}
function renderFindings(item) {
  const target=$('findingCards');target.replaceChildren();
  if(!item || !item.indicators.length) {
    target.append(textNode('p',!item?'Run a scan to view verified findings.':'No rules triggered. This does not guarantee the URL is safe.','findings-empty'));
    return;
  }
  item.indicators.forEach((signal,index)=>{
    const card=document.createElement('details');card.className='finding-card';if(index===0)card.open=true;
    const title=document.createElement('summary');const label=textNode('span',safeText(signal.title,110));
    const points=textNode('strong',`+${safeScore(signal.points)} rule pts`);
    title.append(label,points);card.append(title,textNode('p',safeText(signal.detail,250)));target.append(card);
  });
}
function renderAssessment(item) {
  $('assessmentEmpty').hidden=!!item;$('assessmentContent').hidden=!item;
  renderFindings(item);
  $('assessmentRecommendation').textContent=item?safeText(item.recommendation,500):'Run a scan to see guidance from the local engine.';
  if(!item)return;
  const score=safeScore(item.score);
  $('miniGauge').style.setProperty('--score-angle',`${score*3.6}deg`);
  $('miniGauge').style.setProperty('--score-color',COLORS[item.level]);
  $('assessmentScore').textContent=String(score);
  $('assessmentHost').textContent=safeText(item.hostname,253);
  $('assessmentSummary').textContent=safeText(item.summary,500);
  $('assessmentSignals').textContent=String(item.indicators.length);
  $('assessmentTime').textContent=formatTime(item.at);
  $('assessmentLevel').className=`severity-pill ${item.level.toLowerCase()}`;
  $('assessmentLevel').textContent=riskName(item.level);
  $('downloadReport').onclick=()=>{
    const exportData={schema_version:'cyberguard-evidence-v1',input_type:item.type,hostname:item.hostname,risk_score:score,
      risk_level:item.level,indicators:item.indicators,explainability:item.explainability,
      recommendation:item.recommendation,analyzed_at:item.at,
      limitations:'Static heuristic indicators only. Shapley values are exact for this rule scorer, not ML prediction confidence.'};
    const blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'});
    const downloadUrl=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=downloadUrl;link.download='cyberguard-evidence.json';
    document.body.append(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(downloadUrl),500);
    announce('Evidence report downloaded.');
  };
}
function renderAttributions(record) {
  const area=$('contributionBars');area.replaceChildren();
  const svg=$('shapWaterfall');svg.replaceChildren();
  $('shapValueTable').replaceChildren();
  const x=record && record.explainability;
  if(!x){
    area.append(textNode('p','Scan a URL or QR to visualize real feature contributions.','studio-placeholder'));
    svg.setAttribute('hidden','');$('shapEmpty').hidden=false;$('shapEmpty').textContent=record?'Exact Shapley values are not available for this older scan. Re-run it with the updated engine.':'Scan a link to generate the waterfall.';
    return;
  }
  if(!x.features.length){
    area.append(textNode('p','No active indicators · current rule score is zero.','studio-placeholder'));
    svg.setAttribute('hidden','');$('shapEmpty').hidden=false;$('shapEmpty').textContent='Baseline: 0. No risk flags were activated.';
    return;
  }
  const max=Math.max(1,...x.features.map(f=>f.shap_value));
  for(const feature of x.features){
    const row=document.createElement('div');row.className='contribution-row';
    const head=document.createElement('div');head.className='contribution-head';
    head.append(textNode('span',feature.label),textNode('strong',`+${feature.shap_value.toFixed(2)} pts`));
    const track=document.createElement('div');track.className='contribution-track';
    const fill=document.createElement('span');fill.className='contribution-fill';fill.style.width=`${100*feature.shap_value/max}%`;track.append(fill);
    row.append(head,track);area.append(row);
  }
  $('shapEmpty').hidden=true;svg.removeAttribute('hidden');
  const width=760,left=222,right=56,maxWidth=width-left-right,scale=maxWidth/100;
  const top=45,rowHeight=43,totalHeight=Math.max(285,top+x.features.length*rowHeight+76);
  svg.setAttribute('viewBox',`0 0 ${width} ${totalHeight}`);
  [0,25,50,75,100].forEach(tick=>{
    const xpos=left+tick*scale;
    studioSvg(svg,'line',{x1:xpos,x2:xpos,y1:25,y2:totalHeight-43,class:'shap-grid'});
    studioSvg(svg,'text',{x:xpos,y:17,'text-anchor':'middle',class:'shap-tick'},String(tick));
  });
  let cumulative=0;
  for(const [index,feature] of x.features.entries()){
    const y=top+index*rowHeight,from=cumulative;
    cumulative+=feature.shap_value;
    studioSvg(svg,'text',{x:12,y:y+21,class:'shap-axis-label'},feature.label.length>30?feature.label.slice(0,27)+'…':feature.label);
    studioSvg(svg,'rect',{x:left+from*scale,y:y+3,width:Math.max(feature.shap_value*scale,0.5),height:25,rx:5,class:'shap-waterfall-bar'});
    if(index<x.features.length-1)studioSvg(svg,'line',{x1:left+cumulative*scale,x2:left+cumulative*scale,y1:y+28,y2:y+rowHeight+3,class:'shap-connector'});
    studioSvg(svg,'text',{x:Math.min(left+cumulative*scale+7,width-28),y:y+21,class:'shap-value-label'},`+${feature.shap_value.toFixed(1)}`);
    const tr=document.createElement('div');tr.className='shap-data-row';
    tr.append(textNode('span',feature.label),textNode('strong',`+${feature.shap_value.toFixed(3)} points`));$('shapValueTable').append(tr);
  }
  const lastY=top+x.features.length*rowHeight+24;
  studioSvg(svg,'line',{x1:left,x2:left+x.score*scale,y1:lastY-14,y2:lastY-14,class:'shap-total-line'});
  studioSvg(svg,'text',{x:12,y:lastY+7,class:'shap-axis-label'},'Final risk score');
  studioSvg(svg,'text',{x:left+x.score*scale+8,y:lastY+7,class:'shap-final-label'},`${x.score}/100`);
  const total=document.createElement('div');total.className='shap-data-total';total.append(textNode('span','Baseline 0 + Shapley values'),textNode('strong',`${x.score.toFixed(0)} / 100`));
  $('shapValueTable').append(total);
}
function renderHistory(history, onSelect){
  $('totalScans').textContent=String(history.length);
  $('highCount').textContent=String(history.filter(r=>r.level==='HIGH').length);
  $('averageRisk').textContent=history.length?(history.reduce((a,r)=>a+safeScore(r.score),0)/history.length).toFixed(1):'—';
  const graph=$('trendChart');graph.replaceChildren();
  const subset=history.slice(-12);
  $('trendEmpty').hidden=!!subset.length;
  if(subset.length){
    const x0=55,y0=18,bottom=215,width=790,height=197;
    for(const tick of [0,25,50,75,100]){
      const y=bottom-tick/100*height;
      studioSvg(graph,'line',{x1:x0,x2:width+42,y1:y,y2:y,class:'shap-grid'});
      studioSvg(graph,'text',{x:44,y:y+4,'text-anchor':'end',class:'shap-tick'},tick);
    }
    const step=width/subset.length;
    subset.forEach((item,i)=>{
      const score=safeScore(item.score),h=score*height/100;
      studioSvg(graph,'rect',{x:x0+i*step+8,y:bottom-h,width:Math.max(step-16,8),height:Math.max(h,2),rx:5,fill:COLORS[item.level]});
      studioSvg(graph,'text',{x:x0+i*step+step/2,y:bottom-h-7,'text-anchor':'middle',class:'shap-value-label'},score);
      studioSvg(graph,'text',{x:x0+i*step+step/2,y:242,'text-anchor':'middle',class:'shap-tick'},i+1);
    });
  }
  const tbody=$('activityBody');tbody.replaceChildren();
  if(!history.length){
    const tr=document.createElement('tr'),td=textNode('td','No scans yet — start with the scanner.','table-empty');td.colSpan=7;tr.append(td);tbody.append(tr);return;
  }
  [...history].reverse().forEach((record,i)=>{
    const tr=document.createElement('tr');const domain=textNode('td',record.hostname,'domain');
    const type=textNode('td',record.type),flags=textNode('td',record.indicators.length);
    const risk=document.createElement('td'),pill=textNode('span',riskName(record.level),`table-pill ${record.level.toLowerCase()}`);risk.append(pill);
    const points=textNode('td',safeScore(record.score),'score-cell'),time=textNode('td',formatTime(record.at));
    const act=document.createElement('td'),button=textNode('button','Inspect','table-button');button.type='button';
    button.setAttribute('aria-label',`Inspect scan of ${record.hostname}`);
    button.addEventListener('click',()=>onSelect(history.length-1-i));act.append(button);
    tr.append(domain,type,flags,risk,points,time,act);tbody.append(tr);
  });
}
function initDashboard(){
  let history=readHistory(),selected=history.length-1,activeTab='overview',knowledgeCache=new Map(),referenceIndex=new Map();
  let configured=false,configurationKnown=false,aiPending=false,latestKnowledgeToken='',knowledgeInFlight=null;
  const tabs=[...document.querySelectorAll('.studio-tab')];
  const panelNames=['overview','explain','knowledge','llm','history'];
  const getSelected=()=>selected>=0?history[selected]:null;
  const feedback=(message)=>{$('aiFeedback').textContent=message;};
  const currentToken=()=>getSelected()?.ai_context_token||'';
  function selectTab(id,focus=false){
    if(!panelNames.includes(id))return;
    activeTab=id;
    for(const tab of tabs){
      const active=tab.dataset.tab===id;
      tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      if(active&&focus)tab.focus();
    }
    for(const name of panelNames)$(`panel-${name}`).hidden=name!==id;
    if(id==='knowledge')fetchKnowledge();
    if(id==='llm')ensureClaudeStatus();
    announce(`${id==='llm'?'AI analysis':id} tab opened`);
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectTab(tab.dataset.tab));
    tab.addEventListener('keydown',event=>{
      const key=event.key;
      if(!['ArrowRight','ArrowLeft','Home','End'].includes(key))return;
      event.preventDefault();
      let n=index;
      if(key==='ArrowRight')n=(index+1)%tabs.length;
      if(key==='ArrowLeft')n=(index-1+tabs.length)%tabs.length;
      if(key==='Home')n=0;
      if(key==='End')n=tabs.length-1;
      selectTab(tabs[n].dataset.tab,true);
    });
  });
  $('openExplainability').addEventListener('click',()=>selectTab('explain',true));
  $('openKnowledge').addEventListener('click',()=>selectTab('knowledge',true));
  function updateButton(){
    $('aiExplainButton').disabled=aiPending||!configured||!currentToken()||!$('aiConsent').checked;
  }
  function clearAnswer(){
    $('aiAnswer').hidden=true;$('aiSummary').textContent='';$('aiActions').replaceChildren();$('aiLimitations').textContent='';$('aiCitations').replaceChildren();
  }
  function clearRefs(){referenceIndex=new Map();$('ragReferences').replaceChildren();$('ragCoverage').textContent='NO SCAN SELECTED';}
  function renderReferences(result){
    clearRefs();
    if(!result){$('ragReferences').append(textNode('p','Select a completed scan to retrieve guidance.','studio-placeholder'));return;}
    const coverage=result.evidence_coverage;
    $('ragCoverage').textContent=`${coverage.matched_flags} / ${coverage.active_flags} ACTIVE FLAGS COVERED`;
    (result.documents||[]).forEach((doc,index)=>{
      referenceIndex.set(doc.id,doc);
      const article=document.createElement('article');article.className='rag-reference-card';
      article.append(textNode('div',`SOURCE ${String(index+1).padStart(2,'0')} · ${safeText(doc.source,95)}`,'rag-source'),textNode('h4',safeText(doc.title,160)),textNode('p',safeText(doc.text,380)));
      const matches=textNode('div',(doc.matched_indicators||[]).length?`MATCHED RULES: ${doc.matched_indicators.join(', ')}`:'GENERAL ADVICE','rag-match');
      const score=textNode('div',`Reference ranking: ${Number(doc.ranking_score||0).toFixed(2)} · BM25 ${Number(doc.lexical_bm25||0).toFixed(2)}`,'rag-rank');
      const link=textNode('a','Open original guidance ↗','studio-reference-link');
      // URLs originate from a fixed, audited backend allowlist of official sources.
      if(/^https:\/\/(consumer\.ftc\.gov|www\.cisa\.gov|cheatsheetseries\.owasp\.org)\//.test(doc.url||'')){
        link.href=doc.url;link.target='_blank';link.rel='noopener noreferrer';
      }else{link.removeAttribute('href');link.textContent='Reference URL not trusted';}
      article.append(matches,score,link);$('ragReferences').append(article);
    });
  }
  async function fetchKnowledge(){
    const token=currentToken();
    if(!token){renderReferences(null);return;}
    if(knowledgeCache.has(token)){renderReferences(knowledgeCache.get(token));return;}
    if(knowledgeInFlight===token)return;
    knowledgeInFlight=token;latestKnowledgeToken=token;
    $('ragReferences').replaceChildren(textNode('p','Retrieving signed scan references locally…','studio-placeholder'));
    try{
      const response=await fetch('/api/ai/knowledge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(safeText(result.message,150)||'Reference lookup failed');
      knowledgeCache.set(token,result.result);
      if(currentToken()===token)renderReferences(result.result);
    }catch(error){
      if(currentToken()===token){clearRefs();$('ragReferences').append(textNode('p',error.message||'Retrieval failed. Re-run the scan.','studio-error'));}
    }finally{if(knowledgeInFlight===token)knowledgeInFlight=null;}
  }
  async function ensureClaudeStatus(){
    updateButton();
    if(configurationKnown)return;
    try{
      const response=await fetch('/api/ai/status');
      if(!response.ok)throw new Error('Configuration unavailable');
      const data=await response.json();
      configured=!!data.claude_configured;
      $('aiServiceStatus').textContent=configured?`Claude ready · ${safeText(data.model,80)} · explicit consent required`:'Claude API key not configured · offline SHAP + RAG available';
      configurationKnown=true;
      feedback(configured?'Check the consent box to enable the optional Claude request.':'To enable Claude, set ANTHROPIC_API_KEY on your computer. No API key is needed for the rest of the platform.');
    }catch(_error){
      $('aiServiceStatus').textContent='Claude status unavailable · offline scans still work';
      feedback('Could not check the optional provider. Local analysis is unaffected.');
    }
    updateButton();
  }
  $('aiConsent').addEventListener('change',updateButton);
  $('aiExplainButton').addEventListener('click',async()=>{
    const token=currentToken();
    if(!configured||!$('aiConsent').checked||!token||aiPending)return;
    aiPending=true;updateButton();clearAnswer();feedback('Requesting a grounded Claude explanation. The original score will not change.');
    try{
      const response=await fetch('/api/ai/assess',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,consent:true})});
      const data=await response.json();
      if(!response.ok||!data.success||!data.result)throw new Error(safeText(data.message,210)||'Claude request failed');
      if(currentToken()!==token)return;
      const answer=data.result;
      $('aiSummary').textContent=safeText(answer.summary,450);
      const list=$('aiActions');list.replaceChildren();
      (answer.recommendations||[]).slice(0,3).forEach(value=>list.append(textNode('li',safeText(value,280))));
      $('aiLimitations').textContent=safeText(answer.limitations,340);
      $('aiCitations').replaceChildren();
      const knowledge=knowledgeCache.get(token);
      if(knowledge){
        const byId=new Map(knowledge.documents.map(r=>[r.id,r]));
        (answer.citation_ids||[]).forEach(id=>{
          const doc=byId.get(id);if(!doc)return;
          const row=textNode('a',safeText(doc.title,145)+' ↗','studio-reference-link');
          if(/^https:\/\/(consumer\.ftc\.gov|www\.cisa\.gov|cheatsheetseries\.owasp\.org)\//.test(doc.url)){
            row.href=doc.url;row.rel='noopener noreferrer';row.target='_blank';$('aiCitations').append(row);
          }
        });
      }
      $('aiAnswer').hidden=false;
      feedback(`Claude explanation ready (${safeText(answer.model,80)}). Model confidence has not been calibrated.`);
    }catch(error){if(currentToken()===token)feedback(error.message||'Claude unavailable; scan results are still available.');}
    finally{aiPending=false;updateButton();}
  });
  function selectRecord(index){
    selected=index;
    $('aiConsent').checked=false;clearAnswer();clearRefs();
    render();selectTab('overview');
    document.querySelector('.studio-intro').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    announce(`Inspecting ${history[selected].hostname}`);
  }
  function render(){
    history=readHistory();if(selected>=history.length)selected=history.length-1;
    const record=getSelected();
    renderAssessment(record);renderAttributions(record);renderHistory(history,selectRecord);
    $('dataSourceTag').textContent=record?`${record.type} · ${safeText(record.hostname,48)}`:'NO SCAN SELECTED';
    updateButton();
    if(activeTab==='knowledge')fetchKnowledge();
  }
  $('clearHistory').addEventListener('click',()=>{
    try{sessionStorage.removeItem(SESSION_KEY);}catch(_error){}
    selected=-1;knowledgeCache.clear();latestKnowledgeToken='';
    $('aiConsent').checked=false;clearAnswer();clearRefs();render();announce('Session history cleared.');
  });
  render();
}
if(document.body.dataset.page==='scanner'){initHologram();initScanner();}
if(document.body.dataset.page==='dashboard')initDashboard();
