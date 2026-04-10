
let currentTab='protocols',searchQuery='';

// ── RENDER FUNCTIONS ─────────────────────────────────────────
function getScopeClass(s){
  if(!s)return'scope-all';const l=s.toLowerCase();
  if(l==='all')return'scope-all';
  if(l.includes('emt')&&l.includes('aemt')&&l.includes('pm'))return'scope-all';
  if(l.startsWith('pm')&&!l.includes('aemt')&&!l.includes('emt'))return'scope-pm';
  if(l.includes('aemt')&&!l.startsWith('pm')&&!l.includes('emt,'))return'scope-aemt';
  return'scope-multi';
}

function renderProtocols(q){
  const c=document.getElementById('content');let html='',shown=0;
  SECTIONS.protocols.forEach(sec=>{
    const f=q?sec.items.filter(i=>i.title.toLowerCase().includes(q)||(i.body&&i.body.toLowerCase().includes(q))):sec.items;
    if(!f.length)return;shown+=f.length;
    html+='<div class="section-header"><span class="section-icon">'+sec.icon+'</span><span class="section-label">'+sec.section+'</span></div>';
    f.forEach((item,i)=>{html+='<div class="protocol-card card-appear" style="animation-delay:'+(i*.03)+'s" data-type="protocol" data-id="'+item.id+'"><div class="card-row"><div class="card-title">'+item.title+'</div><span class="scope-pill '+getScopeClass(item.scope)+'">'+item.scope+'</span><span class="chevron">›</span></div></div>';});
  });
  if(!shown)html='<div class="empty-state"><div class="es-icon">🌾</div><div class="es-text">No protocols match "'+(q)+'"</div></div>';
  c.innerHTML=html;
}

function renderFormulary(q){
  const c=document.getElementById('content');
  const f=q?FORMULARY.filter(d=>d.name.toLowerCase().includes(q)||d.cls.toLowerCase().includes(q)||(d.dose&&d.dose.toLowerCase().includes(q))):FORMULARY;
  if(!f.length){c.innerHTML='<div class="empty-state"><div class="es-icon">💊</div><div class="es-text">No drugs match "'+(q)+'"</div></div>';return;}
  c.innerHTML='<div style="padding:10px 14px">'+f.map((d,i)=>'<div class="drug-card card-appear" style="animation-delay:'+(i*.02)+'s"><div class="drug-header"><div><div class="drug-name">'+(d.name)+(d.isNew?'<span class="drug-new-badge" style="margin-left:8px">NEW</span>':'')+'</div><div class="drug-class">'+(d.cls)+'</div></div></div><div class="drug-body"><div class="drug-row"><span class="drug-row-label">Scope</span><span class="drug-row-val">'+(d.scope)+'</span></div><div class="drug-row"><span class="drug-row-label">Dosing</span><span class="drug-row-val">'+(d.dose)+'</span></div>${d.ci?'<div class="drug-row"><span class="drug-row-label">Contraind.</span><span class="drug-row-val">${d.ci}</span></div>':\'\'}${d.warn?'<div class="drug-warn">⚠ ${d.warn}</div>':\'\'}</div></div>').join('')+'</div>';
}

