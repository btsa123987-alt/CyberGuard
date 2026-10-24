'use strict';

// All server-provided strings are rendered with textContent; never HTML interpolation.
const $ = (id) => document.getElementById(id);
const translations = {
  ar: {
    navScanner:'مركز الفحص',navInsights:'تفسير النتائج',navActivity:'سجل الجلسة',offline:'وضع التحليل المحلي',
    privacy:'لا يفتح النظام الروابط التي تحللينها، ولا يرسلها لأي خدمة خارجية.',breadcrumb:'لوحة التحكم',engine:'RULE ENGINE ACTIVE',
    heroTitle:'حلّل الرابط قبل الضغط عليه.',heroText:'اكشفي مؤشرات التصيّد في روابط الويب ورموز QR خلال ثوانٍ، مع شرح شفاف لكل إشارة خطورة.',
    scans:'فحوصات الجلسة',sessionOnly:'في هذه الصفحة فقط',high:'مخاطر مرتفعة',flagged:'من نتائج الجلسة',engineType:'محرك التحليل',signals:'مؤشرات',rules:'قواعد واضحة وقابلة للتفسير',external:'طلبات خارجية',noVisits:'دون زيارة الروابط المرسلة',
    scanHeading:'فحص جديد',staticAnalysis:'STATIC ANALYSIS',urlTab:'رابط URL',qrTab:'صورة QR',urlLabel:'الرابط المراد تحليله',urlHelp:'أدخلي عنوانًا يبدأ بـ https:// أو http://. لا يتم فتح الرابط.',uploadLabel:'ارفعي صورة رمز QR',dropTitle:'اختاري صورة أو اسحبيها هنا',dropHelp:'PNG، JPG، WebP — حتى 5 MB',qrHelp:'يجب أن تحتوي الصورة على رمز QR واحد قابل للقراءة.',scanButton:'ابدأ التحليل الأمني',tryExample:'أمثلة للتجربة:',caution:'هذه أداة تعليمية لتحليل المؤشرات، وليست حكمًا نهائيًا على سلامة الرابط أو نموذجًا مُدرَّبًا بدقة مثبتة.',
    resultsHeading:'نتيجة التحليل',awaiting:'بانتظار الإدخال',emptyTitle:'جاهز لاكتشاف مؤشرات الخطورة',emptyBody:'أدخلي رابطًا أو ارفعي صورة QR لعرض درجة الخطورة والإشارات الأمنية وتوصيات التعامل.',levelLabel:'مستوى الخطورة',targetHost:'النطاق المستهدف',indicatorsCount:'المؤشرات المكتشفة',detectedHeading:'مؤشرات التحليل',copy:'نسخ JSON',download:'تصدير تقرير',
    interpretation:'كيفية قراءة النتيجة',lowTitle:'منخفضة (0–19)',lowText:'لم تُكتشف مؤشرات كثيرة؛ هذا لا يضمن أن الرابط آمن.',mediumTitle:'متوسطة (20–49)',mediumText:'توجد إشارات تستدعي التحقق من الوجهة قبل التفاعل.',highTitle:'مرتفعة (50–100)',highText:'مؤشرات متعددة؛ تجنّبي الرابط وتحققي عبر قناة مستقلة.',recommendation:'لا تكتبي كلمة مرور أو بيانات مصرفية بعد مسح رمز غير متوقع. افتحي الموقع الرسمي بنفسك للتحقق.',activity:'نشاط الجلسة',memoryOnly:'في الذاكرة فقط',noActivity:'لم تُجرَ فحوصات بعد.',clear:'مسح سجل الجلسة',footer:'مؤشر خطورة توضيحي وليس احتمالًا إحصائيًا أو ضمانًا للسلامة.',
    HIGH:'مرتفع',ELEVATED:'متوسط',LOW:'منخفض',summary_HIGH:'توجد مؤشرات بنيوية متعددة. تجنّبي فتح الرابط قبل التحقق المستقل.',summary_ELEVATED:'بعض الإشارات تستدعي التحقق من الوجهة عبر قناة موثوقة.',summary_LOW:'لم تظهر مؤشرات كثيرة ضمن قواعد الأداة؛ هذا لا يثبت سلامة الرابط.',
    busy:'جارٍ الفحص...',done:'اكتمل الفحص',error:'حدث خطأ أثناء التحليل.',needFile:'اختاري صورة أولًا.',maxFile:'حجم الصورة يتجاوز 5 MB.',copied:'تم نسخ التقرير.',copyFailed:'تعذّر النسخ تلقائيًا. استخدمي تصدير التقرير.',saved:'تم إعداد التقرير.',
    indicators:{ip_host:['عنوان IP مباشر','استخدام عنوان رقمي يخفي اسم النطاق المألوف.'],shortener:['رابط مختصر','قد يخفي الرابط المختصر الوجهة النهائية.'],brand_impersonation:['اسم علامة في نطاق مختلف','اسم علامة معروفة يظهر خارج نطاقها الرسمي.'],lookalike_domain:['نطاق مشابه لعلامة','تهجئة النطاق تشبه نطاق علامة معروفة.'],punycode_hostname:['اسم نطاق مُرمّز','يحتوي اسم النطاق على ترميز دولي يتطلب الانتباه.'],deep_subdomains:['نطاقات فرعية كثيرة','سلسلة النطاقات الفرعية طويلة بشكل غير معتاد.'],sensitive_terms:['ألفاظ تخص الحسابات','توجد كلمات تدعو لتسجيل الدخول أو تحديث معلومات الحساب.'],http_only:['اتصال بدون HTTPS','الاتصال باستخدام HTTP لا يوفر تشفير النقل.'],nonstandard_port:['منفذ غير مألوف','تم تحديد منفذ غير شائع للويب.']},
  },
  en: {
    navScanner:'Scanner',navInsights:'How to interpret',navActivity:'Session activity',offline:'Local analysis mode',privacy:'CyberGuard does not visit submitted URLs or send them to external services.',breadcrumb:'Dashboard',engine:'RULE ENGINE ACTIVE',
    heroTitle:'Analyze links before you click.',heroText:'Spot phishing indicators in web addresses and QR codes, with a transparent explanation of every signal.',
    scans:'Session scans',sessionOnly:'In this page only',high:'High-risk findings',flagged:'From this session',engineType:'Analysis engine',signals:'signals',rules:'Explainable rules',external:'Outbound requests',noVisits:'Never visits submitted URLs',
    scanHeading:'New scan',staticAnalysis:'STATIC ANALYSIS',urlTab:'URL address',qrTab:'QR image',urlLabel:'URL to analyze',urlHelp:'Enter an http:// or https:// URL. The site will not be visited.',uploadLabel:'Upload QR image',dropTitle:'Select an image or drop it here',dropHelp:'PNG, JPG, WebP — up to 5 MB',qrHelp:'The image must contain one readable QR code.',scanButton:'Start security analysis',tryExample:'Try an example:',caution:'Educational indicator analysis only. This is not proof of safety or a model with validated accuracy.',
    resultsHeading:'Analysis results',awaiting:'AWAITING INPUT',emptyTitle:'Ready to inspect a link',emptyBody:'Enter a URL or upload a QR image to see risk indicators, explanations, and practical advice.',levelLabel:'Risk level',targetHost:'Target hostname',indicatorsCount:'Active indicators',detectedHeading:'Risk factor breakdown',copy:'Copy JSON',download:'Export report',
    interpretation:'How to read the score',lowTitle:'Low (0–19)',lowText:'Few signals were found; the URL may still be malicious.',mediumTitle:'Elevated (20–49)',mediumText:'Check the destination independently before interacting.',highTitle:'High (50–100)',highText:'Multiple signals were found; avoid the URL until verified.',recommendation:'Never type passwords or banking details after scanning unexpected QR codes. Visit the official site independently.',activity:'Session activity',memoryOnly:'Memory only',noActivity:'No scans yet.',clear:'Clear session activity',footer:'Illustrative risk indicator, not a probability or safety guarantee.',
    HIGH:'High risk',ELEVATED:'Elevated risk',LOW:'Low indicators',summary_HIGH:'Several structural indicators were found. Avoid this link pending independent verification.',summary_ELEVATED:'Some structural signals warrant verifying the destination independently.',summary_LOW:'Few selected indicators were observed. This does not mean that the URL is safe.',
    busy:'Scanning...',done:'Scan complete',error:'An error occurred while analyzing.',needFile:'Choose an image first.',maxFile:'File is larger than 5 MB.',copied:'Report copied.',copyFailed:'Copy failed. Use Export report instead.',saved:'Report prepared.',
    indicators:{ip_host:['IP-address host','Uses a numeric address instead of a recognizable hostname.'],shortener:['Shortened link','The short link can conceal its final destination.'],brand_impersonation:['Brand referenced elsewhere','A well-known brand appears outside its official hostname.'],lookalike_domain:['Lookalike domain','Hostname spelling resembles a brand domain.'],punycode_hostname:['Encoded hostname','Internationalized domain encoding deserves closer examination.'],deep_subdomains:['Deep subdomains','An unusually long chain of subdomains is present.'],sensitive_terms:['Account-action terms','Words suggest logging in or changing an account.'],http_only:['No HTTPS','HTTP does not encrypt transport.'],nonstandard_port:['Unusual TCP port','The URL specifies a nonstandard web port.']},
  },
};

