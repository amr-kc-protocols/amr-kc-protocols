/* Exercises amr-backend.js against a scripted fake Supabase.
   Focus: the failure paths — offline queueing, retry classification,
   token refresh, and outbox collapsing. */
import fs from "node:fs";
import assert from "node:assert";

const SRC = "/home/user/amr-kc-protocols/amr-backend.js";

let PASS = 0, FAIL = 0;
function check(name, fn) {
  return Promise.resolve().then(fn).then(
    () => { PASS++; console.log("  PASS  " + name); },
    (e) => { FAIL++; console.log("  FAIL  " + name + "\n        " + e.message); }
  );
}

function makeEnv(handler) {
  const store = new Map();
  const listeners = {};
  const win = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    navigator: { onLine: true },
    document: { hidden: false, addEventListener() {} },
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); },
    setInterval: () => 0,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (t) => clearTimeout(t),
  };
  win.AMR_BACKEND_CONFIG = { url: "https://test.supabase.co", anonKey: "anon-key-123" };
  const calls = [];
  win.fetch = async (url, opts) => {
    const path = url.replace("https://test.supabase.co", "");
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ path, method: opts.method, body, headers: opts.headers });
    return handler(path, opts, body, calls);
  };
  // Load the module into this fake window.
  const code = fs.readFileSync(SRC, "utf8");
  new Function("window", "fetch", "AbortController", "Promise", "Date", "Object", "Number",
    code.replace(/\}\)\(window\);\s*$/, "})(window);"))(
      win, win.fetch, AbortController, Promise, Date, Object, Number);
  return { win, calls, store, listeners };
}

function res(status, obj) {
  return { ok: status >= 200 && status < 300, status, text: async () => (obj ? JSON.stringify(obj) : "") };
}
const SESSION = {
  access_token: "jwt-abc", refresh_token: "refresh-abc", expires_in: 3600,
  user: { id: "user-uuid-1", is_anonymous: true, email: "" },
};

const ACADEMY_STATE = {
  learnerName: "Jane Medic, NRP",
  modules: { 1: { read: true, passed: true, best: 90 }, 2: { read: true, passed: false, best: 60 } },
  finalPassed: false, finalBest: 0, completedAt: null, courseVersion: "2.0",
};

console.log("\n=== amr-backend.js ===");

await check("signs in anonymously on first sync, then upserts", async () => {
  const { win, calls } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    if (path.startsWith("/rest/v1/academy_completions")) return res(201, null);
    throw new Error("unexpected " + path);
  });
  const r = await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  assert.equal(r.ok, true, "sync should succeed");
  assert.equal(calls[0].path, "/auth/v1/signup");
  assert.deepEqual(calls[0].body, { data: {}, gotrue_meta_security: {} });
  assert.match(calls[1].path, /on_conflict=user_id,course_id/);
  assert.equal(calls[1].headers["Prefer"], "resolution=merge-duplicates,return=minimal");
  assert.equal(calls[1].headers["Authorization"], "Bearer jwt-abc");
});

await check("stamps user_id from the session, not the caller", async () => {
  const { win, calls } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(201, null);
  });
  await win.AMRBackend.syncAcademy("airway", { ...ACADEMY_STATE, user_id: "spoofed" });
  assert.equal(calls[1].body.user_id, "user-uuid-1");
});

await check("derives modules_total and normalises module flags", async () => {
  const { win, calls } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(201, null);
  });
  await win.AMRBackend.syncAcademy("metabolic", ACADEMY_STATE);
  const b = calls[1].body;
  assert.equal(b.modules_total, 2);
  assert.deepEqual(b.modules["1"], { read: true, passed: true, best: 90 });
  assert.equal(b.course_version, "2.0");
  assert.equal(b.learner_name, "Jane Medic, NRP");
});

await check("network failure queues the write instead of losing it", async () => {
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    throw new Error("offline");
  });
  const r = await win.AMRBackend.syncAcademy("neonate", ACADEMY_STATE);
  assert.equal(r.queued, true, "should report queued");
  const box = JSON.parse(store.get("amr_backend_outbox_v1"));
  assert.equal(box.length, 1);
  assert.equal(box[0].key, "academy:neonate");
});