function renderScope(){
  const c=document.getElementById('content');
  const cats=[{label:'Airway & Ventilation',key:'airway'},{label:'Circulation',key:'circulation'},{label:'Vascular Access',key:'vascular'},{label:'Medication Administration',key:'meds'},{label:'Trauma & Hemorrhage',key:'trauma'},{label:'Other',key:'other'}];
  let html='<div class="legend-bar"><span class="legend-item"><span class="legend-dot" style="background:var(--scope-emt)"></span>EMT</span><span class="legend-item"><span class="legend-dot" style="background:var(--scope-aemt)"></span>AEMT</span><span class="legend-item"><span class="legend-dot" style="background:var(--scope-pm)"></span>PM</span></div>';
  cats.forEach(cat=>{
    html+='<div class="section-header"><span class="section-label">'+(cat.label)+'</span></div>';
    SCOPE_DATA[cat.key].forEach(row=>{html+='<div style="display:flex;align-items:center;padding:9px 14px;border-bottom:1px solid var(--bark);gap:8px"><div style="flex:1;font-size:16px;color:var(--parchment)">'+(row.skill)+'</div><div style="display:flex;gap:4px"><span style="width:36px;text-align:center;font-family:\'Courier Prime\',monospace;font-size:12px;font-weight:700;padding:3px 0;border-radius:2px;background:'+(row.emt?'var(--scope-emt)':'var(--bark)')+';color:'+(row.emt?'#d4edda':'var(--clay)')+'">EMT</span><span style="width:44px;text-align:center;font-family:\'Courier Prime\',monospace;font-size:12px;font-weight:700;padding:3px 0;border-radius:2px;background:'+(row.aemt?'var(--scope-aemt)':'var(--bark)')+';color:'+(row.aemt?'#cce5ff':'var(--clay)')+'">AEMT</span><span style="width:28px;text-align:center;font-family:\'Courier Prime\',monospace;font-size:12px;font-weight:700;padding:3px 0;border-radius:2px;background:'+(row.pm?'var(--scope-pm)':'var(--bark)')+';color:'+(row.pm?'#f8d7da':'var(--clay)')+'">PM</span></div></div>';});
  });
  c.innerHTML=html;
}

function renderOps(){
  const c=document.getElementById('content');
  c.innerHTML=OPS_DATA.map((item,i)=>'<div class="protocol-card card-appear" style="animation-delay:'+(i*.04)+'s" data-type="ops" data-id="'+(i)+'"><div class="card-row"><div class="card-title">'+(item.title)+'</div><span class="chevron">›</span></div></div>').join('');
}

