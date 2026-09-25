/* Ventilator Training Academy — classroom content layer
   ------------------------------------------------------
   Loads the versioned classroom map and the learner question payload, and
   answers the two questions the classroom UI keeps asking:

     "the instructor just said slide 97 — what is that?"      resolveSlide()
     "what comes next in this module?"                        moduleOrder()

   This file holds no answer keys. The keys, rationales and slide notes live
   in the instructor reference, which is loaded only by the teaching
   workspace, so the learner bundle never carries them.

   Deliberately read-only: nothing here records an attempt or marks anything
   complete. Looking up a slide must never submit or release anything.       */

(function (global) {
  "use strict";

  var BASE = "content/";
  var MAP_URL = BASE + "classroom-map.json";
  var QUESTIONS_URL = BASE + "classroom-questions.json";

  var state = { loaded: false, map: null, questions: null, index: null };

  // ── loading ────────────────────────────────────────────────
  function fetchJSON(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("could not load " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  /* The map and the question payload are versioned together and are only
     valid as a pair: question `slide` numbers are positions in the same deck
     the map describes. Mixing a new question file with an old map is the
     failure mode that puts a learner on the wrong question mid-class, so it
     is refused here rather than discovered later. */
  function verifyPair(map, questions) {
    if (map.courseVersion !== questions.courseVersion) {
      throw new Error(
        "classroom content mismatch: map is " + map.courseVersion +
        " but questions are " + questions.courseVersion
      );
    }
    if (map.deck.sha256 !== questions.deck.sha256) {
      throw new Error("classroom content mismatch: map and questions describe different decks");
    }
    return true;
  }

  function load(opts) {
    opts = opts || {};
    if (state.loaded && !opts.force) return Promise.resolve(api);
    var mapUrl = opts.mapUrl || MAP_URL;
    var qUrl = opts.questionsUrl || QUESTIONS_URL;
    return Promise.all([fetchJSON(mapUrl), fetchJSON(qUrl)]).then(function (both) {
      return adopt(both[0], both[1]);
    });
  }

  // Take already-parsed content. Used by load(), and by tests that supply
  // the JSON directly rather than over the network.
  function adopt(map, questions) {
    verifyPair(map, questions);
    state.map = map;
    state.questions = questions;
    state.index = buildIndex(map, questions);
    state.loaded = true;
    return api;
  }

  // ── index ──────────────────────────────────────────────────
  function buildIndex(map, questions) {
    var ix = {
      activityById: {},
      questionById: {},
      questionsByAssessment: {},
      slideMeta: {},
      calcByPromptSlide: {},
      calcByFeedbackSlide: {},
      moduleById: {}
    };

    map.activities.forEach(function (a) { ix.activityById[a.id] = a; });
    // Lessons are listed inside their module as well as in activities[];
    // index them by both keys so a lesson id from the self-paced course and
    // a classroom activity id both resolve.
    map.modules.forEach(function (m) {
      ix.moduleById[m.id] = m;
      (m.lessons || []).forEach(function (l) {
        if (!ix.activityById[l.id]) ix.activityById[l.id] = l;
      });
    });

    questions.questions.forEach(function (q) {
      ix.questionById[q.id] = q;
      (ix.questionsByAssessment[q.assessmentId] ||
        (ix.questionsByAssessment[q.assessmentId] = [])).push(q);
    });
    Object.keys(ix.questionsByAssessment).forEach(function (k) {
      ix.questionsByAssessment[k].sort(function (a, b) { return a.number - b.number; });
    });

    (map.slides || []).forEach(function (s) { ix.slideMeta[s.slide] = s; });
    (map.calculationSlideOverrides || []).forEach(function (c) {
      ix.calcByPromptSlide[c.promptSlide] = c;
      ix.calcByFeedbackSlide[c.feedbackSlide] = c;
    });
    return ix;
  }

  function need() {
    if (!state.loaded) throw new Error("classroom content not loaded yet — call load() first");
    return state;
  }

  // ── slide resolution ───────────────────────────────────────
  /* Precedence is fixed by the classroom brief, and the order matters because
     the ranges genuinely overlap: a calculation prompt sits on a slide that
     also belongs to its parent lesson, and a quiz question sits on a slide
     that also belongs to the quiz block. Most specific wins:

       1. a calculation prompt/feedback slide
       2. an individual assessment question
       3. a recall prompt/feedback slide
       4. the parent lesson or activity

     `phase` says which side of a prompt/feedback pair the slide is, so the
     caller can show the prompt without showing the answer. Resolving a slide
     never releases feedback — that is a separate, explicit instructor act. */
  function resolveSlide(n) {
    var s = need();
    n = Number(n);
    if (!isFinite(n) || n < 1 || n > s.map.deck.slideCount) return null;
    var ix = s.index;
    var meta = ix.slideMeta[n] || null;

    // 1 — calculation override
    var calc = ix.calcByPromptSlide[n];
    if (calc) return hit(calc.id, "calculation", "prompt", calc.parentLessonId, n, meta, calc);
    calc = ix.calcByFeedbackSlide[n];
    if (calc) return hit(calc.id, "calculation", "feedback", calc.parentLessonId, n, meta, calc);

    // 2 — individual assessment question(s). Knowledge-check slides carry two.
    var qs = s.questions.questions.filter(function (q) { return q.slide === n; });
    if (qs.length) {
      var r = hit(qs[0].assessmentId, "question", "prompt", null, n, meta, null);
      r.questionIds = qs.map(function (q) { return q.id; });
      return r;
    }

    // 3 — recall prompt / feedback pair
    var rec = s.map.activities.filter(function (a) { return a.kind === "recall"; });
    for (var i = 0; i < rec.length; i++) {
      if (rec[i].promptSlide === n) return hit(rec[i].id, "recall", "prompt", null, n, meta, rec[i]);
      if (rec[i].feedbackSlide === n) return hit(rec[i].id, "recall", "feedback", null, n, meta, rec[i]);
    }

    // 4 — parent lesson or activity. Several activities can contain a slide
    // (a lesson and the module block around it); the narrowest span wins.
    var containing = s.map.activities.filter(function (a) {
      return (a.slides || []).indexOf(n) >= 0;
    });
    if (!containing.length) return meta ? hit(null, "slide", "main", null, n, meta, null) : null;
    containing.sort(function (a, b) { return (a.slides || []).length - (b.slides || []).length; });
    var a0 = containing[0];
    return hit(a0.id, a0.kind, "main", a0.lessonId || null, n, meta, a0);
  }

  function hit(activityId, kind, phase, lessonId, slide, meta, activity) {
    return {
      slide: slide,
      activityId: activityId,
      kind: kind,
      phase: phase,               // "prompt" | "feedback" | "main"
      lessonId: lessonId,
      moduleId: (activity && activity.moduleId) || (meta && meta.moduleId) || null,
      title: (activity && activity.title) || (meta && meta.title) || null,
      activity: activity || null,
      slideMeta: meta
    };
  }

  // ── lookups ────────────────────────────────────────────────
  function activityById(id) { return need().index.activityById[id] || null; }
  function questionById(id) { return need().index.questionById[id] || null; }

  /* Questions in the order the deck projects them. The classroom final and
     the module checks are both fixed sets in fixed order — no shuffling, no
     drawing from a pool — so this returns the same list every time. */
  function questionsFor(assessmentId) {
    var list = need().index.questionsByAssessment[assessmentId];
    return list ? list.slice() : [];
  }

  /* A module's activities in the order they are taught, which is not the
     order the self-paced course uses. `inClassOrder` names the kinds; expand
     it to the actual activities, keeping lessons in slide order. */
  function moduleOrder(moduleId) {
    var s = need();
    var mod = s.index.moduleById[moduleId];
    if (!mod) return [];
    var mine = s.map.activities.filter(function (a) { return a.moduleId === moduleId; });
    var out = [];
    (mod.inClassOrder || []).forEach(function (kind) {
      mine.filter(function (a) { return a.kind === kind; })
        .sort(function (a, b) { return (a.slides[0] || 0) - (b.slides[0] || 0); })
        .forEach(function (a) { if (out.indexOf(a) < 0) out.push(a); });
    });
    // Anything the declared order did not name still belongs to the module.
    mine.sort(function (a, b) { return (a.slides[0] || 0) - (b.slides[0] || 0); })
      .forEach(function (a) { if (out.indexOf(a) < 0) out.push(a); });
    return out;
  }

  /* The whole class, start to finish, as a flat ordered list: the opening,
     each module's activities in teaching order, the final, the close, and the
     follow-ups (which sit outside class time and are marked as such). */
  function outline() {
    var s = need();
    var out = [];
    var byStart = function (a, b) { return (a.startMinute || 0) - (b.startMinute || 0); };
    s.map.activities.filter(function (a) { return a.kind === "opening"; }).forEach(function (a) { out.push(a); });
    s.map.modules.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (m) {
      moduleOrder(m.id).forEach(function (a) { out.push(a); });
    });
    s.map.activities.filter(function (a) {
      return ["final", "closing", "follow-up"].indexOf(a.kind) >= 0;
    }).sort(byStart).forEach(function (a) { out.push(a); });
    return out;
  }

  // Where an activity sits in the class, for "next up" and resume.
  function nextAfter(activityId) {
    var o = outline();
    for (var i = 0; i < o.length; i++) {
      if (o[i].id === activityId) return o[i + 1] || null;
    }
    return null;
  }

  var api = {
    load: load,
    adopt: adopt,
    resolveSlide: resolveSlide,
    activityById: activityById,
    questionById: questionById,
    questionsFor: questionsFor,
    moduleOrder: moduleOrder,
    outline: outline,
    nextAfter: nextAfter,
    get loaded() { return state.loaded; },
    get courseVersion() { return state.map ? state.map.courseVersion : null; },
    get deckSha256() { return state.map ? state.map.deck.sha256 : null; },
    get slideCount() { return state.map ? state.map.deck.slideCount : 0; },
    get modules() { return state.map ? state.map.modules : []; },
    get activities() { return state.map ? state.map.activities : []; },
    get map() { return state.map; }
  };

  global.ClassroomContent = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