await check("repeat syncs of one course collapse to a single outbox entry", async () => {
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    throw new Error("offline");
  });
  await win.AMRBackend.syncAcademy("airway", ACADEMY_STATE);
  await win.AMRBackend.syncAcademy("airway", { ...ACADEMY_STATE, finalPassed: true, finalBest: 88 });
  await win.AMRBackend.syncAcademy("neonate", ACADEMY_STATE);
  const box = JSON.parse(store.get("amr_backend_outbox_v1"));
  assert.equal(box.length, 2, "airway collapses, neonate separate");
  const airway = box.find((i) => i.key === "academy:airway");
  assert.equal(airway.body.final_passed, true, "newest state wins");
  assert.equal(airway.body.final_best, 88);
});

await check("ask messages are NEVER collapsed", async () => {
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    throw new Error("offline");
  });
  await win.AMRBackend.submitAsk({ message: "First question about MAP targets" });
  await win.AMRBackend.submitAsk({ message: "Second and different question here" });
  const box = JSON.parse(store.get("amr_backend_outbox_v1"));
  assert.equal(box.length, 2, "both messages must survive");
});

await check("queued writes flush on reconnect", async () => {
  let online = false;
  const { win, store, listeners } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    if (!online) throw new Error("offline");
    return res(201, null);
  });
  await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  await win.AMRBackend.submitAsk({ message: "A question saved while offline" });
  assert.equal(JSON.parse(store.get("amr_backend_outbox_v1")).length, 2);

  online = true;
  await win.AMRBackend.flush();
  assert.equal(JSON.parse(store.get("amr_backend_outbox_v1")).length, 0, "outbox should drain");
  assert.ok(listeners["online"], "an online listener should be registered");
});

await check("a 400 is dropped, not retried forever", async () => {
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(400, { message: "violates check constraint" });
  });
  const r = await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  assert.equal(r.ok, false);
  assert.equal(r.dropped, true, "permanent failure should drop");
  assert.equal(store.get("amr_backend_outbox_v1"), undefined, "nothing queued");
});

await check("a 500 is queued for retry", async () => {
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(500, { message: "boom" });
  });
  const r = await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  assert.equal(r.queued, true);
  assert.equal(JSON.parse(store.get("amr_backend_outbox_v1")).length, 1);
});

await check("a 429 is queued, not dropped", async () => {
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(429, { message: "slow down" });
  });
  await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  assert.equal(JSON.parse(store.get("amr_backend_outbox_v1")).length, 1);
});

await check("expired token triggers refresh and a retry", async () => {
  let served401 = false;
  const { win, calls } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    if (path.startsWith("/auth/v1/token?grant_type=refresh_token"))
      return res(200, { ...SESSION, access_token: "jwt-fresh" });
    if (!served401) { served401 = true; return res(401, { message: "JWT expired" }); }
    return res(201, null);
  });
  const r = await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  assert.equal(r.ok, true, "should succeed after refresh");
  const refresh = calls.find((c) => c.path.includes("grant_type=refresh_token"));
  assert.ok(refresh, "a refresh should have been attempted");
  assert.deepEqual(refresh.body, { refresh_token: "refresh-abc" });
  const last = calls[calls.length - 1];
  assert.equal(last.headers["Authorization"], "Bearer jwt-fresh", "retry uses the new token");
});

await check("a dead refresh token re-signs-in rather than stranding the user", async () => {
  const { win, calls } = makeEnv(async (path) => {
    if (path.startsWith("/auth/v1/token?grant_type=refresh_token")) return res(400, { message: "invalid" });
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(201, null);
  });
  // Seed an expired session.
  win.localStorage.setItem("amr_backend_session_v1", JSON.stringify({
    access_token: "old", refresh_token: "dead", expires_at_ms: Date.now() - 1000, user_id: "old-user",
  }));
  const r = await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  assert.equal(r.ok, true);
  assert.ok(calls.some((c) => c.path === "/auth/v1/signup"), "should re-signup");
});

