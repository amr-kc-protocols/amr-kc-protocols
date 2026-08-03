/* ============================================================
   AMR KC Field Guide — backend sync
   ============================================================
   Mirrors Academy progress and Ask the Educator submissions to
   Supabase. Everything here is additive: localStorage stays the
   source of truth for what the learner sees, and this layer pushes
   a durable copy so a CE record survives a lost or wiped phone.

   WHY NO supabase-js
     This app is a set of self-contained HTML files with no build
     step, served offline through a service worker. The three
     endpoints needed here (anonymous sign-in, token refresh, and a
     PostgREST upsert) are plain HTTPS, so pulling in a ~120 KB
     dependency and a bundler to reach them would cost more than it
     returns. The request shapes below match @supabase/auth-js 2.x.

   OFFLINE BEHAVIOUR
     Nothing in this file is allowed to break the app. Every entry
     point resolves rather than throwing, and any write that cannot
     go out now is queued in an outbox and retried on reconnect. A
     medic in a basement finishes the module; the record lands when
     the phone next sees a tower.

   SETUP
     Fill in CONFIG below (or define window.AMR_BACKEND_CONFIG before
     this script loads). Until a URL and key are present, every call
     is a silent no-op and the app behaves exactly as it did before.
     See supabase/README.md.
   ============================================================ */
