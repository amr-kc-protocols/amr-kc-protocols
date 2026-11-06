/*
 * Crew login screen. Load it first in <head> on every page:
 *   <script src="auth-gate.js"></script>
 *
 * It asks for the same username and password crews use on the Toughbooks.
 * The repository is public, so the password is never written here: only a
 * slow one-way hash (PBKDF2-SHA256) of "username\npassword" is stored.
 *
 * This keeps casual visitors out. It is not real security: the files are
 * still public on GitHub and can be opened directly by anyone who looks.
 *
 * Once a device unlocks, it stays unlocked (localStorage). Both sites share
 * the amr-kc-protocols.github.io origin, so unlocking one unlocks the other.
 *
 * To change the credentials, compute a new hash and replace HASH below:
 *   node -e 'console.log(require("crypto").pbkdf2Sync("user\npass",
 *     "amr-kc-protocols/crew-gate/v1",310000,32,"sha256").toString("hex"))'
 * Copy the same file to linn-county-protocols. Changing HASH signs every
 * device out.
 */
(function () {
  var HASH = '28860d2e7ffddf076d87ef59b525b3e05988f46ca90d7a79b1d3934646fafaa2';
  var SALT = 'amr-kc-protocols/crew-gate/v1';
  var ITER = 310000;
  var KEY = 'amr_crew_unlock';

  // Local test servers and files opened from disk skip the screen.
  var h = location.hostname;
  if (!h || h === 'localhost' || h === '127.0.0.1') return;

  function stored() {
    try { if (localStorage.getItem(KEY) === HASH) return true; } catch (e) {}
    try { if (sessionStorage.getItem(KEY) === HASH) return true; } catch (e) {}
    return false;
  }
  if (stored()) return;

  var root = document.documentElement;
  root.classList.add('amr-locked');

  var css =
    'html.amr-locked body{visibility:hidden!important;overflow:hidden!important}' +
    '#amr-gate{--g-bg:#f4f5f7;--g-card:#fff;--g-ink:#14181f;--g-mute:#5b6472;--g-line:#d5d9e0;' +
    '--g-accent:#b3122e;--g-hint-bg:#fff6dc;--g-hint-ink:#5c4400;--g-hint-line:#f0d58a;--g-err:#b3122e;' +
    'position:fixed;inset:0;z-index:2147483647;visibility:visible;background:var(--g-bg);color:var(--g-ink);' +
    'display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;' +
    'font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '@media (prefers-color-scheme:dark){#amr-gate{--g-bg:#0f1217;--g-card:#181c23;--g-ink:#eef1f5;' +
    '--g-mute:#a3acb9;--g-line:#2f3642;--g-accent:#ff5a6e;--g-hint-bg:#2b2410;--g-hint-ink:#f5dc9a;' +
    '--g-hint-line:#5a4a1c;--g-err:#ff7a8a}}' +
    '#amr-gate *{box-sizing:border-box}' +
    '#amr-gate .g-card{width:100%;max-width:380px;background:var(--g-card);border:1px solid var(--g-line);' +
    'border-radius:14px;padding:24px 20px;box-shadow:0 6px 24px rgba(0,0,0,.08)}' +
    '#amr-gate h1{margin:0 0 4px;font-size:20px;line-height:1.25}' +
    '#amr-gate .g-sub{margin:0 0 16px;color:var(--g-mute);font-size:14px}' +
    '#amr-gate .g-hint{display:flex;gap:8px;align-items:flex-start;margin:0 0 18px;padding:10px 12px;' +
    'background:var(--g-hint-bg);color:var(--g-hint-ink);border:1px solid var(--g-hint-line);' +
    'border-radius:10px;font-size:14px}' +
    '#amr-gate label{display:block;margin:0 0 4px;font-size:14px;font-weight:600}' +
    '#amr-gate input{display:block;width:100%;margin:0 0 14px;padding:12px;font:inherit;font-size:16px;' +
    'color:var(--g-ink);background:var(--g-card);border:1px solid var(--g-line);border-radius:8px}' +
    '#amr-gate input:focus{outline:2px solid var(--g-accent);outline-offset:1px}' +
    '#amr-gate button{width:100%;padding:12px;font:inherit;font-weight:700;color:#fff;' +
    'background:var(--g-accent);border:0;border-radius:8px;cursor:pointer}' +
    '#amr-gate button[disabled]{opacity:.6;cursor:wait}' +
    '#amr-gate .g-err{min-height:20px;margin:10px 0 0;color:var(--g-err);font-size:14px}';

  var style = document.createElement('style');
  style.textContent = css;
  (document.head || root).appendChild(style);

  function hex(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return s;
  }

  function derive(user, pass) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(user + '\n' + pass), 'PBKDF2', false, ['deriveBits'])
      .then(function (k) {
        return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ITER }, k, 256);
      })
      .then(hex);
  }

  function remember() {
    try { localStorage.setItem(KEY, HASH); return; } catch (e) {}
    try { sessionStorage.setItem(KEY, HASH); } catch (e) {}
  }

  function build() {
    if (document.getElementById('amr-gate')) return;
    var gate = document.createElement('div');
    gate.id = 'amr-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'amr-gate-title');
    gate.innerHTML =
      '<form class="g-card" novalidate>' +
        '<h1 id="amr-gate-title">AMR crew login</h1>' +
        '<p class="g-sub">For AMR employees only.</p>' +
        '<p class="g-hint" id="amr-gate-hint"><span aria-hidden="true">&#128161;</span>' +
          '<span><strong>Hint:</strong> use the same username and password you use to log in to the Toughbooks.</span></p>' +
        '<label for="amr-gate-user">Username</label>' +
        '<input id="amr-gate-user" name="username" autocomplete="username" autocapitalize="none" ' +
          'autocorrect="off" spellcheck="false" aria-describedby="amr-gate-hint" required>' +
        '<label for="amr-gate-pass">Password</label>' +
        '<input id="amr-gate-pass" name="password" type="password" autocomplete="current-password" required>' +
        '<button type="submit">Log in</button>' +
        '<p class="g-err" role="alert" aria-live="assertive"></p>' +
      '</form>';
    document.body.appendChild(gate);

    var form = gate.querySelector('form');
    var user = gate.querySelector('#amr-gate-user');
    var pass = gate.querySelector('#amr-gate-pass');
    var btn = gate.querySelector('button');
    var err = gate.querySelector('.g-err');

    if (!(window.crypto && crypto.subtle && window.TextEncoder)) {
      err.textContent = 'This browser cannot check the login. Update it, or open the site in Safari or Chrome.';
      btn.disabled = true;
      return;
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var u = user.value.trim().toLowerCase();
      var p = pass.value;
      if (!u || !p) { err.textContent = 'Enter your username and password.'; return; }
      btn.disabled = true;
      btn.textContent = 'Checking…';
      err.textContent = '';
      derive(u, p).then(function (got) {
        if (got === HASH) {
          remember();
          gate.remove();
          style.remove();
          root.classList.remove('amr-locked');
        } else {
          err.textContent = 'That username or password is not right. It is the same one you use on the Toughbooks.';
          pass.value = '';
          pass.focus();
        }
      }, function () {
        err.textContent = 'Could not check the login. Try again.';
      }).then(function () {
        btn.disabled = false;
        btn.textContent = 'Log in';
      });
    });

    user.focus();
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
