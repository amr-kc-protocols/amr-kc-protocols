# Virtual Academy PWA — Multi-Module

A self-contained progressive web app that delivers the Ventilator Training Academy modules interactively. Each module includes short lessons, a knowledge check, a drag-and-drop exercise, and a branching clinical scenario. Progress is stored locally in the browser and works fully offline with no login. Where a course record system is configured, completions are also mirrored to it (see [`../supabase/README.md`](../supabase/README.md)); with none configured the course behaves exactly as before. Per-module progress tracks independently.

**Features**
- **Auto-save mid-progress.** Quiz answers, drag-and-drop placements, and scenario decisions persist to localStorage on every action. Close the browser mid-quiz and resume exactly where you left off.
- **Module locking.** Module N is locked until Module N−1 is fully completed (all lessons read, quiz passed at ≥ pass score, drag-and-drop perfect, scenario completed). Course Hub shows lock icons; clicking a locked card explains what's needed.
- **Resume from anywhere.** Hub cards show "Resume" when work is in progress, with the exact question/decision number you'll land on.

**All nine modules are included in this build:**

Day 1 — Foundations
- Module 1 — Pulmonary Anatomy & Physiology (45 min · 7 lessons, 10-question quiz, knob-matching, COPD scenario)
- Module 2 — Recognizing Respiratory Failure (45 min · 7 lessons, 10-question quiz, Type I vs Type II matching, asthma pre-arrest scenario)
- Module 3 — Indications for Ventilatory Support (40 min · 6 lessons, 10-question quiz, intervention matching, CHF pulmonary edema scenario)
- Module 4 — Ventilator Vocabulary & Initial Settings (50 min · 6 lessons, 10-question quiz, set-vs-monitored matching, PBW correction scenario)
- Module 5 — Modes of Ventilation (60 min · 6 lessons, 10-question quiz, mode-selection matching, inherited PRVC scenario)

Day 2 — Application
- Module 6 — LTV 1200 Platform Tour (50 min · 6 lessons, 10-question quiz, front-panel matching, pre-shift walkaround scenario)
- Module 7 — Alarms & Troubleshooting / DOPE (55 min · 7 lessons, 10-question quiz, DOPE-letter sorting, tension PTX scenario)
- Module 8 — Sedation & Analgesia (40 min · 5 lessons, 10-question quiz, agent-selection matching, septic shock RSI scenario)
- Module 9 — Special Populations (60 min · 6 lessons, 10-question quiz, population-strategy matching, TBI herniation scenario)

The Course Hub renders all nine modules with strict sequential locking: Module N is locked until Module N−1 is fully completed.

---

## What's in this folder

```
Virtual_Academy_PWA/
├── index.html          ← app shell
├── styles.css          ← visual styling
├── app.js              ← all content + interaction logic
├── manifest.json       ← PWA install metadata
├── sw.js               ← service worker (offline cache)
├── icons/
│   ├── icon.svg        ← vector icon
│   ├── icon-192.png    ← Android home-screen icon
│   ├── icon-512.png    ← splash screen / larger icon
│   └── icon-maskable.png ← Android adaptive icon
└── README.md           ← this file
```

Total size on disk: ~80 KB. Loads instantly. Works offline after first visit.

---

## How students use it

1. Open the link (you'll pin it in the Teams channel — see below).
2. Browser opens to the Hub. Four cards: Lessons, Knowledge Check, Match the Knobs, Scenario.
3. Work through them in order. Each one tracks progress automatically.
4. On Android or iOS, students can install the PWA to their home screen via the browser's "Add to Home Screen" option. After that it opens like a native app and works offline.

The reset button at the bottom of the footer clears local progress if a student wants to retake the whole module from scratch.

---

## Deployment options

Pick the option that matches your IT setup.

### Option A — SharePoint site within Teams (recommended)

1. In your Teams channel, click the Files tab → Open in SharePoint.
2. Create a folder called `VTA-Module-1`.
3. Upload all files from this `Virtual_Academy_PWA` folder, preserving the `icons/` subfolder.
4. Right-click `index.html` → Copy link. Use the "anyone in your organization with the link" sharing scope.
5. Paste that link into the Teams channel (or pin it as a tab).

Pros: zero infrastructure, lives inside Microsoft 365, single sign-on via the org. Cons: service-worker offline mode is limited because SharePoint serves URLs with query strings.

### Option B — GitHub Pages or Netlify

1. Push this folder to a public or private GitHub repo.
2. In repo settings, enable GitHub Pages on the `main` branch root.
3. GitHub gives you a URL like `https://<user>.github.io/<repo>/`.
4. Paste that URL into the Teams channel.

Pros: full PWA capability including offline install, fast, free. Cons: requires GitHub knowledge.

### Option C — Azure Static Web Apps

1. In the Azure Portal, create a Static Web App, point it at this folder.
2. Use the generated URL.

Pros: integrated with Microsoft 365, supports custom domain, free tier sufficient for a course. Cons: small Azure setup learning curve.

### Option D — Local network / school server

Place the folder on any web server (Apache, IIS, nginx). Open `http://<server>/Virtual_Academy_PWA/index.html`. PWA install works on HTTPS only — make sure the server has a valid certificate.

---

## Pinning to a Microsoft Teams channel

1. In your Teams channel, click the `+` next to the existing tabs.
2. Choose **Website** as the tab type.
3. Tab name: `Virtual Module 1`.
4. URL: the link from your deployment above.
5. Click Save.

Students will see the PWA inside Teams, no separate browser required.

Optional polish: add a channel post pinned at the top with:
- "📚 Open Virtual Module 1" (with the link)
- Estimated time (~45 minutes)
- A note that progress is saved automatically and synced to the browser they used

---

## Tracking student progress

**With a course record system configured** (see [`../supabase/README.md`](../supabase/README.md)),
completions appear in `educator-dashboard.html` alongside the other four academies:
modules passed, final score, credential, and certificate id. Learners who link an
email get a verified identity against their record; those who do not are shown as
**"not linked"**, so a self-typed name is never mistaken for a confirmed one.

**With none configured**, progress lives only in the learner's browser. Two options
if you need to verify completion:

1. **Honor system + screenshot** — Ask students to screenshot the Summary view (all four checkmarks) and post in the channel.
2. **Manual quiz** — Distribute the Final Exam document (in folder 5 of the main course package) at the end of the module. The PWA quiz is for practice; the docx final exam is the official record.

Either way the certificate is a record of *completion*, not a proctored
assessment — the disclaimer on it says so.

---

## Customizing

The content lives entirely in `app.js` inside the `MODULES` array. Each module is a self-contained object with `lessons`, `quiz`, `match`, and `scenario` properties. To edit lesson text, quiz questions, drag-and-drop items, or scenario choices, edit `app.js` directly. No build step required — refresh the browser and you'll see the changes.

To add a Module 10, copy any existing module object inside the `MODULES` array, change `id` to 10, edit the content, and deploy. The hub, locking, and progress tracking all pick it up automatically.

---

## Troubleshooting

- **PWA doesn't install on iOS.** Add to Home Screen works on Safari but not on third-party browsers (Chrome on iOS, etc.). Use Safari.
- **Service worker not registering on SharePoint.** SharePoint serves URLs with anti-cache query strings that confuse service workers. The app still works fully online; offline install just won't be available on SharePoint hosting. Use Option B or C for full offline support.
- **Student lost their progress.** Progress is keyed to the browser. If they cleared site data, switched browsers, or used incognito mode, progress will not persist. Have them retake or rely on the docx final exam.