function renderMAI(){
  const c=document.getElementById('content');
  c.innerHTML='<div style="padding:14px 14px 40px">\n  <div class="mai-warn-banner"><span style="font-size:18px;flex-shrink:0">⚠</span><span><b>PM scope only.</b> NMBA causes complete respiratory paralysis. Sedation and analgesia MUST be given before the paralytic. The patient is fully awake and aware without them.</span></div>\n  <div class="mai-calc"><div class="mai-calc-title">Weight-Based Dose Calculator</div>\n  <div class="weight-input-row"><input type="number" id="maiWeight" inputmode="decimal" placeholder="—" min="1" max="300" step="0.1"><button class="weight-unit-btn active" id="btnKg">kg</button><button class="weight-unit-btn" id="btnLbs">lbs</button></div>\n  <div class="calc-results" id="calcResults"><div class="calc-placeholder">Enter patient weight above</div></div></div>\n  <div style="margin-bottom:8px;font-family:\'Courier Prime\',monospace;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--wheat);border-bottom:1px solid var(--clay);padding-bottom:6px">Step-by-Step Procedure</div>\n  <div class="mai-phase-header" style="margin:10px -14px 0">PHASE 1 — PREPARATION</div>\n  <div class="mai-step"><div class="mai-step-num">1</div><div class="mai-step-content"><div class="mai-step-title">Confirm indication</div><div class="mai-step-desc">GCS ≤ 8 with failure to protect airway, respiratory failure refractory to BVM/CPAP, anticipated airway deterioration.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">2</div><div class="mai-step-content"><div class="mai-step-title">Pre-oxygenate</div><div class="mai-step-desc">NRB at 15 LPM for minimum 3 minutes. Apneic oxygenation via NC at 15 LPM throughout procedure.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">3</div><div class="mai-step-content"><div class="mai-step-title">Assemble and check equipment</div><div class="mai-step-desc">Laryngoscope (blade tested), ETT (7.5–8.0 adult male, 7.0–7.5 adult female), 10 mL syringe, stylet, ETCO2, securing device, suction ready and ON, BVM at hand.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">4</div><div class="mai-step-content"><div class="mai-step-title">Confirm IV/IO access and position patient</div><div class="mai-step-desc">Patent and aspirating. Flush before medications. Ear-to-sternal-notch alignment. Ramp if obese.</div></div></div>\n  <div class="mai-phase-header" style="margin:10px -14px 0">PHASE 2 — INDUCTION</div>\n  <div class="mai-step"><div class="mai-step-num">5</div><div class="mai-step-content"><div class="mai-step-title">Administer Ketamine (Induction)</div><div class="mai-step-desc">1–1.5 mg/kg IV over 1 minute. Wait 60 seconds for onset. Signs of induction: eyes deviate, nystagmus, muscle relaxation.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">6</div><div class="mai-step-content"><div class="mai-step-title">Administer paralytic</div><div class="mai-step-desc">Vecuronium 0.1 mg/kg IV slow push over 30–60 seconds. OR Rocuronium 1 mg/kg IV (extended formulary — faster onset ~45–60 sec). Onset: 60–90 seconds. Confirm paralysis: jaw relaxation, absence of spontaneous movement.</div></div></div>\n  <div class="mai-phase-header" style="margin:10px -14px 0">PHASE 3 — INTUBATION</div>\n  <div class="mai-step"><div class="mai-step-num">7</div><div class="mai-step-content"><div class="mai-step-title">Laryngoscopy</div><div class="mai-step-desc">Blade in right side of mouth, sweep tongue left. Advance to vallecula (Mac) or under epiglottis (Miller). Lift — do not lever. Visualize vocal cords before advancing tube.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">8</div><div class="mai-step-content"><div class="mai-step-title">Pass ETT and confirm placement</div><div class="mai-step-desc">Advance until cuff passes 2–3 cm past cords. Adult depth: 21–23 cm at teeth. Inflate cuff 5–10 mL. Waveform ETCO2 gold standard — must see ≥ 6 consecutive waveforms. If no waveform: tube is in esophagus — remove immediately, BVM, reoxygenate, retry.</div></div></div>\n  <div class="mai-phase-header" style="margin:10px -14px 0">PHASE 4 — POST-INTUBATION</div>\n  <div class="mai-step"><div class="mai-step-num">9</div><div class="mai-step-content"><div class="mai-step-title">Ventilate to targets</div><div class="mai-step-desc">Rate: 10–12/min adult. TV: 6–8 mL/kg. SpO2 target: 94–98%. ETCO2 target: 35–45 mmHg. Do not hyperventilate.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">10</div><div class="mai-step-content"><div class="mai-step-title">Maintain sedation</div><div class="mai-step-desc">Midazolam 2.5–5 mg IV every 10–30 min as needed. Patient is paralyzed and fully aware without ongoing sedation.</div></div></div>\n  <div class="mai-phase-header" style="margin:10px -14px 12px">FAILED AIRWAY RESCUE</div>\n  <div class="callout callout-warn"><span class="callout-icon">⚠</span><span><b>If unable to intubate after 2 attempts:</b> BVM ventilate, place King LT supraglottic airway, contact DMO. If unable to oxygenate via BVM or SGA: surgical cricothyrotomy.</span></div>\n  <div class="callout callout-key"><span class="callout-icon">★</span><span>The paralyzed patient cannot protect their own airway. You own it. There is no backing out after the paralytic.</span></div>\n  </div>';
  document.getElementById('maiWeight').addEventListener('input',calcMAIDoses);
  document.getElementById('btnKg').addEventListener('click',function(){setUnit('kg');});
  document.getElementById('btnLbs').addEventListener('click',function(){setUnit('lbs');});
}

