/* Shared signature pad — used by the Caregiver Signature Form, the Kansas Class
   Builder, and the class sign-in page.

   Signing legibly with a finger takes more room than a strip wedged into a form
   on a phone, so this is a full-screen sheet: sideways, most of the screen. One
   drawing surface for every device, so there is one code path to get right.

   A capture comes back two ways:

     png     an opaque PNG data URL, cropped to the ink. What goes into a PDF.
     strokes the pen path, normalized and quantized. ~1KB instead of ~15KB, so a
             signature can travel as a pasteable code — which is the only way to
             collect one from a student attending a class remotely, with nowhere
             to POST it to.

   Usage:
     SigPad.open({ title: 'Crew 1 signature', onDone: function(sig){ ... } });

   Requires sigpad.css. Markup is injected on first use, so a page only has to
   include the two files.
*/
(function(global){
  'use strict';

  var MARKUP =
    '<div id="sigpad" role="dialog" aria-modal="true" aria-labelledby="sigpad-who" style="display:none">' +
    '<div class="sp">' +
    '<div class="sp-bar">' +
    '<span class="sp-who" id="sigpad-who">Signature</span>' +
    '<button class="sp-clear" id="sigpad-clear" type="button">Clear</button>' +
    '</div>' +
    '<canvas class="sp-canvas" id="sigpad-canvas"></canvas>' +
    '<div class="sp-hint">Sign above with your finger<span class="sp-rot"> &mdash; turn your phone sideways for more room</span></div>' +
    '<div class="sp-actions">' +
    '<button class="sp-cancel" id="sigpad-cancel" type="button">Cancel</button>' +
    '<button class="sp-done" id="sigpad-done" type="button" disabled>Use This Signature</button>' +
    '</div>' +
    '</div></div>';

  var UNIT = 1000;        // normalized width a captured signature is scaled to
  var pad = null;         // the drawing engine, built on first open
  var onDone = null;
  var mounted = false;

  function el(id){ return document.getElementById(id); }
  function isOpen(){
    var d = el('sigpad');
    return !!d && d.style.display !== 'none' && d.style.display !== '';
  }
  // The sheet's height tracks the visual viewport, so what is on screen is what
  // you can reach — iOS in landscape overlays its toolbars on a taller layout
  // viewport, which otherwise pushes the buttons out of sight.
  function viewport(){
    var vv = global.visualViewport;
    var h = (vv && vv.height) || global.innerHeight || 0;
    if(h) document.documentElement.style.setProperty('--vvh', h + 'px');
  }

  function mount(){
    if(mounted) return;
    var host = document.createElement('div');
    host.innerHTML = MARKUP;
    document.body.appendChild(host.firstChild);
    mounted = true;
    el('sigpad-clear').addEventListener('click', function(){ var p = setup(); if(p){ p.reset(); p.fit(); } });
    el('sigpad-cancel').addEventListener('click', close);
    el('sigpad-done').addEventListener('click', function(){
      var p = setup();
      if(!p || !p.inked()) return;
      var sig = p.capture();
      var cb = onDone;
      close();
      if(cb && sig) cb(sig);
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && isOpen()) close();
    });
  }

  function setup(){
    if(pad) return pad;
    var canvas = el('sigpad-canvas');
    var doneBtn = el('sigpad-done');
    if(!canvas) return null;
    var ctx = canvas.getContext('2d');
    var pts = [], strokes = [], drawing = false, inked = false, dpr = 1;
    // Bumped by every fit/reset. A restore decoded after one of those is stale,
    // and must not repaint an old signature onto a pad someone has moved on from.
    var gen = 0;

    function style(){
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0d1526';
      ctx.fillStyle = '#0d1526';
      ctx.lineWidth = 3.2;
    }
    // Size the bitmap to the box. 2x is plenty — the target cell is a couple of
    // hundred points wide, so even a phone-width pad is oversampled by then.
    var cssW = 0, cssH = 0;
    function fit(){
      var mine = ++gen;
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      var keep = inked ? canvas.toDataURL('image/png') : null;
      var wasW = cssW, wasH = cssH;
      cssW = r.width; cssH = r.height;
      canvas.width  = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      style();
      // Carry the signature across an orientation change rather than dropping
      // it. Scale uniformly — portrait to landscape is a big change in shape,
      // and stretching to fit would leave someone's name distorted.
      if(keep && wasW && wasH){
        var s = Math.min(r.width / wasW, r.height / wasH);
        // The recorded path has to move with the pixels, or the vector copy and
        // the bitmap disagree about where the signature is.
        if(s !== 1){
          for(var i=0;i<strokes.length;i++){
            for(var j=0;j<strokes[i].length;j++){
              strokes[i][j].x *= s;
              strokes[i][j].y *= s;
            }
          }
        }
        var img = new Image();
        img.onload = function(){
          if(mine === gen) ctx.drawImage(img, 0, 0, wasW * s, wasH * s);
        };
        img.src = keep;
      }
    }
    // iOS reports stale dimensions right after a rotation, so a resize-driven
    // fit can size the bitmap to the old box — which puts the ink somewhere
    // other than under the finger. Checking before a stroke starts is the
    // reliable guard, because it does not depend on event timing.
    function ensureFit(){
      var r = canvas.getBoundingClientRect();
      var want = Math.min(global.devicePixelRatio || 1, 2);
      if(Math.abs(r.width - cssW) > 1 || Math.abs(r.height - cssH) > 1 || want !== dpr) fit();
    }
    function at(e){
      var r = canvas.getBoundingClientRect();
      return {x: e.clientX - r.left, y: e.clientY - r.top};
    }
    function mark(){
      if(inked) return;
      inked = true;
      if(doneBtn) doneBtn.disabled = false;
    }
    // Quadratic through the midpoints of consecutive samples. Straight lineTo
    // segments read as a polygon when a finger moves faster than the events
    // arrive, which is most of a signature.
    function extend(p){
      pts.push(p);
      var n = pts.length;
      if(n < 3){
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        return;
      }
      var a = pts[n-3], b = pts[n-2], c = pts[n-1];
      ctx.beginPath();
      ctx.moveTo((a.x+b.x)/2, (a.y+b.y)/2);
      ctx.quadraticCurveTo(b.x, b.y, (b.x+c.x)/2, (b.y+c.y)/2);
      ctx.stroke();
    }
    function down(e){
      ensureFit();
      drawing = true;
      var p = at(e);
      pts = [p];
      strokes.push(pts);
      // A tap should leave a mark — dots and the dot on an i are part of a name.
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth/2, 0, Math.PI*2);
      ctx.fill();
      mark();
    }
    function move(e){
      if(!drawing) return;
      // Coalesced events recover the samples the browser batched, which is what
      // makes a fast stroke smooth instead of angular.
      var batch = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if(batch && batch.length){
        for(var i=0;i<batch.length;i++) extend(at(batch[i]));
      } else {
        extend(at(e));
      }
    }
    function up(){ drawing = false; pts = []; }

    if(global.PointerEvent){
      canvas.addEventListener('pointerdown', function(e){
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch(_){}
        down(e);
      });
      canvas.addEventListener('pointermove', function(e){ if(drawing){ e.preventDefault(); move(e); } });
      canvas.addEventListener('pointerup', up);
      // Without this, an interrupted stroke (notification, palm, gesture) leaves
      // drawing true and the next touch joins on with a line across the page.
      canvas.addEventListener('pointercancel', up);
    } else {
      canvas.addEventListener('mousedown', function(e){ e.preventDefault(); down(e); });
      canvas.addEventListener('mousemove', function(e){ if(drawing){ e.preventDefault(); move(e); } });
      canvas.addEventListener('mouseup', up);
      canvas.addEventListener('mouseleave', up);
      canvas.addEventListener('touchstart', function(e){ e.preventDefault(); down(e.touches[0]); }, {passive:false});
      canvas.addEventListener('touchmove', function(e){ if(drawing){ e.preventDefault(); move(e.touches[0]); } }, {passive:false});
      canvas.addEventListener('touchend', up);
      canvas.addEventListener('touchcancel', up);
    }
    function reflow(){
      if(!isOpen()) return;
      viewport();
      fit();
    }
    global.addEventListener('resize', reflow);
    // orientationchange lands before the new layout is settled on iOS, so
    // re-fit once things have stopped moving as well as immediately.
    global.addEventListener('orientationchange', function(){
      reflow();
      setTimeout(reflow, 250);
      setTimeout(reflow, 600);
    });
    if(global.visualViewport) global.visualViewport.addEventListener('resize', reflow);

    pad = {
      reset: function(){
        gen++;
        inked = false;
        pts = [];
        strokes = [];
        drawing = false;
        ctx.setTransform(1,0,0,1,0,0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        style();
        if(doneBtn) doneBtn.disabled = true;
      },
      fit: fit,
      inked: function(){ return inked; },
      // Crop to the ink, so a signature fills its cell however large or small it
      // was drawn and the pad's shape never has to match the cell's.
      capture: function(){
        if(!inked || !strokes.length) return null;
        var lw = ctx.lineWidth, pad2 = lw/2 + 2;
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, i, j, p;
        for(i=0;i<strokes.length;i++){
          for(j=0;j<strokes[i].length;j++){
            p = strokes[i][j];
            if(p.x < x0) x0 = p.x;
            if(p.x > x1) x1 = p.x;
            if(p.y < y0) y0 = p.y;
            if(p.y > y1) y1 = p.y;
          }
        }
        if(!isFinite(x0)) return null;
        x0 -= pad2; y0 -= pad2; x1 += pad2; y1 += pad2;
        var bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);

        var out = document.createElement('canvas');
        out.width  = Math.max(1, Math.round(bw * dpr));
        out.height = Math.max(1, Math.round(bh * dpr));
        var octx = out.getContext('2d');
        octx.fillStyle = '#ffffff';   // opaque PNG is the path both PDF libraries handle best
        octx.fillRect(0, 0, out.width, out.height);
        octx.drawImage(canvas, Math.round(x0*dpr), Math.round(y0*dpr), out.width, out.height,
                       0, 0, out.width, out.height);

        // Normalize the path into a UNIT-wide box so it renders at any size.
        var k = UNIT / bw, v = [];
        for(i=0;i<strokes.length;i++){
          var s = simplify(strokes[i], 1.2 / k), flat = [];
          for(j=0;j<s.length;j++){
            flat.push(Math.round((s[j].x - x0) * k), Math.round((s[j].y - y0) * k));
          }
          if(flat.length) v.push(flat);
        }
        return {
          png: out.toDataURL('image/png'),
          strokes: v,
          h: Math.round(bh * k),          // height in the same normalized units
          w: Math.max(1, Math.round(lw * k))  // pen width, so a re-render matches
        };
      }
    };
    return pad;
  }

  // Perpendicular-distance simplification. A signature arrives as hundreds of
  // samples, most of which sit on a line between their neighbors; dropping them
  // is invisible and roughly halves the code someone has to paste.
  function simplify(points, eps){
    if(points.length < 3) return points.slice();
    var keep = [points[0]], last = points[0];
    for(var i=1;i<points.length-1;i++){
      var a = last, b = points[i+1], p = points[i];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx*dx + dy*dy);
      var d = len < 1e-6
        ? Math.sqrt((p.x-a.x)*(p.x-a.x) + (p.y-a.y)*(p.y-a.y))
        : Math.abs(dy*p.x - dx*p.y + b.x*a.y - b.y*a.x) / len;
      if(d > eps){ keep.push(p); last = p; }
    }
    keep.push(points[points.length-1]);
    return keep;
  }

  // ── Rendering a recorded path back to a picture ───────────────────────────
  // Used for previews, and for the PDF once a signature has arrived as a code.
  function render(sig, targetW){
    var w = Math.max(16, Math.round(targetW || 600));
    var k = w / UNIT, h = Math.max(1, Math.round(sig.h * k));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = '#0d1526';
    x.fillStyle = '#0d1526';
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.lineWidth = Math.max(0.8, (sig.w || 12) * k);
    for(var i=0;i<sig.strokes.length;i++){
      var f = sig.strokes[i], n = f.length / 2;
      if(n === 1){
        x.beginPath();
        x.arc(f[0]*k, f[1]*k, x.lineWidth/2, 0, Math.PI*2);
        x.fill();
        continue;
      }
      // Same midpoint-quadratic the pad drew with, so a re-render matches what
      // the signer saw rather than looking like a different hand.
      x.beginPath();
      x.moveTo(f[0]*k, f[1]*k);
      if(n === 2){
        x.lineTo(f[2]*k, f[3]*k);
      } else {
        for(var j=1;j<n-1;j++){
          var bx = f[j*2]*k, by = f[j*2+1]*k;
          var cx = f[(j+1)*2]*k, cy = f[(j+1)*2+1]*k;
          x.quadraticCurveTo(bx, by, (bx+cx)/2, (by+cy)/2);
        }
        x.lineTo(f[(n-1)*2]*k, f[(n-1)*2+1]*k);
      }
      x.stroke();
    }
    return c.toDataURL('image/png');
  }

  // ── The pasteable code ────────────────────────────────────────────────────
  var TAG_RAW = 'AMRSIGN0.', TAG_DEF = 'AMRSIGN1.';

  function b64url(bytes){
    var s = '', CH = 0x8000;
    for(var i=0;i<bytes.length;i+=CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i+CH));
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function unb64url(str){
    var s = str.replace(/-/g,'+').replace(/_/g,'/');
    while(s.length % 4) s += '=';
    var bin = atob(s), out = new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function through(Ctor, bytes){
    try {
      var s = new Ctor('deflate-raw');
      var w = s.writable.getWriter();
      // A damaged code fails on the read side, which is where it is handled.
      // Swallow the write side's copy of the same error so it does not surface
      // as an unhandled rejection in the console.
      w.write(bytes).then(function(){ return w.close(); }).catch(function(){});
      return new Response(s.readable).arrayBuffer().then(function(b){ return new Uint8Array(b); });
    } catch(e){
      return Promise.reject(e);
    }
  }
  function encode(obj){
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    if(!global.CompressionStream) return Promise.resolve(TAG_RAW + b64url(bytes));
    return through(global.CompressionStream, bytes)
      .then(function(z){ return TAG_DEF + b64url(z); })
      .catch(function(){ return TAG_RAW + b64url(bytes); });
  }
  function decode(code){
    var t = String(code || '').trim().replace(/\s+/g, '');
    var deflated = t.indexOf(TAG_DEF) === 0;
    if(!deflated && t.indexOf(TAG_RAW) !== 0) return Promise.reject(new Error('Not a sign-in code'));
    var body;
    try { body = unb64url(t.slice(TAG_DEF.length)); }
    catch(e){ return Promise.reject(new Error('Code is damaged — ask for it again')); }
    var text;
    if(!deflated){
      text = Promise.resolve(new TextDecoder().decode(body));
    } else if(!global.DecompressionStream){
      return Promise.reject(new Error('This browser cannot read compressed codes'));
    } else {
      text = through(global.DecompressionStream, body).then(function(b){ return new TextDecoder().decode(b); });
    }
    return text.then(function(json){
      var o = JSON.parse(json);
      if(!o || !o.sig || !o.sig.strokes) throw new Error('Code is missing its signature');
      return o;
    }).catch(function(e){
      throw new Error(e && /signature/.test(e.message) ? e.message : 'Code is damaged — ask for it again');
    });
  }

  function open(opts){
    opts = opts || {};
    mount();
    var d = el('sigpad'), p = setup();
    if(!d || !p) return;
    onDone = opts.onDone || null;
    el('sigpad-who').textContent = opts.title || 'Signature';
    var done = el('sigpad-done');
    if(done) done.textContent = opts.confirm || 'Use This Signature';
    d.style.display = 'flex';
    document.body.classList.add('sp-open');
    viewport();
    // Size the bitmap after the box has been laid out, not before. Reset first
    // so fit() has nothing from the last signature to carry over.
    setTimeout(function(){ p.reset(); p.fit(); }, 0);
  }
  function close(){
    var d = el('sigpad');
    if(d) d.style.display = 'none';
    document.body.classList.remove('sp-open');
    onDone = null;
  }

  global.SigPad = {
    open: open,
    close: close,
    isOpen: isOpen,
    render: render,
    encode: encode,
    decode: decode,
    UNIT: UNIT
  };
})(window);
