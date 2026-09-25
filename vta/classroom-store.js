/* Ventilator Training Academy — classroom record store
   -----------------------------------------------------
   Classroom work lives here, in its own IndexedDB database. It is deliberately
   NOT the self-paced record: `vta-pwa-state-v2` in localStorage keeps the
   independent course's progress and its certificate, and nothing in this file
   reads or writes it. Attending a class must never mark a self-paced lesson
   read or produce the self-paced certificate.

   Three kinds of record are kept apart on purpose:
     attempts      — what a learner answered, and when they submitted it
     drafts        — unsubmitted working: notes, free text, partial responses
     observations  — what an instructor watched a learner actually do

   A submitted attempt is immutable. A retake is a new attempt with its own
   number, so a first attempt below target stays on the record after a better
   one; the history is the point.                                            */

(function (global) {
  "use strict";

  var DB_NAME = "vta-classroom";
  var DB_VERSION = 1;
  var SCHEMA_VERSION = 1;

  var STORES = {
    meta: "meta",
    classRuns: "classRuns",
    learners: "learners",
    attempts: "attempts",
    drafts: "drafts",
    observations: "observations"
  };

  var cfg = { courseVersion: null, deckSha256: null };
  var dbp = null;

  function configure(o) {
    cfg.courseVersion = o.courseVersion || cfg.courseVersion;
    cfg.deckSha256 = o.deckSha256 || cfg.deckSha256;
    return api;
  }

  // ── ids ────────────────────────────────────────────────────
  /* Stable random ids, not array positions and not a counter that restarts
     with the page. An attempt keeps its id across a reload so an offline
     queue can retry the same write without creating a duplicate. */
  function uid(prefix) {
    var rnd;
    if (global.crypto && global.crypto.randomUUID) rnd = global.crypto.randomUUID();
    else if (global.crypto && global.crypto.getRandomValues) {
      var a = new Uint8Array(16);
      global.crypto.getRandomValues(a);
      rnd = Array.prototype.map.call(a, function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
    } else rnd = String(Date.now()) + Math.random().toString(16).slice(2);
    return prefix + "_" + rnd;
  }
  function now() { return new Date().toISOString(); }

  // ── open ───────────────────────────────────────────────────
  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error("IndexedDB is not available in this browser")); return; }
      var req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (ev) {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: "key" });
        if (!db.objectStoreNames.contains(STORES.classRuns)) db.createObjectStore(STORES.classRuns, { keyPath: "classRunId" });
        if (!db.objectStoreNames.contains(STORES.learners)) {
          var ls = db.createObjectStore(STORES.learners, { keyPath: "learnerId" });
          ls.createIndex("byClassRun", "classRunId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.attempts)) {
          var as = db.createObjectStore(STORES.attempts, { keyPath: "attemptId" });
          as.createIndex("byClassRun", "classRunId", { unique: false });
          as.createIndex("byLearner", "learnerId", { unique: false });
          as.createIndex("byWho", ["classRunId", "learnerId", "activityId"], { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.drafts)) {
          db.createObjectStore(STORES.drafts, { keyPath: ["classRunId", "learnerId", "activityId"] });
        }
        if (!db.objectStoreNames.contains(STORES.observations)) {
          var os = db.createObjectStore(STORES.observations, { keyPath: "observationId" });
          os.createIndex("byWho", ["classRunId", "learnerId", "activityId"], { unique: false });
        }
        ev.target.transaction.objectStore(STORES.meta)
          .put({ key: "schema", schemaVersion: SCHEMA_VERSION, createdAt: now() });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("could not open the classroom database")); };
      req.onblocked = function () { reject(new Error("classroom database upgrade blocked by another open tab")); };
    });
    return dbp;
  }

  /* Every write goes through a transaction and resolves only on its
     `complete` event, not on the request's `success`. A caller that awaits
     this and then tells the learner "Saved" is telling the truth: a quota
     failure or an aborted transaction rejects instead. */
  function tx(stores, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(stores, mode);
        var out;
        t.oncomplete = function () { resolve(out); };
        t.onerror = function () { reject(t.error || new Error("classroom store write failed")); };
        t.onabort = function () { reject(t.error || new Error("classroom store write aborted")); };
        try {
          out = fn(
            (Array.isArray(stores) ? stores : [stores]).reduce(function (acc, n) {
              acc[n] = t.objectStore(n); return acc;
            }, {}),
            t
          );
          if (out && typeof out.then === "function") {
            reject(new Error("transaction body must be synchronous"));
            try { t.abort(); } catch (_) {}
          }
        } catch (e) {
          reject(e);
          try { t.abort(); } catch (_) {}
        }
      });
    });
  }

  function reqp(r) {
    return new Promise(function (res, rej) {
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function readAll(storeName, indexName, key) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(storeName, "readonly");
        var src = indexName ? t.objectStore(storeName).index(indexName) : t.objectStore(storeName);
        var r = key === undefined ? src.getAll() : src.getAll(key);
        r.onsuccess = function () { resolve(r.result || []); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }
  function readOne(storeName, key) {
    return open().then(function (db) {
      return reqp(db.transaction(storeName, "readonly").objectStore(storeName).get(key));
    });
  }

  // ── class runs and learners ────────────────────────────────
  function createClassRun(o) {
    o = o || {};
    var rec = {
      classRunId: o.classRunId || uid("run"),
      schemaVersion: SCHEMA_VERSION,
      courseVersion: cfg.courseVersion,
      deckSha256: cfg.deckSha256,
      title: o.title || "Ventilator Academy class",
      classDate: o.classDate || now().slice(0, 10),
      timezone: o.timezone || "America/Chicago",
      instructor: o.instructor || null,
      createdAt: now(),
      updatedAt: now()
    };
    return tx(STORES.classRuns, "readwrite", function (s) {
      s[STORES.classRuns].put(rec); return rec;
    });
  }
  function listClassRuns() { return readAll(STORES.classRuns); }
  function getClassRun(id) { return readOne(STORES.classRuns, id); }

  /* Shared devices are the normal case in a classroom, so learners are
     explicit records rather than an implicit "whoever is using this browser". */
  function createLearner(classRunId, o) {
    o = o || {};
    var rec = {
      learnerId: o.learnerId || uid("lrn"),
      classRunId: classRunId,
      displayName: o.displayName || "Learner",
      email: o.email || null,
      identityVerified: false,   // a typed name is not a verified identity
      createdAt: now()
    };
    return tx(STORES.learners, "readwrite", function (s) {
      s[STORES.learners].put(rec); return rec;
    });
  }
  function listLearners(classRunId) { return readAll(STORES.learners, "byClassRun", classRunId); }

  // ── attempts ───────────────────────────────────────────────
  function attemptsFor(classRunId, learnerId, activityId) {
    return readAll(STORES.attempts, "byWho", [classRunId, learnerId, activityId])
      .then(function (list) {
        return list.sort(function (a, b) { return a.attemptNumber - b.attemptNumber; });
      });
  }

  /* Starting an attempt when a draft one already exists returns that draft
     rather than opening a second: a learner who reloads mid-quiz resumes the
     same attempt with the same answers, which is what the brief requires of
     an interrupted final. A new attempt is only created once the previous
     one has been submitted. */
  function startAttempt(o) {
    return attemptsFor(o.classRunId, o.learnerId, o.activityId).then(function (prior) {
      var draft = prior.filter(function (a) { return a.status === "draft"; })[0];
      if (draft) return draft;
      var rec = {
        attemptId: o.attemptId || uid("att"),
        schemaVersion: SCHEMA_VERSION,
        courseVersion: cfg.courseVersion,
        deckSha256: cfg.deckSha256,
        classRunId: o.classRunId,
        learnerId: o.learnerId,
        activityId: o.activityId,
        attemptNumber: prior.length + 1,
        status: "draft",
        // The items this attempt was opened against. An attempt is scored
        // against the questions it was actually shown, so later content
        // edits cannot silently re-score old work.
        itemIds: (o.itemIds || []).slice(),
        answers: {},
        createdAt: now(),
        updatedAt: now(),
        submittedAt: null,
        feedbackReleasedAt: null,
        score: null,
        syncStatus: "local"
      };
      return tx(STORES.attempts, "readwrite", function (s) {
        s[STORES.attempts].put(rec); return rec;
      });
    });
  }

  /* Saving a selection records it and nothing else. It does not mark the
     answer right or wrong, does not reveal a key, and does not submit: in
     the classroom the whole attempt is collected before any feedback. */
  function saveAnswer(attemptId, itemId, value) {
    return tx(STORES.attempts, "readwrite", function (s, t) {
      var st = s[STORES.attempts];
      var r = st.get(attemptId);
      r.onsuccess = function () {
        var rec = r.result;
        if (!rec) { t.abort(); return; }
        if (rec.status !== "draft") { t.abort(); return; }   // submitted work is immutable
        rec.answers[itemId] = value;
        rec.updatedAt = now();
        st.put(rec);
      };
      return true;
    }).then(function () {
      return readOne(STORES.attempts, attemptId);
    }, function (e) {
      return readOne(STORES.attempts, attemptId).then(function (rec) {
        if (rec && rec.status !== "draft") {
          throw new Error("attempt " + attemptId + " is already submitted and cannot be changed");
        }
        throw e;
      });
    });
  }

  function submitAttempt(attemptId, o) {
    o = o || {};
    return readOne(STORES.attempts, attemptId).then(function (rec) {
      if (!rec) throw new Error("no such attempt: " + attemptId);
      if (rec.status !== "draft") throw new Error("attempt " + attemptId + " has already been submitted");
      return tx(STORES.attempts, "readwrite", function (s) {
        rec.status = "submitted";
        rec.submittedAt = now();
        rec.updatedAt = rec.submittedAt;
        if (o.score !== undefined) rec.score = o.score;
        s[STORES.attempts].put(rec);
        return rec;
      });
    });
  }

  /* Feedback release is its own act, recorded separately from submission,
     because "answered" and "has seen the key" are different facts. Work
     arriving after a key was shown is a review attempt, not a fresh one. */
  function releaseFeedback(attemptId) {
    return readOne(STORES.attempts, attemptId).then(function (rec) {
      if (!rec) throw new Error("no such attempt: " + attemptId);
      if (rec.status !== "submitted") throw new Error("feedback cannot be released before submission");
      return tx(STORES.attempts, "readwrite", function (s) {
        rec.feedbackReleasedAt = now();
        rec.updatedAt = rec.feedbackReleasedAt;
        s[STORES.attempts].put(rec);
        return rec;
      });
    });
  }

  function getAttempt(id) { return readOne(STORES.attempts, id); }
  function listAttempts(classRunId) { return readAll(STORES.attempts, "byClassRun", classRunId); }

  // ── drafts (notes and unsubmitted free text) ───────────────
  function saveDraft(classRunId, learnerId, activityId, patch) {
    var key = [classRunId, learnerId, activityId];
    return readOne(STORES.drafts, key).then(function (prev) {
      var rec = prev || {
        classRunId: classRunId, learnerId: learnerId, activityId: activityId,
        schemaVersion: SCHEMA_VERSION, data: {}, createdAt: now()
      };
      rec.data = Object.assign({}, rec.data, patch || {});
      rec.updatedAt = now();
      return tx(STORES.drafts, "readwrite", function (s) {
        s[STORES.drafts].put(rec); return rec;
      });
    });
  }
  function getDraft(classRunId, learnerId, activityId) {
    return readOne(STORES.drafts, [classRunId, learnerId, activityId]);
  }

  /* Free text is saved on a trailing debounce so a long note is not a write
     per keystroke, and flush() forces it out before navigation. */
  function makeDebouncedDraftSaver(waitMs) {
    var timers = {};
    var pending = {};
    function keyOf(a, b, c) { return a + "\u0000" + b + "\u0000" + c; }
    function flushOne(k) {
      var p = pending[k];
      if (!p) return Promise.resolve(null);
      delete pending[k];
      if (timers[k]) { clearTimeout(timers[k]); delete timers[k]; }
      return saveDraft(p.classRunId, p.learnerId, p.activityId, p.patch);
    }
    return {
      queue: function (classRunId, learnerId, activityId, patch) {
        var k = keyOf(classRunId, learnerId, activityId);
        pending[k] = {
          classRunId: classRunId, learnerId: learnerId, activityId: activityId,
          patch: Object.assign({}, (pending[k] && pending[k].patch) || {}, patch)
        };
        if (timers[k]) clearTimeout(timers[k]);
        timers[k] = setTimeout(function () { flushOne(k); }, waitMs === undefined ? 600 : waitMs);
      },
      flush: function () {
        return Promise.all(Object.keys(pending).map(flushOne));
      },
      get pendingCount() { return Object.keys(pending).length; }
    };
  }

  // ── observations ───────────────────────────────────────────
  /* An observation is what an instructor watched happen. A learner may draft
     a reflection, but only an observer records a verified one, and a locally
     stored observation is not a server-verified record — `verified` stays
     false until a backend confirms it. */
  var OBSERVATION_STATUSES = ["independent", "prompted", "not-observed"];
  function recordObservation(o) {
    if (OBSERVATION_STATUSES.indexOf(o.status) < 0) {
      throw new Error("observation status must be one of: " + OBSERVATION_STATUSES.join(", "));
    }
    var rec = {
      observationId: o.observationId || uid("obs"),
      schemaVersion: SCHEMA_VERSION,
      courseVersion: cfg.courseVersion,
      classRunId: o.classRunId,
      learnerId: o.learnerId,
      activityId: o.activityId,
      criterionId: o.criterionId,
      status: o.status,
      attemptNumber: o.attemptNumber || 1,
      observerId: o.observerId || null,
      observerName: o.observerName || null,
      feedback: o.feedback || "",
      remainingAction: o.remainingAction || "",
      verified: false,
      recordedAt: now(),
      syncStatus: "local"
    };
    return tx(STORES.observations, "readwrite", function (s) {
      s[STORES.observations].put(rec); return rec;
    });
  }
  function listObservations(classRunId, learnerId, activityId) {
    if (learnerId === undefined) return readAll(STORES.observations);
    return readAll(STORES.observations, "byWho", [classRunId, learnerId, activityId]);
  }

  // ── export / import ────────────────────────────────────────
  function exportJSON(classRunId) {
    return Promise.all([
      getClassRun(classRunId), listLearners(classRunId),
      listAttempts(classRunId), listObservations()
    ]).then(function (r) {
      return {
        kind: "vta-classroom-export",
        schemaVersion: SCHEMA_VERSION,
        courseVersion: cfg.courseVersion,
        deckSha256: cfg.deckSha256,
        exportedAt: now(),
        classRun: r[0],
        learners: r[1],
        attempts: r[2],
        observations: r[3].filter(function (o) { return o.classRunId === classRunId; })
      };
    });
  }

  /* A value that starts with =, +, - or @ is executed as a formula when a
     CSV is opened in a spreadsheet. Learner-entered free text reaches this
     file, so every field is prefixed and quoted before it is written. */
  function csvCell(v) {
    var s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function exportCSV(classRunId) {
    return exportJSON(classRunId).then(function (d) {
      var byLearner = {};
      (d.learners || []).forEach(function (l) { byLearner[l.learnerId] = l; });
      var rows = [[
        "classRunId", "classDate", "learner", "learnerId", "activityId",
        "attemptNumber", "status", "score", "submittedAt", "feedbackReleasedAt", "answers"
      ]];
      (d.attempts || []).sort(function (a, b) {
        return (a.learnerId + a.activityId + a.attemptNumber)
          .localeCompare(b.learnerId + b.activityId + b.attemptNumber);
      }).forEach(function (a) {
        var l = byLearner[a.learnerId] || {};
        rows.push([
          a.classRunId, (d.classRun && d.classRun.classDate) || "", l.displayName || "", a.learnerId,
          a.activityId, a.attemptNumber, a.status, a.score === null ? "" : a.score,
          a.submittedAt || "", a.feedbackReleasedAt || "",
          Object.keys(a.answers || {}).sort().map(function (k) { return k + "=" + a.answers[k]; }).join(" ")
        ]);
      });
      return rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n") + "\r\n";
    });
  }

  /* Import refuses content from a different course version rather than
     merging records that were answered against different questions, and
     skips attempt ids that are already present so re-importing the same
     backup does not duplicate a learner's history. */
  function importJSON(payload, opts) {
    opts = opts || {};
    if (!payload || payload.kind !== "vta-classroom-export") {
      return Promise.reject(new Error("not a classroom export file"));
    }
    if (payload.schemaVersion !== SCHEMA_VERSION) {
      return Promise.reject(new Error(
        "export is schema v" + payload.schemaVersion + "; this app reads v" + SCHEMA_VERSION));
    }
    if (!opts.allowVersionMismatch && cfg.courseVersion &&
        payload.courseVersion && payload.courseVersion !== cfg.courseVersion) {
      return Promise.reject(new Error(
        "export is for course " + payload.courseVersion + "; this app is running " + cfg.courseVersion));
    }
    var summary = { classRuns: 0, learners: 0, attempts: 0, observations: 0, skipped: 0 };
    return listAttempts(payload.classRun && payload.classRun.classRunId).then(function (existing) {
      var have = {};
      existing.forEach(function (a) { have[a.attemptId] = true; });
      return tx([STORES.classRuns, STORES.learners, STORES.attempts, STORES.observations],
        "readwrite", function (s) {
          if (payload.classRun) { s[STORES.classRuns].put(payload.classRun); summary.classRuns++; }
          (payload.learners || []).forEach(function (l) { s[STORES.learners].put(l); summary.learners++; });
          (payload.attempts || []).forEach(function (a) {
            if (have[a.attemptId]) { summary.skipped++; return; }
            s[STORES.attempts].put(a); summary.attempts++;
          });
          (payload.observations || []).forEach(function (o) {
            s[STORES.observations].put(o); summary.observations++;
          });
          return summary;
        });
    });
  }

  // Wipes classroom records only. The self-paced course's localStorage state
  // is not touched, here or anywhere else in this file.
  function resetClassroomData() {
    return tx([STORES.classRuns, STORES.learners, STORES.attempts, STORES.drafts, STORES.observations],
      "readwrite", function (s) {
        Object.keys(s).forEach(function (n) { s[n].clear(); });
        return true;
      });
  }

  var api = {
    configure: configure,
    open: open,
    createClassRun: createClassRun, listClassRuns: listClassRuns, getClassRun: getClassRun,
    createLearner: createLearner, listLearners: listLearners,
    startAttempt: startAttempt, saveAnswer: saveAnswer, submitAttempt: submitAttempt,
    releaseFeedback: releaseFeedback, getAttempt: getAttempt,
    attemptsFor: attemptsFor, listAttempts: listAttempts,
    saveDraft: saveDraft, getDraft: getDraft, makeDebouncedDraftSaver: makeDebouncedDraftSaver,
    recordObservation: recordObservation, listObservations: listObservations,
    OBSERVATION_STATUSES: OBSERVATION_STATUSES,
    exportJSON: exportJSON, exportCSV: exportCSV, importJSON: importJSON,
    resetClassroomData: resetClassroomData,
    SCHEMA_VERSION: SCHEMA_VERSION,
    DB_NAME: DB_NAME,
    _uid: uid
  };

  global.ClassroomStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