(function (global) {
  "use strict";

  var CONFIG = global.AMR_BACKEND_CONFIG || {
    url: "",      // e.g. "https://abcdefgh.supabase.co"
    anonKey: ""   // the project's public anon / publishable key
  };

  /* Two independent sessions, deliberately on separate keys. The
     educator dashboard is very likely opened in the same browser used to
     test an academy, and a shared key would mean signing in as educator
     silently replaced the learner's anonymous identity — orphaning that
     device's progress — and signing out again took the learner with it. */
  var SESSION_KEY     = "amr_backend_session_v1";
  var EDU_SESSION_KEY = "amr_backend_educator_v1";
  var OUTBOX_KEY      = "amr_backend_outbox_v1";

  /* Refresh this far ahead of expiry so a slow link does not land a
     request with an already-dead token. */
  var REFRESH_MARGIN_MS = 60 * 1000;
  var FLUSH_INTERVAL_MS = 5 * 60 * 1000;
  var MAX_OUTBOX        = 50;
  var MAX_ATTEMPTS      = 8;
  var REQUEST_TIMEOUT_MS = 15000;

  function configured() {
    return !!(CONFIG.url && CONFIG.anonKey);
  }

  /* ── storage helpers ───────────────────────────────────────
     Private browsing and full quotas both throw here. A learner
     with no storage still gets a working app, just no sync. */
  function readJSON(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  /* ── HTTP ──────────────────────────────────────────────────
     A hung request is worse than a failed one: it would block the
     outbox behind it, so every call carries its own timeout. */
  function request(path, options) {
    options = options || {};
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? global.setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS) : null;

    var headers = { "apikey": CONFIG.anonKey, "Content-Type": "application/json" };
    if (options.headers) {
      for (var h in options.headers) {
        if (Object.prototype.hasOwnProperty.call(options.headers, h)) headers[h] = options.headers[h];
      }
    }
    if (!headers["Authorization"]) headers["Authorization"] = "Bearer " + CONFIG.anonKey;

    return fetch(CONFIG.url + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) global.clearTimeout(timer);
      return res.text().then(function (text) {
        var data = null;
        if (text) { try { data = JSON.parse(text); } catch (e) { data = { raw: text }; } }
        return { ok: res.ok, status: res.status, data: data };
      });
    }).catch(function (err) {
      if (timer) global.clearTimeout(timer);
      /* status 0 marks "never reached the server", which the retry
         logic treats as always worth another try. */
      return { ok: false, status: 0, data: null, error: err };
    });
  }

  /* A 4xx from a well-formed request means the payload will never be
     accepted — constraint violation, malformed body, bad course id.
     Retrying it forever would wedge the outbox, so those are dropped.
     401/403 are excluded: they usually mean an expired token, which a
     refresh can fix. 429 is a request to slow down, not a rejection. */
  function isPermanent(status) {
    if (status === 401 || status === 403 || status === 429) return false;
    return status >= 400 && status < 500;
  }

  /* ── sessions ──────────────────────────────────────────────
     A store owns one session on one storage key. `autoAnonymous`
     separates the two kinds: the learner store mints an anonymous user
     on demand and re-mints one if its refresh token dies, while the
     educator store never creates anything — a dead educator session
     means "sign in again", not "become somebody new". */
  function makeSessionStore(storageKey, autoAnonymous) {
    var refreshInFlight = null;

    function load() { return readJSON(storageKey, null); }

    function save(session) {
      if (!session || !session.access_token) return null;
      var stored = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        /* expires_at from GoTrue is in seconds; keep milliseconds here
           so it can be compared against Date.now() directly. */
        expires_at_ms: session.expires_at
          ? session.expires_at * 1000
          : Date.now() + ((session.expires_in || 3600) * 1000),
        user_id: session.user && session.user.id,
        is_anonymous: !!(session.user && session.user.is_anonymous),
        email: (session.user && session.user.email) || ""
      };
      writeJSON(storageKey, stored);
      return stored;
    }

    function clear() {
      try { global.localStorage.removeItem(storageKey); } catch (e) {}
    }

    function signInAnonymously() {
      return request("/auth/v1/signup", {
        method: "POST",
        body: { data: {}, gotrue_meta_security: {} }
      }).then(function (res) {
        if (!res.ok || !res.data || !res.data.access_token) return null;
        return save(res.data);
      });
    }

    function refresh(stored) {
      if (refreshInFlight) return refreshInFlight;
      refreshInFlight = request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: stored.refresh_token }
      }).then(function (res) {
        refreshInFlight = null;
        if (res.ok && res.data && res.data.access_token) return save(res.data);
        /* A refresh token is only permanently dead on a 4xx. On a network
           blip, keep what we have and try again later rather than
           abandoning the identity and orphaning the learner's history. */
        if (isPermanent(res.status) || res.status === 401 || res.status === 403) {
          clear();
          return autoAnonymous ? signInAnonymously() : null;
        }
        return null;
      }).catch(function () { refreshInFlight = null; return null; });
      return refreshInFlight;
    }

    function get() {
      if (!configured()) return Promise.resolve(null);
      var stored = load();
      if (!stored) return autoAnonymous ? signInAnonymously() : Promise.resolve(null);
      if (stored.expires_at_ms && stored.expires_at_ms - REFRESH_MARGIN_MS <= Date.now()) {
        return refresh(stored).then(function (s) {
          if (s) return s;
          /* The refresh failed. Which kind matters: on a permanent
             failure refresh() cleared the store, and handing back the
             dead token would send a doomed request and, worse, let the
             dashboard believe it is still signed in. On a transient one
             the session is still on disk and worth keeping. */
          return load() ? stored : null;
        });
      }
      return Promise.resolve(stored);
    }

    return { load: load, save: save, clear: clear, get: get, refresh: refresh };
  }

  var learnerStore  = makeSessionStore(SESSION_KEY, true);
  var educatorStore = makeSessionStore(EDU_SESSION_KEY, false);

  /* Kept as free functions so the learner paths below read unchanged. */
  function loadSession() { return learnerStore.load(); }
  function getSession()  { return learnerStore.get(); }

  /* ── authenticated request, with one retry past a stale token ── */
  function authed(path, options, session, store) {
    store = store || learnerStore;
    var opts = options || {};
    opts.headers = opts.headers || {};
    opts.headers["Authorization"] = "Bearer " + session.access_token;
    return request(path, opts).then(function (res) {
      if (res.status !== 401 && res.status !== 403) return res;
      var stored = store.load();
      if (!stored || !stored.refresh_token) return res;
      return store.refresh(stored).then(function (fresh) {
        if (!fresh) return res;
        opts.headers["Authorization"] = "Bearer " + fresh.access_token;
        return request(path, opts);
      });
    });
  }

  /* ── outbox ────────────────────────────────────────────────
     Writes that could not go out now. Academy pushes are keyed and
     collapse to the newest state for that course, because the whole
     record is sent every time and an older copy carries nothing the
     newer one lacks. Ask messages are never collapsed — each is a
     distinct thing the learner wanted to say. */
  function loadOutbox() {
    var box = readJSON(OUTBOX_KEY, []);
    return Object.prototype.toString.call(box) === "[object Array]" ? box : [];
  }
  function saveOutbox(box) { writeJSON(OUTBOX_KEY, box); }

  function enqueue(item) {
    var box = loadOutbox();
    if (item.key) {
      box = box.filter(function (existing) { return existing.key !== item.key; });
    }
    item.attempts = item.attempts || 0;
    item.queued_at = item.queued_at || new Date().toISOString();
    if (!item.id) item.id = "q" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    box.push(item);
    /* Drop the oldest first if the queue somehow runs away — an
       unbounded outbox would eventually blow the storage quota and
       take the app's own saved progress down with it. */
    if (box.length > MAX_OUTBOX) box = box.slice(box.length - MAX_OUTBOX);
    saveOutbox(box);
  }

  function sendItem(item, session) {
    return authed(item.path, { method: "POST", headers: item.headers, body: item.body }, session);
  }

  var flushing = false;
  function flush() {
    if (!configured() || flushing) return Promise.resolve();
    var box = loadOutbox();
    if (!box.length) return Promise.resolve();
    if (global.navigator && global.navigator.onLine === false) return Promise.resolve();

    flushing = true;
    return getSession().then(function (session) {
      if (!session) { flushing = false; return; }

      /* Sequential, not parallel: these are low-volume writes and a
         burst from a reconnecting device would just invite rate
         limiting. */
      var remaining = [];
      var handled = {};
      var chain = Promise.resolve();
      box.forEach(function (item) {
        handled[item.id] = true;
        chain = chain.then(function () {
          return sendItem(item, session).then(function (res) {
            if (res.ok) return;
            item.attempts += 1;
            if (isPermanent(res.status) || item.attempts >= MAX_ATTEMPTS) return; // give up
            remaining.push(item);
          });
        });
      });
      return chain.then(function () {
        /* A flush takes a round trip per item, and the learner may
           queue something new while it runs. Re-read rather than
           writing back the snapshot, or that new item would be
           erased by the very flush meant to protect it. */
        var latest = loadOutbox().filter(function (item) { return !handled[item.id]; });
        saveOutbox(remaining.concat(latest));
        flushing = false;
      });
    }).catch(function () { flushing = false; });
  }

  /* ── public API ────────────────────────────────────────────── */

  /* Push a course's progress. `state` is the academy's own
     localStorage shape, passed straight through, so an academy only
     has to name itself and hand over what it already has. */
  function syncAcademy(courseId, state, opts) {
    if (!configured() || !courseId || !state) return Promise.resolve({ ok: false, skipped: true });
    opts = opts || {};

    var modules = {};
    var total = 0;
    if (state.modules) {
      for (var id in state.modules) {
        if (!Object.prototype.hasOwnProperty.call(state.modules, id)) continue;
        var m = state.modules[id] || {};
        modules[id] = { read: !!m.read, passed: !!m.passed, best: Number(m.best) || 0 };
        total += 1;
      }
    }

    var body = {
      course_id: courseId,
      course_version: state.courseVersion || opts.courseVersion || null,
      learner_name: (state.learnerName || "").trim() || null,
      modules: modules,
      modules_total: opts.modulesTotal || total,
      final_passed: !!state.finalPassed,
      final_best: Number(state.finalBest) || 0,
      completed_at: state.completedAt || null,
      client_updated_at: new Date().toISOString()
    };

    var item = {
      key: "academy:" + courseId,
      path: "/rest/v1/academy_completions?on_conflict=user_id,course_id",
      headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: body
    };

    return getSession().then(function (session) {
      if (!session) { enqueue(item); return { ok: false, queued: true }; }
      /* user_id is set from the session rather than trusted from the
         caller; RLS would reject anything else anyway. */
      item.body.user_id = session.user_id;
      return sendItem(item, session).then(function (res) {
        if (res.ok) return { ok: true };
        if (isPermanent(res.status)) return { ok: false, error: res.data, dropped: true };
        enqueue(item);
        return { ok: false, queued: true };
      });
    }).catch(function () { enqueue(item); return { ok: false, queued: true }; });
  }

  /* Submit an Ask the Educator message.
     Resolves { ok:true } when it reached the server, { ok:true,
     queued:true } when it is safely stored for retry, and
     { ok:false } only when the message was rejected outright — so
     the UI can tell the learner the truth either way. */
  function submitAsk(payload) {
    payload = payload || {};
    var message = (payload.message || "").trim();
    if (message.length < 10) {
      return Promise.resolve({ ok: false, error: "Message is too short." });
    }
    if (message.length > 1000) message = message.slice(0, 1000);
    if (!configured()) return Promise.resolve({ ok: false, error: "Messaging is not configured." });

    var item = {
      path: "/rest/v1/ask_educator_messages",
      headers: { "Prefer": "return=minimal" },
      body: {
        message: message,
        reply_email: (payload.email || "").trim() || null,
        source: payload.source || null
      }
    };

    return getSession().then(function (session) {
      if (!session) { enqueue(item); return { ok: true, queued: true }; }
      item.body.user_id = session.user_id;
      return sendItem(item, session).then(function (res) {
        if (res.ok) return { ok: true };
        if (isPermanent(res.status)) {
          var msg = (res.data && (res.data.message || res.data.hint)) || "Message was rejected.";
          return { ok: false, error: msg };
        }
        enqueue(item);
        return { ok: true, queued: true };
      });
    }).catch(function () { enqueue(item); return { ok: true, queued: true }; });
  }

  /* Attach an email to the anonymous account. Supabase sends a
     confirmation link; the user id survives, so existing completions
     carry over and the learner's history follows them to a new
     device. */
  function linkEmail(email) {
    if (!configured()) return Promise.resolve({ ok: false, error: "Backend is not configured." });
    email = (email || "").trim();
    if (!email || email.indexOf("@") < 1) {
      return Promise.resolve({ ok: false, error: "Enter a valid email address." });
    }
    return getSession().then(function (session) {
      if (!session) return { ok: false, error: "Could not reach the server." };
      return authed("/auth/v1/user", { method: "PUT", body: { email: email } }, session)
        .then(function (res) {
          if (res.ok) return { ok: true, pendingConfirmation: true };
          return { ok: false, error: (res.data && res.data.message) || "Could not link that email." };
        });
    }).catch(function () { return { ok: false, error: "Could not reach the server." }; });
  }

  function status() {
    var stored = loadSession();
    return {
      configured: configured(),
      signedIn: !!stored,
      userId: stored && stored.user_id,
      email: (stored && stored.email) || "",
      isAnonymous: stored ? stored.is_anonymous : null,
      pending: loadOutbox().length
    };
  }

  /* ── educator API ──────────────────────────────────────────
     Reads for the dashboard. Everything here runs on the educator
     session, entirely separate from the learner one above.

     There is no client-side permission check and there should not be:
     whether these queries return rows is decided by the is_educator()
     policy in the database. A dashboard that hid its own buttons would
     add no security and would only hide the real answer. */
  function educatorSignIn(email, password) {
    if (!configured()) return Promise.resolve({ ok: false, error: "Backend is not configured." });
    email = (email || "").trim();
    if (!email || !password) {
      return Promise.resolve({ ok: false, error: "Enter your email and password." });
    }
    return request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email: email, password: password }
    }).then(function (res) {
      if (res.ok && res.data && res.data.access_token) {
        return { ok: true, session: educatorStore.save(res.data) };
      }
      var msg = (res.data && (res.data.error_description || res.data.msg || res.data.message));
      if (res.status === 400 || res.status === 401) {
        msg = msg || "Email or password is incorrect.";
      } else if (res.status === 0) {
        msg = "Could not reach the server — check your connection.";
      }
      return { ok: false, error: msg || "Sign-in failed." };
    }).catch(function () {
      return { ok: false, error: "Could not reach the server — check your connection." };
    });
  }

  function educatorSignOut() {
    var stored = educatorStore.load();
    educatorStore.clear();
    if (!stored) return Promise.resolve({ ok: true });
    /* Best effort: revoke server-side too, but a failure here must not
       leave the dashboard looking signed in when it is not. */
    return authed("/auth/v1/logout", { method: "POST", body: {} }, stored, educatorStore)
      .then(function () { return { ok: true }; })
      .catch(function () { return { ok: true }; });
  }

  function educatorStatus() {
    var stored = educatorStore.load();
    return {
      configured: configured(),
      signedIn: !!stored,
      email: (stored && stored.email) || "",
      userId: stored && stored.user_id
    };
  }

  /* Shared read helper. Resolves { ok, rows } or { ok:false, error }. */
  function educatorSelect(path) {
    if (!configured()) return Promise.resolve({ ok: false, error: "Backend is not configured." });
    return educatorStore.get().then(function (session) {
      if (!session) return { ok: false, error: "Not signed in.", needsSignIn: true };
      return authed(path, { method: "GET" }, session, educatorStore).then(function (res) {
        if (res.ok) return { ok: true, rows: res.data || [] };
        if (res.status === 401 || res.status === 403) {
          return { ok: false, error: "Your session expired — sign in again.", needsSignIn: true };
        }
        if (res.status === 0) {
          return { ok: false, error: "Could not reach the server — check your connection." };
        }
        return { ok: false, error: (res.data && res.data.message) || "Could not load data." };
      });
    }).catch(function () {
      return { ok: false, error: "Could not reach the server — check your connection." };
    });
  }

  function listCompletions() {
    return educatorSelect(
      "/rest/v1/academy_completions" +
      "?select=course_id,course_version,learner_name,learner_email,modules_passed," +
      "modules_total,final_passed,final_best,completed_at,updated_at,user_id" +
      "&order=updated_at.desc"
    );
  }

  /* The submitter's account email is deliberately NOT selected. A
     learner who links an email to save their Academy progress has not
     thereby agreed to be named on questions they asked; only the reply
     address they chose to type belongs here. */
  function listAskMessages() {
    return educatorSelect(
      "/rest/v1/ask_educator_messages" +
      "?select=id,message,reply_email,source,created_at" +
      "&order=created_at.desc"
    );
  }

  /* ── lifecycle ─────────────────────────────────────────────
     Flush on load, on reconnect, when a hidden tab comes back, and
     on a slow timer as a backstop for the case where none of those
     fire (a long-lived tab on a flaky link). */
  if (configured()) {
    global.addEventListener("online", function () { flush(); });
    global.addEventListener("load", function () { flush(); });
    if (global.document) {
      global.document.addEventListener("visibilitychange", function () {
        if (!global.document.hidden) flush();
      });
    }
    global.setInterval(flush, FLUSH_INTERVAL_MS);
  }

  global.AMRBackend = {
    syncAcademy: syncAcademy,
    submitAsk: submitAsk,
    linkEmail: linkEmail,
    flush: flush,
    status: status,
    isConfigured: configured,

    /* Dashboard only. Runs on its own session; see makeSessionStore. */
    educator: {
      signIn: educatorSignIn,
      signOut: educatorSignOut,
      status: educatorStatus,
      listCompletions: listCompletions,
      listAskMessages: listAskMessages
    }
  };
})(window);
