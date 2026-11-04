/* Quiz kit — the shared engine behind the Protocol Quiz and the Daily 5.
 *
 * QuizKit.mount(root, config) renders three screens (setup, question,
 * results) into `root`. Banks are plain arrays of
 *   {id, cat, type:'mc'|'tf', q, opts:[...], ans, exp, ref?}
 * keyed by bank name; a level's pool is the union of the banks it lists, so a
 * Paramedic is also asked the EMT and AEMT questions.
 *
 * config = {
 *   appName, title, subtitle, homeHref, homeLabel,
 *   banks: {emt:[...], aemt:[...], pm:[...], ...},
 *   levels: [{id, label, blurb, banks:['emt', ...]}],
 *   mode: 'full' | 'daily',
 *   storageKey,              // missed questions + best scores (full mode)
 *   dailyKey,                // streak stats (daily mode)
 *   dailyCount: 5
 * }
 */
(function(){
  'use strict';

  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function shuffle(a){ a = a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function load(key, fallback){ try{ var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }catch(e){ return fallback; } }
  function save(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  function stripLetter(o){ return String(o).replace(/^[A-D][.)]\s+/, ''); }
  function dayStr(d){ return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
  var LETTERS = ['A','B','C','D','E','F'];

  // Current streak: only alive if the last day done was today or yesterday.
  function liveStreak(st){
    if(!st || !st.lastDone) return 0;
    var t = new Date(), y = new Date(); y.setDate(y.getDate()-1);
    return (st.lastDone === dayStr(t) || st.lastDone === dayStr(y)) ? (st.streak || 0) : 0;
  }

  function mount(root, cfg){
    var mode = cfg.mode || 'full';
    var store = mode === 'full' ? load(cfg.storageKey, {}) : null;
    if(store){ store.missed = store.missed || {}; store.best = store.best || {}; }
    var daily = mode === 'daily' ? load(cfg.dailyKey, {}) : null;
    var S = { level: null, length: 10, focus: 'all', qs: [], i: 0, score: 0, answers: [], review: false };

    // Remember the last level picked
    var lastLevel = mode === 'daily' ? (daily && daily.lastScope) : (store && store.lastLevel);
    if(lastLevel === 'all') lastLevel = 'pm';
    S.level = cfg.levels.some(function(l){ return l.id === lastLevel; }) ? lastLevel : cfg.levels[0].id;

    function levelObj(id){ return cfg.levels.filter(function(l){ return l.id === id; })[0]; }
    function pool(levelId){
      var lv = levelObj(levelId), out = [];
      lv.banks.forEach(function(b){ (cfg.banks[b] || []).forEach(function(q){ out.push(Object.assign({ uid: b+':'+q.id }, q)); }); });
      return out;
    }
    function cats(levelId){
      var seen = {}, out = [];
      pool(levelId).forEach(function(q){ if(!seen[q.cat]){ seen[q.cat] = 1; out.push(q.cat); } });
      return out;
    }
    function missedFor(levelId){ return (store && store.missed[levelId]) || []; }

    // ── Shell ────────────────────────────────────────────────────────────
    root.innerHTML =
      '<header class="qk-bar">'
      + '<a class="qk-back" href="'+esc(cfg.homeHref)+'" aria-label="Back to '+esc(cfg.homeLabel)+'">&#x2190; '+esc(cfg.homeLabel)+'</a>'
      + '<div class="qk-bar-title"><span>'+esc(cfg.appName)+'</span>'+esc(cfg.title)+'</div>'
      + (mode === 'daily' ? '<div class="qk-streak" id="qk-streak" title="Current streak"></div>' : '<div class="qk-bar-sp"></div>')
      + '</header>'
      + '<main class="qk-main" id="qk-main"></main>'
      + '<div class="qk-sr" aria-live="polite" id="qk-live"></div>';
    var main = root.querySelector('#qk-main');
    function live(t){ var l = root.querySelector('#qk-live'); l.textContent = ''; setTimeout(function(){ l.textContent = t; }, 30); }
    function paintStreak(){ var el = root.querySelector('#qk-streak'); if(el) el.innerHTML = '<b>'+liveStreak(daily)+'</b> day streak'; }
    paintStreak();

    // ── Setup ────────────────────────────────────────────────────────────
    function renderSetup(){
      S.review = false;
      var h = '<section class="qk-hero"><div class="qk-eyebrow">'+esc(cfg.subtitle)+'</div>'
            + '<h1>'+esc(cfg.title)+'</h1>';
      if(mode === 'daily'){
        var doneToday = daily && daily.lastDone === dayStr(new Date());
        h += '<p>'+(cfg.dailyCount||5)+' questions a day from the protocols. Keep the streak alive.</p>'
           + '<div class="qk-stats"><div><b>'+liveStreak(daily)+'</b><span>Streak</span></div>'
           + '<div><b>'+((daily && daily.bestStreak)||0)+'</b><span>Best</span></div>'
           + '<div><b>'+((daily && daily.totalDone)||0)+'</b><span>Days done</span></div></div>';
        if(doneToday) h += '<div class="qk-note ok">Today&rsquo;s set is done. Practice rounds won&rsquo;t change your streak.</div>';
      } else {
        h += '<p>Multiple choice and true/false with an explanation after every answer, checked against the 2026 protocols.</p>';
      }
      h += '</section>';

      h += '<section class="qk-card"><div class="qk-label">Your level</div><div class="qk-levels" role="radiogroup" aria-label="Level">';
      cfg.levels.forEach(function(l){
        var n = pool(l.id).length, best = store && store.best[l.id];
        h += '<button type="button" role="radio" aria-checked="'+(S.level===l.id)+'" class="qk-level lv-'+esc(l.id)+(S.level===l.id?' on':'')+'" data-level="'+esc(l.id)+'">'
           + '<span class="qk-level-name">'+esc(l.label)+'</span>'
           + '<span class="qk-level-sub">'+n+' questions'+(best ? ' &middot; best '+best.pct+'%' : '')+'</span></button>';
      });
      h += '</div><div class="qk-level-blurb">'+esc(levelObj(S.level).blurb || '')+'</div></section>';

      if(mode === 'full'){
        var total = pool(S.level).length;
        h += '<section class="qk-card"><div class="qk-label">Length</div><div class="qk-chips" data-group="length">';
        [10, 25, 0].forEach(function(n){
          var lbl = n ? n + ' questions' : 'All ' + total;
          h += '<button type="button" class="qk-chip'+(S.length===n?' on':'')+'" data-length="'+n+'" aria-pressed="'+(S.length===n)+'">'+lbl+'</button>';
        });
        h += '</div><div class="qk-label" style="margin-top:14px">Focus</div><div class="qk-chips" data-group="focus">';
        h += '<button type="button" class="qk-chip'+(S.focus==='all'?' on':'')+'" data-focus="all" aria-pressed="'+(S.focus==='all')+'">Everything</button>';
        cats(S.level).forEach(function(c){
          h += '<button type="button" class="qk-chip'+(S.focus===c?' on':'')+'" data-focus="'+esc(c)+'" aria-pressed="'+(S.focus===c)+'">'+esc(c)+'</button>';
        });
        h += '</div></section>';
      }

      h += '<div class="qk-actions">';
      if(mode === 'daily'){
        var done = daily && daily.lastDone === dayStr(new Date());
        h += '<button type="button" class="qk-btn primary" data-act="start">'+(done ? 'Practice round' : 'Start today&rsquo;s '+(cfg.dailyCount||5))+'</button>';
      } else {
        h += '<button type="button" class="qk-btn primary" data-act="start">Start quiz</button>';
        var m = missedFor(S.level).length;
        if(m) h += '<button type="button" class="qk-btn" data-act="missed">Review '+m+' missed</button>';
      }
      h += '</div>';
      main.innerHTML = h;
      window.scrollTo(0, 0);
    }

    // ── Run ──────────────────────────────────────────────────────────────
    function start(missedOnly){
      var p = pool(S.level);
      if(missedOnly){
        var ids = missedFor(S.level);
        p = p.filter(function(q){ return ids.indexOf(q.uid) >= 0; });
        S.review = true;
      } else if(mode === 'full' && S.focus !== 'all'){
        p = p.filter(function(q){ return q.cat === S.focus; });
      }
      p = shuffle(p);
      var n = mode === 'daily' ? (cfg.dailyCount || 5) : (missedOnly || !S.length ? p.length : Math.min(S.length, p.length));
      S.qs = p.slice(0, n).map(function(q){
        var order = q.opts.map(function(_, k){ return k; });
        if(q.type !== 'tf') order = shuffle(order);
        return { q: q, order: order };
      });
      S.i = 0; S.score = 0; S.answers = [];
      if(store){ store.lastLevel = S.level; save(cfg.storageKey, store); }
      renderQuestion();
    }

    function renderQuestion(){
      var item = S.qs[S.i], q = item.q, n = S.qs.length;
      var h = '<div class="qk-progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+n+'" aria-valuenow="'+S.i+'"><i style="width:'+(S.i/n*100)+'%"></i></div>'
            + '<div class="qk-qmeta"><span>Question '+(S.i+1)+' of '+n+'</span><span class="qk-cat">'+esc(q.cat)+'</span></div>'
            + '<h2 class="qk-q" tabindex="-1" id="qk-q">'+esc(q.q)+'</h2>'
            + '<div class="qk-opts" role="group" aria-labelledby="qk-q">';
      item.order.forEach(function(k, pos){
        var txt = q.type === 'tf' ? q.opts[k] : stripLetter(q.opts[k]);
        h += '<button type="button" class="qk-opt" data-k="'+k+'"><span class="qk-key">'+(q.type==='tf' ? (k===0?'T':'F') : LETTERS[pos])+'</span><span class="qk-opt-t">'+esc(txt)+'</span></button>';
      });
      h += '</div><div id="qk-feedback"></div>';
      main.innerHTML = h;
      window.scrollTo(0, 0);
      var qh = root.querySelector('#qk-q'); if(qh) qh.focus({ preventScroll: true });
    }

    function answer(k){
      var item = S.qs[S.i], q = item.q;
      if(S.answers.length > S.i) return; // already answered
      var ok = k === q.ans;
      S.answers.push({ q: q, picked: k, ok: ok });
      if(ok) S.score++;
      root.querySelectorAll('.qk-opt').forEach(function(b){
        var bk = +b.getAttribute('data-k');
        b.disabled = true;
        if(bk === q.ans) b.classList.add('correct');
        else if(bk === k) b.classList.add('wrong');
        else b.classList.add('dim');
      });
      var last = S.i === S.qs.length - 1;
      var fb = '<div class="qk-fb '+(ok?'ok':'no')+'"><div class="qk-fb-h">'+(ok ? 'Correct' : 'Not quite')+'</div>'
             + (!ok ? '<div class="qk-fb-ans">Answer: '+esc(q.type==='tf' ? q.opts[q.ans] : stripLetter(q.opts[q.ans]))+'</div>' : '')
             + (q.exp ? '<p>'+esc(q.exp)+'</p>' : '')
             + (q.ref ? '<div class="qk-ref">'+esc(q.ref)+'</div>' : '')
             + '</div><div class="qk-next"><button type="button" class="qk-btn primary" data-act="next">'+(last ? 'See results' : 'Next question')+' &#x2192;</button></div>';
      root.querySelector('#qk-feedback').innerHTML = fb;
      live((ok ? 'Correct. ' : 'Incorrect. The answer is ' + (q.type==='tf' ? q.opts[q.ans] : stripLetter(q.opts[q.ans])) + '. ') + (q.exp || ''));
      var nb = root.querySelector('[data-act="next"]'); if(nb) nb.focus({ preventScroll: true });
      var fbEl = root.querySelector('.qk-fb'); if(fbEl && fbEl.scrollIntoView) fbEl.scrollIntoView({ block: 'nearest' });
    }

    function next(){ S.i++; if(S.i >= S.qs.length) finish(); else renderQuestion(); }

    // ── Results ──────────────────────────────────────────────────────────
    function finish(){
      var n = S.qs.length, pct = n ? Math.round(S.score / n * 100) : 0;
      var streakMsg = '';
      if(mode === 'daily'){
        var today = dayStr(new Date());
        if(!daily || daily.lastDone !== today){
          var y = new Date(); y.setDate(y.getDate()-1);
          var streak = daily && daily.lastDone === dayStr(y) ? (daily.streak || 0) + 1 : 1;
          daily = { streak: streak, bestStreak: Math.max(streak, (daily && daily.bestStreak) || 0),
                    totalDone: ((daily && daily.totalDone) || 0) + 1, lastDone: today, lastScope: S.level };
          save(cfg.dailyKey, daily);
          streakMsg = streak === 1 ? 'Streak started' : streak + '-day streak';
        } else {
          streakMsg = 'Practice round &mdash; streak unchanged';
        }
        paintStreak();
      } else {
        var missed = missedFor(S.level).slice();
        S.answers.forEach(function(a){
          var i = missed.indexOf(a.q.uid);
          if(a.ok && i >= 0) missed.splice(i, 1);
          if(!a.ok && i < 0) missed.push(a.q.uid);
        });
        store.missed[S.level] = missed;
        if(!S.review && S.focus === 'all' && n >= 10){
          var prev = store.best[S.level];
          if(!prev || pct > prev.pct) store.best[S.level] = { pct: pct, n: n, date: dayStr(new Date()) };
        }
        save(cfg.storageKey, store);
      }

      // Per-category breakdown
      var byCat = {}, order = [];
      S.answers.forEach(function(a){ var c = a.q.cat; if(!byCat[c]){ byCat[c] = { ok: 0, n: 0 }; order.push(c); } byCat[c].n++; if(a.ok) byCat[c].ok++; });

      var tone = pct >= 90 ? 'great' : pct >= 75 ? 'good' : pct >= 60 ? 'fair' : 'low';
      var C = 2 * Math.PI * 52;
      var h = '<section class="qk-result tone-'+tone+'">'
            + '<svg class="qk-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="bg"/>'
            + '<circle cx="60" cy="60" r="52" class="fg" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*(1-pct/100)).toFixed(1)+'"/></svg>'
            + '<div class="qk-pct"><b>'+pct+'%</b><span>'+S.score+' of '+n+'</span></div>'
            + '<div class="qk-result-msg">'+({great:'Excellent work.',good:'Solid — review the misses below.',fair:'Getting there — go over the explanations.',low:'Worth another pass through the protocols.'})[tone]+'</div>'
            + (streakMsg ? '<div class="qk-note ok">'+streakMsg+'</div>' : '')
            + '</section>';
      if(order.length > 1){
        h += '<section class="qk-card"><div class="qk-label">By topic</div>';
        order.forEach(function(c){
          var b = byCat[c], p = Math.round(b.ok / b.n * 100);
          h += '<div class="qk-cat-row"><span>'+esc(c)+'</span><div class="qk-cat-bar"><i class="'+(p>=75?'hi':p>=50?'mid':'lo')+'" style="width:'+p+'%"></i></div><b>'+b.ok+'/'+b.n+'</b></div>';
        });
        h += '</section>';
      }
      var wrong = S.answers.filter(function(a){ return !a.ok; });
      if(wrong.length){
        h += '<section class="qk-card"><div class="qk-label">Review what you missed</div>';
        wrong.forEach(function(a){
          var q = a.q;
          h += '<div class="qk-miss"><div class="qk-miss-q">'+esc(q.q)+'</div>'
             + '<div class="qk-miss-you">You chose: '+esc(q.type==='tf' ? q.opts[a.picked] : stripLetter(q.opts[a.picked]))+'</div>'
             + '<div class="qk-miss-ans">Answer: '+esc(q.type==='tf' ? q.opts[q.ans] : stripLetter(q.opts[q.ans]))+'</div>'
             + (q.exp ? '<p>'+esc(q.exp)+'</p>' : '') + (q.ref ? '<div class="qk-ref">'+esc(q.ref)+'</div>' : '') + '</div>';
        });
        h += '</section>';
      }
      h += '<div class="qk-actions">';
      if(mode === 'full' && missedFor(S.level).length) h += '<button type="button" class="qk-btn primary" data-act="missed">Retry '+missedFor(S.level).length+' missed</button>';
      h += '<button type="button" class="qk-btn'+(mode==='full' && missedFor(S.level).length ? '' : ' primary')+'" data-act="setup">'+(mode==='daily' ? 'Done' : 'New quiz')+'</button>'
         + '<a class="qk-btn ghost" href="'+esc(cfg.homeHref)+'">Back to '+esc(cfg.homeLabel)+'</a></div>';
      main.innerHTML = h;
      window.scrollTo(0, 0);
      live('Finished. ' + S.score + ' of ' + n + ' correct, ' + pct + ' percent.');
    }

    // ── Events ───────────────────────────────────────────────────────────
    root.addEventListener('click', function(e){
      var t = e.target.closest('button,[data-act]'); if(!t || !root.contains(t)) return;
      if(t.hasAttribute('data-level')){ S.level = t.getAttribute('data-level'); S.focus = 'all'; renderSetup(); return; }
      if(t.hasAttribute('data-length')){ S.length = +t.getAttribute('data-length'); renderSetup(); return; }
      if(t.hasAttribute('data-focus')){ S.focus = t.getAttribute('data-focus'); renderSetup(); return; }
      if(t.classList.contains('qk-opt')){ answer(+t.getAttribute('data-k')); return; }
      var act = t.getAttribute('data-act');
      if(act === 'start') start(false);
      else if(act === 'missed') start(true);
      else if(act === 'next') next();
      else if(act === 'setup') renderSetup();
    });
    document.addEventListener('keydown', function(e){
      if(e.altKey || e.ctrlKey || e.metaKey) return;
      var opts = root.querySelectorAll('.qk-opt:not([disabled])');
      if(opts.length){
        var k = e.key.toUpperCase(), idx = -1;
        if(/^[1-6]$/.test(k)) idx = +k - 1;
        else if(LETTERS.indexOf(k) >= 0) idx = LETTERS.indexOf(k);
        else if(k === 'T' || k === 'F') idx = -2;
        if(idx === -2){ var b = root.querySelector('.qk-opt[data-k="'+(k==='T'?0:1)+'"]'); if(b && S.qs[S.i].q.type==='tf'){ b.click(); e.preventDefault(); } return; }
        if(idx >= 0 && opts[idx]){ opts[idx].click(); e.preventDefault(); }
      } else if(e.key === 'Enter'){
        var nb = root.querySelector('[data-act="next"]'); if(nb && document.activeElement !== nb){ nb.click(); e.preventDefault(); }
      }
    });

    renderSetup();
  }

  window.QuizKit = { mount: mount, liveStreak: liveStreak };
})();