await check("a network blip during refresh keeps the identity", async () => {
  const { win, calls } = makeEnv(async (path) => {
    if (path.startsWith("/auth/v1/token?grant_type=refresh_token")) throw new Error("offline");
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(201, null);
  });
  win.localStorage.setItem("amr_backend_session_v1", JSON.stringify({
    access_token: "old", refresh_token: "still-good", expires_at_ms: Date.now() - 1000, user_id: "keep-me",
  }));
  await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  assert.ok(!calls.some((c) => c.path === "/auth/v1/signup"),
    "must NOT discard identity on a transient refresh failure");
  const stored = JSON.parse(win.localStorage.getItem("amr_backend_session_v1"));
  assert.equal(stored.user_id, "keep-me");
});

await check("short messages are rejected before hitting the network", async () => {
  const { win, calls } = makeEnv(async () => res(201, null));
  const r = await win.AMRBackend.submitAsk({ message: "hi" });
  assert.equal(r.ok, false);
  assert.equal(calls.length, 0, "should not call out");
});

await check("over-long messages are truncated to the column limit", async () => {
  const { win, calls } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(201, null);
  });
  await win.AMRBackend.submitAsk({ message: "x".repeat(5000) });
  assert.equal(calls[1].body.message.length, 1000);
});

await check("submitAsk reports rejection honestly", async () => {
  const { win } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(400, { message: "Too many messages sent in the last hour." });
  });
  const r = await win.AMRBackend.submitAsk({ message: "A perfectly fine question here" });
  assert.equal(r.ok, false);
  assert.match(r.error, /Too many messages/);
});

await check("unconfigured backend is a silent no-op", async () => {
  const code = fs.readFileSync(SRC, "utf8");
  const win = {
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener() {}, setInterval: () => 0, setTimeout, clearTimeout,
    navigator: { onLine: true }, document: { addEventListener() {} },
    fetch: () => { throw new Error("must not be called"); },
  };
  new Function("window", code)(win);
  assert.equal(win.AMRBackend.isConfigured(), false);
  const r = await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  assert.equal(r.skipped, true);
  assert.equal(win.AMRBackend.status().configured, false);
});

await check("outbox is capped so it cannot blow the storage quota", async () => {
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    throw new Error("offline");
  });
  for (let i = 0; i < 70; i++) {
    await win.AMRBackend.submitAsk({ message: "Question number " + i + " padded out" });
  }
  const box = JSON.parse(store.get("amr_backend_outbox_v1"));
  assert.ok(box.length <= 50, "outbox capped, got " + box.length);
  assert.match(box[box.length - 1].body.message, /69/, "newest retained");
});

await check("items are abandoned after MAX_ATTEMPTS", async () => {
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(500, { message: "still down" });
  });
  await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  for (let i = 0; i < 12; i++) await win.AMRBackend.flush();
  const box = JSON.parse(store.get("amr_backend_outbox_v1"));
  assert.equal(box.length, 0, "should give up rather than retry forever");
});

await check("a message queued DURING a flush is not erased by it", async () => {
  /* The academy push is made slow so it is still in flight when the Ask
     message is queued; without the re-read in flush(), the flush would
     write back its stale snapshot and the message would vanish. */
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    if (path.includes("academy_completions")) {
      await new Promise((r) => setTimeout(r, 200));
      throw new Error("offline");
    }
    throw new Error("offline"); // ask fails fast
  });

  await win.AMRBackend.syncAcademy("airway", ACADEMY_STATE); // lands in the outbox
  assert.equal(JSON.parse(store.get("amr_backend_outbox_v1")).length, 1);

  const flushing = win.AMRBackend.flush();          // picks up the academy item
  await new Promise((r) => setTimeout(r, 20));      // let the slow send start
  await win.AMRBackend.submitAsk({ message: "Typed while the flush was running" });
  await flushing;

  const paths = JSON.parse(store.get("amr_backend_outbox_v1")).map((i) => i.path);
  assert.ok(paths.some((p) => p.includes("ask_educator_messages")),
    "the message queued mid-flush must survive; outbox = " + JSON.stringify(paths));
  assert.ok(paths.some((p) => p.includes("academy_completions")),
    "the original item must also still be there");
});