let maiUnit='kg';
function setUnit(u){maiUnit=u;document.getElementById('btnKg').classList.toggle('active',u==='kg');document.getElementById('btnLbs').classList.toggle('active',u==='lbs');calcMAIDoses();}
function calcMAIDoses(){
  const raw=parseFloat(document.getElementById('maiWeight').value);
  const el=document.getElementById('calcResults');
  if(!raw||isNaN(raw)||raw<=0){el.innerHTML='<div class="calc-placeholder">Enter patient weight above</div>';return;}
  const kg=maiUnit==='lbs'?raw*.4536:raw;
  const drugs=[
    {name:'Ketamine (Induction)',detail:'1–1.5 mg/kg IV over 1 min',lo:kg*1,hi:kg*1.5,unit:'mg',note:'Administer over 60 sec. Wait 60 sec for effect.'},
    {name:'Vecuronium (Paralytic)',detail:'0.1 mg/kg IV over 30–60 sec',lo:kg*.1,hi:null,unit:'mg',note:'Onset 60–90 sec. Duration 30–60 min.'},
    {name:'Rocuronium (Paralytic — alt)',detail:'1 mg/kg IV',lo:kg*1,hi:null,unit:'mg',note:'Onset ~45–60 sec. Extended formulary.'},
    {name:'Midazolam (Post-intubation sedation)',detail:'2.5–5 mg IV every 10–30 min',lo:2.5,hi:5,unit:'mg',note:'Fixed dose — not weight-based.'},
    {name:'Lidocaine (IO site analgesia)',detail:'40 mg IO slow push → 10 mL NS → 20 mg IO',lo:40,hi:null,unit:'mg',note:'Fixed adult dose. Peds: 0.5 mg/kg (max 40 mg).'}
  ];
  el.innerHTML='<div style="font-family:\'Courier Prime\',monospace;font-size:11px;color:var(--clay);margin-bottom:6px">Patient weight: '+(kg.toFixed(1))+' kg${maiUnit===\'lbs\'?' (${raw} lbs)':\'\'}</div>'+
  drugs.map(d=>'<div class="calc-drug-row"><div class="calc-drug-name">'+(d.name)+'</div><div class="calc-drug-detail">'+(d.detail)+'</div><div class="calc-drug-dose">${d.hi?'${d.lo.toFixed(1)}–${d.hi.toFixed(1)}':'${d.lo.toFixed(1)}'} <span>'+(d.unit)+'</span></div><div style="font-size:11px;color:var(--clay);margin-top:3px">'+(d.note)+'</div></div>').join('');
}

function render(){
  const q=searchQuery.trim().toLowerCase();
  if(currentTab==='protocols')renderProtocols(q);
  else if(currentTab==='formulary')renderFormulary(q);
  else if(currentTab==='scope')renderScope();
  else if(currentTab==='ops')renderOps();
  else if(currentTab==='mai')renderMAI();
  else if(currentTab==='quiz'){window.location.href='quiz.html';}
}

function showDetail(type,id){
  const dv=document.getElementById('detail-view');
  const dt=document.getElementById('detailTitle');
  const ds=document.getElementById('detailSubtitle');
  const db=document.getElementById('detailBody');
  if(type==='protocol'){
    let item=null,sn='';
    SECTIONS.protocols.forEach(function(s){var f=s.items.find(function(i){return i.id===id;});if(f){item=f;sn=s.section;}});
    if(!item)return;
    dt.textContent=item.title;ds.textContent=(sn)+' · Scope: '+(item.scope);db.innerHTML=item.body;
  }else if(type==='ops'){
    const item=OPS_DATA[parseInt(id)];if(!item)return;
    dt.textContent=item.title;ds.textContent='Operational Guidelines';db.innerHTML=item.body;
  }
  dv.style.display='block';
  dv.scrollTop=0;
}
function hideDetail(){
  var dv=document.getElementById('detail-view');
  if(dv){dv.style.display='none';}
}

var backBtnEl = document.getElementById('backBtn');
if(backBtnEl){
  backBtnEl.addEventListener('click', function(e){e.preventDefault();e.stopPropagation();hideDetail();});
  backBtnEl.addEventListener('touchend', function(e){e.preventDefault();e.stopPropagation();hideDetail();});
}
document.querySelectorAll('.nav-tab').forEach(function(tab){
  tab.addEventListener('click',function(){
    hideDetail();
    document.querySelectorAll('.nav-tab').forEach(function(t){t.classList.remove('active');});
    tab.classList.add('active');
    currentTab=tab.dataset.tab;
    render();
  });
});
document.getElementById('searchInput').addEventListener('input',function(e){
  searchQuery=e.target.value;
  document.getElementById('clearBtn').style.display=searchQuery?'block':'none';
  if(currentTab==='scope')return;
  render();
});
document.getElementById('clearBtn').addEventListener('click',function(){
  document.getElementById('searchInput').value='';
  searchQuery='';
  document.getElementById('clearBtn').style.display='none';
  render();
});
document.getElementById('content').addEventListener('click',function(e){
  var card=e.target.closest('[data-type]');
  if(card){showDetail(card.dataset.type,card.dataset.id);}
});
// ── QUIZ SYSTEM ───────────────────────────────────────────────
document.addEventListener('keydown', function(e){if(e.key==='Escape'){hideDetail();}});
render();