let language = 'ar';
let mode = 'url';
let selectedFile = null;
let lastResult = null;
const activity = [];  // Ephemeral session state. Do not persist private URLs.
let scanCount = 0;
let highCount = 0;

const t = (key) => translations[language][key] || key;
function speak(message) { $('announcer').textContent = message; }
function tr() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key === 'heroTitle') {
      el.replaceChildren();
      const text = language === 'ar' ? ['حلّل الرابط قبل ', 'الضغط عليه.'] : ['Analyze links ', 'before you click.'];
      el.append(document.createTextNode(text[0]));
      const em = document.createElement('em'); em.textContent = text[1]; el.append(em);
    } else el.textContent = t(key);
  });
  $('language').textContent = language === 'ar' ? 'EN' : 'عربي';
  if (lastResult) renderResult(lastResult);
  renderActivity();
}
function setMode(next) {
  mode = next;
  $('urlPane').hidden = next !== 'url';
  $('qrPane').hidden = next !== 'qr';
  $('urlInput').required = next === 'url';
  $('urlTab').classList.toggle('selected', next === 'url');
  $('qrTab').classList.toggle('selected', next === 'qr');
  $('urlTab').setAttribute('aria-selected', String(next === 'url'));
  $('qrTab').setAttribute('aria-selected', String(next === 'qr'));
  hideError();
}
function hideError() { $('errorBanner').hidden = true; $('errorBanner').textContent = ''; }
function showError(msg) {
  lastResult = null;
  $('emptyResult').hidden = false;
  $('analysisResult').hidden = true;
  $('errorBanner').textContent = String(msg || t('error'));
  $('errorBanner').hidden = false;
  $('resultState').textContent = t('error');
  speak(String(msg || t('error')));
}
function setBusy(busy) {
  $('scanButton').disabled = busy;
  $('scanButton').querySelector('[data-i18n]').textContent = busy ? t('busy') : t('scanButton');
  if (busy) { $('resultState').textContent = t('busy'); speak(t('busy')); }
}
function indicatorElement(item) {
  const row = document.createElement('div');
  row.className = 'indicator' + (item.active ? ' active' : '');
  const mark = document.createElement('span'); mark.className = 'indicator-mark'; mark.textContent = item.active ? '!' : '✓';
  const wrap = document.createElement('div'); wrap.className = 'indicator-copy';
  const heading = document.createElement('strong');
  const detail = document.createElement('small');
  const translation = t('indicators')[item.key] || [item.title, item.detail];
  heading.textContent = translation[0]; detail.textContent = translation[1];
  wrap.append(heading, detail);
  const points = document.createElement('span'); points.className = 'indicator-points'; points.textContent = item.active ? `+${item.points}` : '—';
  row.append(mark, wrap, points);
  return row;
}
function renderResult(result) {
  hideError(); $('emptyResult').hidden = true; $('analysisResult').hidden = false;
  $('resultState').textContent = t('done');
  const level = ['HIGH','ELEVATED','LOW'].includes(result.risk_level) ? result.risk_level : 'LOW';
  const score = Math.max(0, Math.min(100, Number(result.risk_score) || 0));
  const color = {HIGH:'#ff6580',ELEVATED:'#f8bf5d',LOW:'#42d6a2'}[level];
  $('scoreRing').style.setProperty('--score-color', color);
  $('scoreRing').style.setProperty('--progress', `${score}%`);
  $('scoreRing').setAttribute('aria-label', `${score} / 100`);
  $('riskScore').textContent = String(score);
  $('riskLevel').textContent = t(level);
  $('riskLevel').style.color = color;
  $('resultSummary').textContent = t(`summary_${level}`);
  $('resultHost').textContent = result.hostname;
  $('detectedCount').textContent = String(result.feature_count);
  $('indicators').replaceChildren(...result.indicators.map(indicatorElement));
  speak(t('done'));
}
function renderActivity() {
  const root = $('activityList'); root.replaceChildren();
  if (!activity.length) { const empty = document.createElement('p'); empty.className='muted'; empty.textContent=t('noActivity'); root.append(empty); return; }
  activity.forEach((a) => {
    const row=document.createElement('div'); row.className='activity-item';
    const circle=document.createElement('div'); circle.className='activity-circle '+a.level;
    const host=document.createElement('span'); host.className='activity-host'; host.textContent=a.host;
    const label=document.createElement('small'); label.textContent=`${a.score}/100 · ${a.time}`;
    row.append(circle,host,label); root.append(row);
  });
}
async function analyze(event) {
  event.preventDefault();
  hideError();
  let url = '/api/analyze/url';
  let options;
  if (mode === 'qr') {
    if (!selectedFile) { showError(t('needFile')); return; }
    if (selectedFile.size > 5 * 1024 * 1024) { showError(t('maxFile')); return; }
    url = '/api/analyze/qr';
    const data = new FormData(); data.append('image', selectedFile);
    options = {method:'POST',body:data};
  } else {
    options = {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:$('urlInput').value.trim()})};
  }
  setBusy(true);
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok || !data.success || !data.result) { showError(data.message || t('error')); return; }
    lastResult = data.result;
    scanCount += 1; if (lastResult.risk_level === 'HIGH') highCount += 1;
    $('totalScans').textContent=String(scanCount).padStart(2,'0');
    $('highCount').textContent=String(highCount).padStart(2,'0');
    activity.unshift({host:lastResult.hostname,score:lastResult.risk_score,level:lastResult.risk_level,time:new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-GB',{hour:'2-digit',minute:'2-digit'})});
    if (activity.length > 12) activity.pop();
    renderResult(lastResult); renderActivity();
  } catch (_) { showError(t('error')); }
  finally { setBusy(false); }
}
function fileSelected(file) {
  selectedFile = file || null;
  $('fileName').textContent = selectedFile ? selectedFile.name : '';
  if (selectedFile && selectedFile.size > 5 * 1024 * 1024) showError(t('maxFile'));
}
$('urlTab').addEventListener('click',()=>setMode('url'));
$('qrTab').addEventListener('click',()=>setMode('qr'));
$('language').addEventListener('click',()=>{language=language==='ar'?'en':'ar';tr();});
$('scanForm').addEventListener('submit',analyze);
$('fileInput').addEventListener('change',(e)=>fileSelected(e.target.files[0]));
$('dropZone').addEventListener('dragover',(e)=>{e.preventDefault();e.currentTarget.classList.add('dragover');});
$('dropZone').addEventListener('dragleave',(e)=>e.currentTarget.classList.remove('dragover'));
$('dropZone').addEventListener('drop',(e)=>{e.preventDefault();e.currentTarget.classList.remove('dragover');fileSelected(e.dataTransfer.files[0]);});
document.querySelectorAll('.example').forEach((b)=>b.addEventListener('click',()=>{setMode('url');$('urlInput').value=b.dataset.url;$('urlInput').focus();}));
$('clearActivity').addEventListener('click',()=>{activity.length=0;renderActivity();});
$('copyReport').addEventListener('click',async()=>{if(!lastResult)return;try{await navigator.clipboard.writeText(JSON.stringify(lastResult,null,2));speak(t('copied'));}catch(_){speak(t('copyFailed'));}});
$('downloadReport').addEventListener('click',()=>{
  if (!lastResult) return;
  const blob = new Blob([JSON.stringify({project:'CyberGuard',generated_at:new Date().toISOString(),analysis:lastResult},null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='cyberguard-report.json';
  document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url); speak(t('saved'));
});
tr();