await check("status() reports pending count", async () => {
  const { win } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    throw new Error("offline");
  });
  await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  const s = win.AMRBackend.status();
  assert.equal(s.pending, 1);
  assert.equal(s.configured, true);
  assert.equal(s.userId, "user-uuid-1");
});

await check("linkEmail PUTs to /auth/v1/user with the bearer token", async () => {
  const { win, calls } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    if (path === "/auth/v1/user") return res(200, { id: "user-uuid-1", email: "m@example.com" });
    return res(404, null);
  });
  const r = await win.AMRBackend.linkEmail("m@example.com");
  assert.equal(r.ok, true);
  const put = calls.find((c) => c.path === "/auth/v1/user");
  assert.equal(put.method, "PUT");
  assert.deepEqual(put.body, { email: "m@example.com" });
  assert.equal(put.headers["Authorization"], "Bearer jwt-abc");
});

await check("flush is a no-op while offline", async () => {
  const { win, calls, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    throw new Error("offline");
  });
  await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  const before = calls.length;
  win.navigator.onLine = false;
  await win.AMRBackend.flush();
  assert.equal(calls.length, before, "should not attempt while offline");
  assert.equal(JSON.parse(store.get("amr_backend_outbox_v1")).length, 1, "and must keep the item");
});

// ── educator API ─────────────────────────────────────────────
console.log("\n=== educator API ===");

const EDU_SESSION = {
  access_token: "jwt-edu", refresh_token: "refresh-edu", expires_in: 3600,
  user: { id: "edu-uuid", is_anonymous: false, email: "hunter@example.com" },
};

await check("password sign-in stores a session on its own key", async () => {
  const { win, calls, store } = makeEnv(async (path) => {
    if (path.startsWith("/auth/v1/token?grant_type=password")) return res(200, EDU_SESSION);
    return res(404, null);
  });
  const r = await win.AMRBackend.educator.signIn("hunter@example.com", "hunter2");
  assert.equal(r.ok, true);
  assert.deepEqual(calls[0].body, { email: "hunter@example.com", password: "hunter2" });
  assert.ok(store.get("amr_backend_educator_v1"), "educator session stored");
  assert.equal(store.get("amr_backend_session_v1"), undefined,
    "must NOT have touched the learner session key");
  assert.equal(win.AMRBackend.educator.status().email, "hunter@example.com");
});

await check("educator sign-in does not clobber an existing learner session", async () => {
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    if (path.startsWith("/auth/v1/token?grant_type=password")) return res(200, EDU_SESSION);
    return res(201, null);
  });
  // Learner uses an academy first, in this same browser.
  await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  const learnerBefore = JSON.parse(store.get("amr_backend_session_v1"));
  assert.equal(learnerBefore.user_id, "user-uuid-1");

  await win.AMRBackend.educator.signIn("hunter@example.com", "hunter2");
  const learnerAfter = JSON.parse(store.get("amr_backend_session_v1"));
  assert.equal(learnerAfter.user_id, "user-uuid-1",
    "the learner's anonymous identity must survive an educator login");
  assert.equal(win.AMRBackend.status().userId, "user-uuid-1");
  assert.equal(win.AMRBackend.educator.status().userId, "edu-uuid");
});

await check("educator sign-out leaves the learner session intact", async () => {
  const { win, store } = makeEnv(async (path) => {
    if (path === "/auth/v1/signup") return res(200, SESSION);
    if (path.startsWith("/auth/v1/token?grant_type=password")) return res(200, EDU_SESSION);
    if (path === "/auth/v1/logout") return res(204, null);
    return res(201, null);
  });
  await win.AMRBackend.syncAcademy("hemodynamics", ACADEMY_STATE);
  await win.AMRBackend.educator.signIn("hunter@example.com", "hunter2");
  await win.AMRBackend.educator.signOut();
  assert.equal(win.AMRBackend.educator.status().signedIn, false);
  assert.ok(store.get("amr_backend_session_v1"), "learner session must remain");
  assert.equal(win.AMRBackend.status().userId, "user-uuid-1");
});

await check("bad credentials give a clear message, not a crash", async () => {
  const { win } = makeEnv(async () => res(400, { error_description: "Invalid login credentials" }));
  const r = await win.AMRBackend.educator.signIn("hunter@example.com", "wrong");
  assert.equal(r.ok, false);
  assert.match(r.error, /Invalid login credentials/);
});

await check("an unreachable server is reported as such", async () => {
  const { win } = makeEnv(async () => { throw new Error("offline"); });
  const r = await win.AMRBackend.educator.signIn("hunter@example.com", "hunter2");
  assert.equal(r.ok, false);
  assert.match(r.error, /Could not reach the server/);
});

await check("listCompletions requests the right columns and ordering", async () => {
  const { win, calls } = makeEnv(async (path) => {
    if (path.startsWith("/auth/v1/token?grant_type=password")) return res(200, EDU_SESSION);
    if (path.startsWith("/rest/v1/academy_completions")) {
      return res(200, [{ course_id: "hemodynamics", learner_name: "Jane Medic, NRP" }]);
    }
    return res(404, null);
  });
  await win.AMRBackend.educator.signIn("hunter@example.com", "hunter2");
  const r = await win.AMRBackend.educator.listCompletions();
  assert.equal(r.ok, true);
  assert.equal(r.rows.length, 1);
  const q = calls.find((c) => c.path.startsWith("/rest/v1/academy_completions"));
  assert.match(q.path, /learner_email/, "the verified email is what makes a record identifiable");
  assert.match(q.path, /order=updated_at\.desc/);
  assert.equal(q.headers["Authorization"], "Bearer jwt-edu", "must use the educator token");
});

await check("the Ask inbox never requests the submitter's account email", async () => {
  const { win, calls } = makeEnv(async (path) => {
    if (path.startsWith("/auth/v1/token?grant_type=password")) return res(200, EDU_SESSION);
    if (path.startsWith("/rest/v1/ask_educator_messages")) return res(200, []);
    return res(404, null);
  });
  await win.AMRBackend.educator.signIn("hunter@example.com", "hunter2");
  await win.AMRBackend.educator.listAskMessages();
  const q = calls.find((c) => c.path.startsWith("/rest/v1/ask_educator_messages"));
  assert.match(q.path, /reply_email/, "the address they chose to type is fine");
  assert.ok(!/user_id/.test(q.path),
    "linking an email to save progress must not deanonymise their questions");
});

await check("a non-educator gets zero rows, not an error", async () => {
  // RLS returns an empty set rather than a failure for a signed-in
  // non-educator, and the dashboard must render that honestly.
  const { win } = makeEnv(async (path) => {
    if (path.startsWith("/auth/v1/token?grant_type=password")) return res(200, EDU_SESSION);
    return res(200, []);
  });
  await win.AMRBackend.educator.signIn("nobody@example.com", "pw");
  const r = await win.AMRBackend.educator.listCompletions();
  assert.equal(r.ok, true);
  assert.deepEqual(r.rows, []);
});

await check("reads before sign-in ask for sign-in rather than failing oddly", async () => {
  const { win, calls } = makeEnv(async () => res(200, []));
  const r = await win.AMRBackend.educator.listCompletions();
  assert.equal(r.ok, false);
  assert.equal(r.needsSignIn, true);
  assert.equal(calls.length, 0, "must not call out with no session");
});

await check("an expired educator session asks for re-login, never re-signs anonymously", async () => {
  const { win, calls, store } = makeEnv(async (path) => {
    if (path.startsWith("/auth/v1/token?grant_type=refresh_token")) return res(400, { message: "bad" });
    if (path === "/auth/v1/signup") return res(200, SESSION);
    return res(200, []);
  });
  store.set("amr_backend_educator_v1", JSON.stringify({
    access_token: "old", refresh_token: "dead", expires_at_ms: Date.now() - 1000,
    user_id: "edu-uuid", email: "hunter@example.com",
  }));
  const r = await win.AMRBackend.educator.listCompletions();
  assert.equal(r.needsSignIn, true, "should ask for a fresh sign-in");
  assert.ok(!calls.some((c) => c.path === "/auth/v1/signup"),
    "an educator whose session died must never silently become an anonymous user");
});

console.log(`\n${PASS} passed, ${FAIL} failed\n`);
process.exit(FAIL ? 1 : 0);
