// =====================================================================
// Ventilator Training Academy — Virtual Academy PWA (multi-module)
// Static · no backend · per-module progress in localStorage
// =====================================================================

"use strict";

// ---------- 1. CONTENT: ALL MODULES ----------

const MODULES = [

// =====================================================================
// MODULE 1 — Pulmonary Anatomy & Physiology
// =====================================================================
{
  id: 1,
  title: "Pulmonary Anatomy & Physiology",
  blurb: "The foundational hour. Learn how a healthy breath works — then use that to read every vent for the rest of the course.",
  estMin: 45,

  lessons: [
    {
      id: "path",
      kicker: "1.1 · Anatomy",
      title: "The Path of a Breath",
      body: [
        "A breath begins at the nose or mouth and travels through the pharynx, larynx, and trachea. The adult trachea is approximately 12 centimeters long and ends at the carina, the bifurcation roughly at the level of the fourth thoracic vertebra.",
        "From the carina, air enters the right and left mainstem bronchi — but the fork is lopsided, like a highway splitting into two ramps. The right ramp barely curves (about 25° from vertical), almost a straight continuation of the road; the left banks hard (about 45°). Push an ETT too deep and it takes the path of least resistance straight down the right ramp, leaving the left lung dark and silent. That asymmetry is exactly why an over-deep tube is almost always a right-mainstem tube — and why you listen over the LEFT chest first when breath sounds go one-sided.",
        "Confirm ETT depth at the lip — approximately 21 cm in women, 23 cm in men — and verify with equal bilateral breath sounds and a normal capnography waveform.",
        "Beyond the mainstem bronchi, the airway branches through approximately 23 generations to reach the alveoli. There are approximately 300 million alveoli per adult, with a combined surface area of roughly 70 square meters — about the size of a tennis court."
      ],
      pearl: { title: "ETT depth at the lip", body: "21 cm in women, 23 cm in men. Confirm with capnography and equal breath sounds after every patient transition — loading, lifting, elevator, gurney bump." }
    },
    {
      id: "zones",
      kicker: "1.2 · Function",
      title: "Two Functional Zones",
      body: [
        "The pulmonary system has two zones. The conducting zone is everything from the mouth to the terminal bronchioles. It moves air. No gas exchange occurs here. The volume that fills it on each breath is anatomic dead space — approximately 2 mL per kilogram of body weight, or about 150 mL in a 70 kg adult.",
        "The respiratory zone is where gas exchange happens. Type I pneumocytes form the thin alveolar wall (0.2–0.5 µm thick — about 1/100 the diameter of a red blood cell). Type II pneumocytes produce surfactant.",
        "Picture two soap bubbles tied to the ends of a straw, one small and one large. By Laplace's law the small bubble has the higher pressure, so it empties itself into the big one and collapses. Alveoli would do the same to each other on every exhale — except for surfactant, the dish soap Type II cells make to lower that surface tension so the smallest alveoli survive instead of caving into their neighbors. ARDS, smoke inhalation, drowning, and gastric aspiration all damage Type II cells or wash the soap out.",
        "When the soap is gone, PEEP is your bedside replacement: it is the doorstop you wedge under each alveolus, splinting it open mechanically until surfactant function returns."
      ],
      evidence: { title: "Surfactant and PEEP", body: "Conditions that damage Type II pneumocytes produce a stiff lung with refractory hypoxia. The bedside fix is PEEP — not more FiO₂." }
    },
    {
      id: "two-knobs",
      kicker: "1.3 · The Mental Model",
      title: "Ventilation vs Oxygenation — Two Knobs Each",
      body: [
        "This is the single most useful mental model in mechanical ventilation — memorize it now. Picture the lung as a house with two completely separate chores, each with its own set of controls. Confusing the two is the most common ventilator mistake there is.",
        "Ventilation is taking out the trash — clearing CO₂. You run it with two knobs: Respiratory Rate (RR) and Tidal Volume (Vt) — how often the trash goes out and how big each load is. Their product is Minute Ventilation. PaCO₂ too high? Turn one up. Too low? Turn one down.",
        "Oxygenation is bringing in the groceries — loading O₂ across the alveolar membrane into the blood. It runs on two different knobs: FiO₂ (how oxygen-rich the incoming air is) and PEEP (the pressure that holds alveoli open at end-expiration). SpO₂ too low? Raise FiO₂ first, then PEEP if you suspect shunt physiology. Running the trash out more often will never restock the fridge.",
        "Most ventilator errors are turning the wrong knob — bumping FiO₂ to fix a rising CO₂, or cranking the rate to fix a low saturation. Pair them in your head: RR + Vt for ventilation, FiO₂ + PEEP for oxygenation. Trash and groceries — two chores, two sets of knobs."
      ],
      pearl: { title: "Two knobs each", body: "Ventilation = RR + Vt. Oxygenation = FiO₂ + PEEP. On the final exam. At every bedside for the rest of your career." }
    },
    {
      id: "dead-space",
      kicker: "1.4 · Dead Space",
      title: "Air That Doesn't Help You",
      body: [
        "Every breath is like mailing a package down a long hallway to a room at the far end. The hallway holds air but does no gas exchange — anything that never reaches the room is wasted effort. That wasted volume is dead space: the part of every breath that does not participate in gas exchange. It comes in three kinds.",
        "Anatomic dead space is the volume of the conducting airways: approximately 2 mL per kilogram of body weight. Alveolar dead space is the volume of alveoli that are ventilated but not perfused — for example, downstream of a pulmonary embolism. Equipment dead space is the volume of the vent circuit between the ETT tip and the Y-piece — up to 80 to 90 mL on an adult circuit.",
        "Total physiologic dead space is normally about 30% of tidal volume in a healthy adult. A study by Nuckton and colleagues (NEJM 2002) showed that VD/VT greater than 0.6 in ARDS strongly predicts mortality.",
        "The practical bedside implication: tidal volume must be large enough to overcome dead space. Set Vt too low and the whole breath gets stuck in the hallway — dead space eats it before any reaches the room. Aim for 6–8 mL per kg of ideal body weight in most adults; 4–6 mL/kg IBW in ARDS."
      ]
    },
    {
      id: "vq",
      kicker: "1.5 · V/Q Matching",
      title: "Shunt vs Dead Space",
      body: [
        "Picture a bus line where the buses are air and the passengers are blood. Gas exchange only happens where a bus and its passengers actually meet. That match-up is V/Q, and disease breaks it in one of two opposite directions.",
        "Shunt is passengers crowding a stop the bus skips entirely — perfusion with no ventilation, V/Q approaching zero. Pneumonia, pulmonary edema, ARDS, and atelectasis all produce shunt. The hallmark is refractory hypoxia: you can send more buses (crank FiO₂ to 100%) but they keep driving past the skipped stop, so saturation barely moves. The bedside fix is PEEP, which re-opens the stop — recruiting collapsed alveoli so the bus can finally pick those passengers up.",
        "Dead space is the mirror image: a bus running its full route past empty stops — ventilation with no perfusion. Pulmonary embolism, low cardiac output, and severe hypovolemia produce dead-space physiology. The hallmark is a widening gap between PaCO₂ and EtCO₂: those empty-stop alveoli exhale air carrying almost no CO₂. The fix is getting passengers back to the stops — improving perfusion with fluids, pressors, or treating the embolism.",
        "Hypoxic Pulmonary Vasoconstriction (HPV) is a partial auto-correction: the lung constricts arterioles in poorly ventilated regions, diverting blood toward better-ventilated alveoli. HPV is incomplete; in significant disease, it is not enough."
      ],
      pearl: { title: "FiO₂ alone won't fix shunt", body: "If a patient on a non-rebreather at flush rate is still hypoxic, suspect shunt. The bedside fix is PEEP, often via CPAP." }
    },
    {
      id: "comp-res",
      kicker: "1.6 · Compliance vs Resistance",
      title: "How the Lung Pushes Back",
      body: [
        "Imagine blowing up a balloon through a straw — two completely separate things can make it hard. The first is the balloon's stiffness. That is compliance: how much volume the lung accepts for a given pressure. A brand-new, stiff balloon (the ARDS lung) fights every breath; a worn-in one gives easily. Normal adult static compliance is 60–100 mL per cmH₂O; ARDS can drop it to 20–30 — a very stiff balloon.",
        "The second is the straw's narrowness. That is resistance: how hard the airway pushes back against airflow. Pinch the straw — bronchospasm, a mucus plug, a kinked tube — and you must push far harder for the same airflow. Normal airway resistance is 1–2 cmH₂O per liter per second; severe asthma can push it to 15–20.",
        "Both can raise PIP on the ventilator — but only reduced compliance raises Pplat. That distinction is the foundation of bedside troubleshooting and the subject of the next lesson."
      ]
    },
    {
      id: "pip-pplat",
      kicker: "1.7 · The Bedside Test",
      title: "PIP vs Pplat",
      body: [
        "Picture pushing water through a hose that has a narrow nozzle (the airways) and a balloon on the end (the alveoli). Peak Inspiratory Pressure (PIP) is the pressure while water is still flowing — it includes the squeeze through the nozzle. Hit the inspiratory hold (about 0.5 seconds, no flow) and you feel only the balloon's stretch: that is Plateau Pressure (Pplat), which reflects alveolar pressure — a measure of compliance.",
        "The relationship is mechanical: PIP is approximately Pplat plus (Resistance × Flow). Clog the nozzle and resistance rises — PIP climbs but Pplat does not. Stiffen the balloon and both rise together.",
        "Bedside interpretation: High PIP + normal Pplat means an AIRWAY problem (resistance) — mucus plug, biting on the tube, bronchospasm, kinked tube. High PIP + high Pplat means a LUNG problem (compliance) — pneumothorax, mainstem migration, worsening ARDS, pulmonary edema.",
        "Driving pressure (Pplat minus PEEP) has emerged as a strong mortality predictor in ARDS (Amato 2015, NEJM). Aim for ΔP less than 14 cmH₂O. You'll use this rule in Module 4 and again in Module 9."
      ],
      pearl: { title: "PIP up, Pplat up?", body: "Both up = lung problem. PIP up but Pplat normal = airway problem. The bedside test takes 3 seconds — press the inspiratory hold button." }
    }
  ],

  quiz: {
    title: "Module 1 Knowledge Check",
    intro: "Ten questions covering the chapter. Answers and rationale appear after you submit each one.",
    passScore: 8,
    questions: [
      { q: "Anatomic dead space in a healthy 70 kg adult is approximately:",
        choices: ["150 mL", "50 mL", "350 mL", "500 mL"], answer: 0,
        rationale: "Anatomic dead space is approximately 2 mL/kg, or about 150 mL in a 70 kg adult." },
      { q: "Which combination of ventilator settings controls VENTILATION (CO₂ elimination)?",
        choices: ["Respiratory rate and tidal volume", "FiO₂ and PEEP", "PEEP and I:E ratio", "PIP and Pplat"], answer: 0,
        rationale: "Minute ventilation = RR × Vt. Oxygenation is the other pair — FiO₂ and PEEP." },
      { q: "A vented patient's PIP rises from 22 to 38 cmH₂O. Pplat (measured on inspiratory hold) reads 24 cmH₂O. The MOST likely cause is:",
        choices: ["Worsening ARDS", "Tension pneumothorax", "Auto-PEEP from breath stacking", "Mucus plug or bronchospasm"], answer: 3,
        rationale: "PIP up + Pplat normal = airway resistance problem. ARDS and tension PTX would both raise Pplat as well." },
      { q: "A pneumonia patient has SpO₂ 84% on a non-rebreather at 15 L/min and shows little improvement when FiO₂ is increased. The MOST likely physiologic mechanism is:",
        choices: ["Dead-space ventilation", "Intrapulmonary shunt", "Pure diffusion impairment", "Hyperventilation"], answer: 1,
        rationale: "Refractory hypoxia despite high FiO₂ points to shunt physiology — blood traversing non-ventilated alveoli. The bedside fix is PEEP (CPAP in this case), not more oxygen." },
      { q: "Type II pneumocytes are responsible for:",
        choices: ["Forming the thin alveolar wall", "Lining the trachea", "Producing surfactant", "Filtering inhaled particles"], answer: 2,
        rationale: "Type II pneumocytes produce surfactant, which lowers surface tension and prevents alveolar collapse. Type I cells form the thin wall." },
      { q: "Right mainstem branches off the trachea at approximately what angle from the vertical?",
        choices: ["10 degrees", "25 degrees", "45 degrees", "60 degrees"], answer: 1,
        rationale: "Right mainstem ≈ 25 degrees; left mainstem ≈ 45 degrees. This is why ETTs slide preferentially into the right mainstem when advanced too deep." },
      { q: "Driving pressure (ΔP), the modern ARDS target, is defined as:",
        choices: ["PIP – Pplat", "Pplat – PEEP", "PIP – PEEP", "Pplat + PEEP"], answer: 1,
        rationale: "Driving pressure = Pplat – PEEP. Amato et al. (NEJM 2015) showed ΔP > 14 cmH₂O strongly predicts ARDS mortality. Each 7 cmH₂O rise increases mortality by ~40%." },
      { q: "PEEP is most useful at the bedside as a treatment for:",
        choices: ["High CO₂", "Bronchospasm", "Refractory hypoxia from shunt physiology", "Auto-PEEP"], answer: 2,
        rationale: "PEEP recruits collapsed or fluid-filled alveoli, reducing shunt fraction. It does not directly affect ventilation (CO₂ clearance) and is not a treatment for bronchospasm." },
      { q: "A patient is intubated for COPD exacerbation with hypercapnia. EtCO₂ trends from 60 to 75 mmHg over five minutes despite no setting change. What does this suggest?",
        choices: ["Improving lung function", "Worsening ventilation / patient fatigue", "Excessive sedation", "Auto-PEEP only"], answer: 1,
        rationale: "A rising EtCO₂ trend means the patient is moving less air relative to CO₂ production. In a Type II failure picture, this is a fatigue signal — escalate." },
      { q: "ARDSNet (NEJM 2000) demonstrated that ventilation at 6 mL/kg of ideal body weight compared to 12 mL/kg reduced mortality from approximately:",
        choices: ["60% to 50%", "20% to 15%", "There was no difference", "40% to 31%"], answer: 3,
        rationale: "The ARMA trial showed mortality 39.8% (12 mL/kg) vs 31.0% (6 mL/kg) — absolute reduction 8.8%, NNT 11 lives saved. One of the most evidence-based interventions in critical care." }
    ]
  },

  match: {
    title: "Match the Knobs",
    intro: "Tap an item to select it, then tap the bin where it belongs.",
    bins: [
      { id: "ventilation", title: "Ventilation knobs", sub: "Move CO₂ out" },
      { id: "oxygenation", title: "Oxygenation knobs", sub: "Get O₂ across the alveolus" }
    ],
    items: [
      { id: "rr",   label: "RR (Respiratory Rate)",      correctBin: "ventilation" },
      { id: "vt",   label: "Vt (Tidal Volume)",          correctBin: "ventilation" },
      { id: "fio2", label: "FiO₂ (Inspired Oxygen)",     correctBin: "oxygenation" },
      { id: "peep", label: "PEEP (End-Expiratory Pressure)", correctBin: "oxygenation" }
    ],
    feedback: {
      pass: "Exactly right. RR and Vt drive minute ventilation and clear CO₂. FiO₂ and PEEP drive oxygenation. This pairing is on the final exam and at every bedside.",
      fail: "Review the two-knob lesson. Ventilation knobs (RR and Vt) move CO₂ out. Oxygenation knobs (FiO₂ and PEEP) get O₂ across the alveolus."
    }
  },

  scenario: {
    title: "Scenario: \"He's still breathing — but he's getting tired\"",
    intro: "65-year-old male with COPD on home O₂. Two days of progressive dyspnea. Walk through the case as the lead medic.",
    patient: "65-year-old male, 80 kg, long-standing COPD on home O₂",
    vitals: [
      ["RR",    "32, labored, tripoding"],
      ["SpO₂",  "84% on 4 L NC"],
      ["EtCO₂", "62 mmHg, sloping waveform"],
      ["HR",    "118, sinus tach"],
      ["BP",    "148/86"],
      ["Mental","Awake, anxious, 2-word sentences"]
    ],
    steps: [
      { prompt: "Q1. What pattern of respiratory failure does this picture fit best?",
        choices: [
          { label: "Type I — hypoxic failure", outcome: "partial",
            feedback: "Hypoxia is part of the picture, but his EtCO₂ is 62 with a sloping waveform — that is the cardinal sign of CO₂ retention with bronchospasm. The dominant problem is Type II (hypercapnic) failure. Try again." },
          { label: "Type II — hypercapnic failure", outcome: "good",
            feedback: "Right. EtCO₂ 62 mmHg with a shark-fin waveform plus altered work of breathing in a COPD patient = Type II respiratory failure. The ventilation pump is failing." },
          { label: "Mixed Type I + Type II — neither dominant", outcome: "partial",
            feedback: "He does have both, but the dominant problem here is Type II (high CO₂ with bronchospasm pattern). Refining the answer matters because it changes what you reach for first." }
        ] },
      { prompt: "Q2. Which mental-model category of ventilator knobs is the primary lever for this patient?",
        choices: [
          { label: "Oxygenation knobs (FiO₂ + PEEP)", outcome: "partial",
            feedback: "Oxygenation does need attention, but the primary problem is CO₂ clearance. Pick again with the ventilation knobs (RR + Vt) in mind." },
          { label: "Ventilation knobs (RR + Vt)", outcome: "good",
            feedback: "Correct. He needs help moving CO₂ out. The bedside intervention is something that adds inspiratory support — BiPAP if he can tolerate the mask, intubation with vent support if he cannot." },
          { label: "Mechanics knobs (PIP / Pplat)", outcome: "partial",
            feedback: "PIP and Pplat are monitoring values you watch once he's on the vent — they are not the primary lever for this initial decision. Use the two-knob model: this is a ventilation problem." }
        ] },
      { prompt: "Q3. He is still cooperative and protecting his airway. First-line non-invasive support?",
        choices: [
          { label: "CPAP at 5–10 cmH₂O", outcome: "partial",
            feedback: "CPAP gives a single pressure throughout the breath. It's first-line for CHF / pulmonary edema (Type I). For COPD with hypercapnia, the patient needs inspiratory support — BiPAP is first-line. Try again." },
          { label: "BiPAP at IPAP 10 / EPAP 5", outcome: "good",
            feedback: "Correct. IPAP unloads the tired diaphragm and EPAP overcomes auto-PEEP. Brochard et al. (NEJM 1995) showed NIV reduces intubation and mortality in this population. Reassess at 5 and 10 minutes." },
          { label: "Immediate intubation", outcome: "partial",
            feedback: "He's awake, cooperative, and able to protect his airway. NIV is the right first try. If he doesn't improve in 30–60 minutes, you'll escalate to invasive ventilation." }
        ] },
      { prompt: "Q4. Ten minutes into BiPAP, RR is 22, EtCO₂ trending down, he's speaking in 4-word sentences. What now?",
        choices: [
          { label: "Continue current settings and reassess in 10 more minutes", outcome: "good",
            feedback: "Right. He's improving on first-line therapy. Continue, reassess, and document the trajectory. This is a successful NIV trial." },
          { label: "Escalate to invasive ventilation", outcome: "bad",
            feedback: "He's responding to BiPAP. Escalating now is unnecessary and risky — RSI carries hypotension and other complications. Stick with what's working." },
          { label: "Switch to CPAP", outcome: "bad",
            feedback: "BiPAP is the correct mode for his physiology. Switching to CPAP would remove the inspiratory support that's helping him. Stay the course." }
        ] }
    ],
    conclusion: "He continues to improve over the next 30 minutes on BiPAP. EtCO₂ trends to 48. RR drops to 18. He's transferred to the ED on NIV, with documented improvement at handoff. Successful NIV trial."
  }
},

// =====================================================================
// MODULE 2 — Recognizing Respiratory Failure
// =====================================================================
{
  id: 2,
  title: "Recognizing Respiratory Failure",
  blurb: "Call it before the patient calls it. Type I vs Type II, the SpO₂/PaO₂ cliff, capnography waveforms, and the pre-arrest signs everyone misses.",
  estMin: 45,
  practiceScenario: "failure-type",
  practiceNote: "Name the failure type from the monitor, then treat it — oxygenation vs ventilation.",

  lessons: [
    {
      id: "defs",
      kicker: "2.1 · Definitions",
      title: "What Respiratory Failure Means",
      body: [
        "Acute respiratory failure is defined by gas-exchange criteria. Type I, hypoxic respiratory failure, is PaO₂ less than 60 mmHg on room air. The CO₂ is typically normal or low because the patient is hyperventilating in compensation. Common causes: pneumonia, acute pulmonary edema, ARDS, pulmonary embolism, pulmonary contusion.",
        "Type II, hypercapnic respiratory failure, is PaCO₂ greater than 50 mmHg accompanied by a pH less than 7.35. The pH requirement matters because chronic CO₂ retainers (stable COPD, for example) live with PaCO₂ in the 60s while their kidneys retain bicarbonate, keeping pH near normal. An acute rise in CO₂ has no time to compensate — pH crashes, and that acidosis defines the failure.",
        "Mixed failure (Type I + Type II) is common: pneumonia in a COPD patient, ARDS with respiratory fatigue. Treat what you see."
      ],
      pearl: { title: "ABGs in EMS", body: "We rarely have an arterial blood gas prehospital. Clinical signs + EtCO₂ + SpO₂ give us the same diagnosis a few minutes earlier than the lab does. Don't wait for the gas." }
    },
    {
      id: "cliff",
      kicker: "2.2 · The Oxyhemoglobin Curve",
      title: "Why SpO₂ Lies — Until It Doesn't",
      body: [
        "Pulse oximetry is not linear — the SpO₂/PaO₂ relationship is an S-shaped curve, and that shape is a flat tabletop that ends at a cliff. Stroll along the top and big swings in PaO₂ barely move the saturation; step off the edge near 90% and you drop fast.",
        "SpO₂ 100% → PaO₂ ≥ 100 mmHg (the curve is flat on top — very different PaO₂ values produce the same saturation).",
        "SpO₂ 95% → PaO₂ ≈ 80 mmHg. SpO₂ 90% → PaO₂ ≈ 60 mmHg — the edge of the cliff and the threshold for Type I respiratory failure.",
        "SpO₂ 80% → PaO₂ ≈ 45 mmHg. SpO₂ 70% → PaO₂ ≈ 38 mmHg — minutes from arrest in most adults.",
        "Practical implication: aim for SpO₂ 92–96%. High enough to be off the cliff, low enough to detect deterioration. Targeting 100% does the patient no good and wastes oxygen reserves."
      ],
      evidence: { title: "Hyperoxia after ROSC", body: "Multiple observational studies show worse neurologic outcomes in cardiac arrest survivors maintained at PaO₂ > 300 mmHg post-arrest. AHA recommends titrating FiO₂ to SpO₂ 90–98% post-ROSC (2025 AHA update; the prior target was 92–98%)." }
    },
    {
      id: "type1",
      kicker: "2.3 · Type I",
      title: "Hypoxic Failure at the Bedside",
      body: [
        "Hypoxic failure presents first as work-of-breathing changes. Tachypnea. Accessory muscle use — sternocleidomastoid, retractions, nasal flaring, tripoding (sitting up with hands braced on knees). Speech becomes broken into short phrases or single words. Skin: pale, mottled, or diaphoretic. Central cyanosis (blue lips and tongue) requires at least 5 g/dL of deoxygenated hemoglobin to be visible — a LATE sign.",
        "Mental status is often well-preserved in early Type I failure. Hypoxia stimulates ventilation through peripheral chemoreceptors but produces less mental status change than rising CO₂. A patient with a sat in the low 80s who is alert and oriented is not unusual in early pneumonia or pulmonary edema.",
        "Bedside test for shunt physiology: apply 100% FiO₂ via non-rebreather at flush rate and watch what happens to the saturation. A patient with diffusion-mediated hypoxia improves quickly. A patient with significant shunt does not — they need PEEP, not just more O₂. In an awake cooperative patient, that means CPAP."
      ]
    },
    {
      id: "type2",
      kicker: "2.4 · Type II",
      title: "Hypercapnic Failure at the Bedside",
      body: [
        "Hypercapnic failure is more deceptive, because a tiring pump goes quiet, not loud. A patient retaining CO₂ may look comfortable while the partial pressure climbs — respiratory rate normal or even slowing. By the time CO₂ is high enough to affect mental status, the patient is already in trouble.",
        "Mental status correlates with the RATE of CO₂ rise rather than the absolute number. A chronic retainer at PaCO₂ 70 may be cognitively intact; an acute climb to the same value produces somnolence. As PaCO₂ rises into the 80s and 90s, the patient becomes increasingly difficult to arouse — CO₂ narcosis.",
        "Common scenarios: the COPD patient who tires after a week of escalating bronchospasm; the severe asthmatic whose minute ventilation drops to the point of quiet chest; the opioid-overdosed patient with bradypnea and miosis; the neuromuscular patient whose respiratory muscles can no longer keep pace."
      ],
      pearl: { title: "Quiet chest in asthma", body: "Wheeze means air is moving. A severe asthmatic who stops wheezing has stopped moving air. Silent chest in a previously wheezy patient is a pre-arrest sign. Bag immediately and prepare to intubate." }
    },
    {
      id: "early-late",
      kicker: "2.5 · Recognition",
      title: "Early Signs, Late Signs, and the False Calm",
      body: [
        "Early signs of respiratory failure are predictable. Tachypnea is the earliest. Speech shortens. Patients tripod. Accessory muscles recruit. Skin becomes diaphoretic. The patient is often anxious or restless. Recognize these and you have time for non-invasive support.",
        "Late signs are subtle and dangerous. The previously tachypneic patient becomes quiet. RR drops. HR, which had been elevated, begins to fall. Accessory muscle use disappears — not because the patient is better but because they are exhausted. Cyanosis becomes obvious. Mental status declines.",
        "Some call this the calm before the storm. It is pre-arrest. The patient has run out of compensatory reserve. Capnography is your most reliable warning: a steadily climbing EtCO₂ over five minutes is a fatigue alarm. A waveform that suddenly disappears tells you the tube is out, the patient is in arrest, or perfusion has collapsed."
      ]
    },
    {
      id: "capno",
      kicker: "2.6 · Capnography",
      title: "EtCO₂ — The Earliest Number You Have",
      body: [
        "EtCO₂ is the partial pressure of CO₂ measured at the end of exhalation. In a healthy patient, EtCO₂ runs 2 to 5 mmHg lower than PaCO₂. The gradient widens whenever V/Q mismatch increases — for example, pulmonary embolism, low cardiac output, significant pulmonary disease. A widening EtCO₂–PaCO₂ gradient in a vented patient suggests rising physiologic dead space.",
        "Normal adult EtCO₂ is 35 to 45 mmHg. A rising trend over several minutes in a non-intubated patient suggests fatigue. A sudden drop to zero or near-zero in an intubated patient is one of four things: tube dislodgement, complete tube obstruction, cardiac arrest, or massive PE. All four require immediate action.",
        "Capnography has an underappreciated role in CPR. AHA recommends continuous waveform capnography during resuscitation. EtCO₂ persistently below 10 mmHg during compressions suggests inadequate compressions or that ROSC is unlikely. A sudden rise in EtCO₂ from 10 to 40+ during ongoing compressions is the most specific sign of ROSC — often before any palpable pulse change."
      ]
    },
    {
      id: "waveforms",
      kicker: "2.7 · Waveforms",
      title: "Four Capnography Patterns Every EMS Provider Must Recognize",
      body: [
        "Normal: a box-like waveform. Sharp upstroke, flat plateau at the EtCO₂ value, sharp drop as the next inspiration begins.",
        "Shark fin: the upstroke is sloped rather than sharp. This is the most specific bedside sign of bronchospasm — asthma, COPD exacerbation, anaphylaxis. The slope correlates with severity; the steeper the slope, the more obstruction.",
        "Rebreathing: the baseline is elevated rather than returning to zero between breaths. Common causes: a non-fitted NIV mask seal, an exhausted CO₂ absorber, or a kinked one-way valve. Patient is re-inhaling exhaled CO₂.",
        "Lost waveform: sudden drop to near zero. DOPE algorithm time — dislodgement, obstruction, pneumothorax, equipment. We cover this in Module 7."
      ],
      pearl: { title: "Shark fin = bronchospasm", body: "If a vented patient's waveform turns shark-fin, treat the obstruction (bronchodilator, extended exhalation time). Don't chase the EtCO₂ number." }
    }
  ],

  quiz: {
    title: "Module 2 Knowledge Check",
    intro: "Ten questions on recognition. Answers and rationale appear after each submission.",
    passScore: 8,
    questions: [
      { q: "Acute Type II respiratory failure is defined as:",
        choices: ["PaO₂ < 60 with PaCO₂ < 40", "PaCO₂ > 50 with pH > 7.45", "PaCO₂ > 50 with pH < 7.35", "PaO₂ < 90 alone"], answer: 2,
        rationale: "Acute Type II failure requires the pH criterion. Chronic retainers tolerate high CO₂ with renal compensation and a normal pH; acute rises in CO₂ crash the pH below 7.35." },
      { q: "An SpO₂ of 90% corresponds approximately to a PaO₂ of:",
        choices: ["80 mmHg", "45 mmHg", "100 mmHg", "60 mmHg"], answer: 3,
        rationale: "On the oxyhemoglobin dissociation curve, SpO₂ 90% ≈ PaO₂ 60 mmHg — the threshold for hypoxic failure and the edge of the cliff." },
      { q: "A vented patient's EtCO₂ waveform shows a sloping upstroke without a flat plateau. The MOST likely diagnosis is:",
        choices: ["Tube dislodgement", "Cardiac arrest", "Bronchospasm (asthma, COPD, anaphylaxis)", "Rebreathing from NIV mask leak"], answer: 2,
        rationale: "A shark-fin waveform is the classic capnographic sign of bronchospasm. The steeper the slope, the more obstruction." },
      { q: "A previously distressed asthma patient with RR 30 is now RR 8, drowsy, and the chest is silent. This represents:",
        choices: ["Pre-arrest from fatigue and air-trapping", "Resolution of bronchospasm", "Effective sedation", "Improvement to be observed"], answer: 0,
        rationale: "Sudden calm in a previously distressed patient is pre-arrest. Silent chest means they are no longer moving enough air to wheeze. Bag and prepare to intubate immediately." },
      { q: "Which of the following is the LATEST sign of respiratory failure?",
        choices: ["Tachypnea", "Bradycardia", "Tripoding", "Diaphoresis"], answer: 1,
        rationale: "Bradycardia in respiratory failure is a late, pre-arrest sign — the patient has exhausted sympathetic compensation. Tachypnea, tripoding, and diaphoresis are all earlier." },
      { q: "Cyanosis becomes clinically visible when the deoxygenated hemoglobin reaches approximately:",
        choices: ["1 g/dL", "10 g/dL", "15 g/dL", "5 g/dL"], answer: 3,
        rationale: "Lundsgaard's classic threshold is approximately 5 g/dL of deoxygenated hemoglobin. Anemic patients may never appear cyanotic even at significant hypoxia." },
      { q: "AHA guidance: during CPR, an EtCO₂ persistently below 10 mmHg suggests:",
        choices: ["Inadequate compressions or low likelihood of ROSC", "Effective compressions and likely ROSC", "Hyperventilation", "Pulmonary embolism specifically"], answer: 0,
        rationale: "Persistent EtCO₂ < 10 mmHg during compressions is a quality-of-CPR marker. It suggests inadequate compressions or unlikely ROSC. A sudden rise to 40+ is the most specific sign of ROSC." },
      { q: "A 70-year-old COPD patient: RR 8, SpO₂ 88% on non-rebreather, EtCO₂ 72 mmHg, and drowsy. The MOST appropriate next step is:",
        choices: ["Increase O₂ flow and continue monitoring", "BiPAP if cooperative; otherwise prepare for intubation", "Begin CPAP at 5 cmH₂O", "Order an ABG and wait"], answer: 1,
        rationale: "Falling RR + high CO₂ + altered mental status = pre-arrest Type II failure. BiPAP if cooperative, otherwise invasive ventilation. CPAP alone won't fix the ventilation problem." },
      { q: "Type I respiratory failure (hypoxic) is most consistent with which of the following clinical pictures?",
        choices: ["COPD exacerbation with hypercapnia", "Acute pulmonary edema with refractory hypoxia", "Opioid overdose with bradypnea", "Myasthenia gravis exacerbation"], answer: 1,
        rationale: "Acute pulmonary edema is the prototype Type I (hypoxic) failure — shunt physiology from alveolar flooding. The other three are Type II (ventilatory pump failure)." },
      { q: "A rising EtCO₂ trend in a non-intubated patient over five minutes suggests:",
        choices: ["Improving condition", "Hyperventilation", "Patient fatigue / failing ventilation", "Sensor malfunction only"], answer: 2,
        rationale: "Rising EtCO₂ trend means the patient is moving less air relative to CO₂ production. In a distressed patient, this is a fatigue alarm — escalate." }
    ]
  },

  match: {
    title: "Type I or Type II?",
    intro: "Six clinical pictures. Tap each one, then tap the bin where it belongs.",
    bins: [
      { id: "type1", title: "Type I — Hypoxic", sub: "PaO₂ < 60; CO₂ normal/low" },
      { id: "type2", title: "Type II — Hypercapnic", sub: "PaCO₂ > 50 with pH < 7.35" }
    ],
    items: [
      { id: "edema",   label: "Acute pulmonary edema", correctBin: "type1" },
      { id: "pna",     label: "Pneumonia with refractory hypoxia", correctBin: "type1" },
      { id: "ards",    label: "ARDS — diffuse alveolar damage", correctBin: "type1" },
      { id: "copd",    label: "COPD exacerbation with hypercapnia", correctBin: "type2" },
      { id: "opioid",  label: "Opioid overdose, bradypnea", correctBin: "type2" },
      { id: "asthma",  label: "Severe asthma with fatigue, silent chest", correctBin: "type2" }
    ],
    feedback: {
      pass: "Excellent. Type I = oxygenation failure (flooded or collapsed alveoli, V/Q shunt). Type II = ventilation failure (pump exhaustion or obstruction). The differential drives the initial bedside intervention.",
      fail: "Review the Type I and Type II lessons. Hypoxic causes (pneumonia, edema, ARDS) want PEEP. Hypercapnic causes (COPD, opioid OD, asthma with fatigue) want ventilatory support."
    }
  },

  scenario: {
    title: "Scenario: \"She was talking to me a minute ago\"",
    intro: "A 42-year-old asthmatic. Three ED visits this month. Was sat-92 and wheezing ten minutes ago. Now this.",
    patient: "42-year-old female, 70 kg, severe asthma, multiple prior intubations",
    vitals: [
      ["RR",     "8 (was 30 ten minutes ago)"],
      ["SpO₂",   "94% on NRB"],
      ["EtCO₂",  "no waveform"],
      ["HR",     "52, sinus brady"],
      ["BP",     "94/60"],
      ["Mental", "Drowsy, head bobbing"],
      ["Chest",  "Silent — no wheeze, no air movement"]
    ],
    steps: [
      { prompt: "Q1. Is this patient improving or pre-arrest?",
        choices: [
          { label: "Improving — RR is down, wheeze is gone", outcome: "bad",
            feedback: "Dangerous interpretation. A previously distressed asthmatic who is now quiet, bradycardic, and has a silent chest is NOT improving — she has run out of compensatory reserve. This is pre-arrest." },
          { label: "Pre-arrest — sudden calm, falling RR/HR, silent chest", outcome: "good",
            feedback: "Correct. Sudden calm in a previously distressed asthmatic is the classic pre-arrest pattern. RR falling from 30 to 8, HR going brady, and silent chest are all late, ominous findings." },
          { label: "Stable — she's protecting her airway and saturating", outcome: "partial",
            feedback: "Saturation is a snapshot. EtCO₂ has no waveform — she may be apneic. \"Stable\" is the wrong word for any patient with these findings. Pick again." }
        ] },
      { prompt: "Q2. What is the most likely cause of \"no EtCO₂ waveform\" in this asthmatic?",
        choices: [
          { label: "Sensor malfunction", outcome: "bad",
            feedback: "Possible but very unlikely given the other findings. EtCO₂ loss in a deteriorating patient is a clinical sign of failed ventilation, not equipment failure. Investigate the patient first." },
          { label: "Complete loss of air movement — she is no longer ventilating effectively", outcome: "good",
            feedback: "Correct. Silent chest + lost EtCO₂ waveform + falling RR = the patient has stopped moving meaningful air. She needs immediate support." },
          { label: "Severe hypercapnia — CO₂ is so high it overwhelms the monitor", outcome: "bad",
            feedback: "Capnography monitors have a range that handles very high CO₂. A lost waveform reflects no air movement, not high CO₂. Re-examine." }
        ] },
      { prompt: "Q3. What's your first action?",
        choices: [
          { label: "Increase nasal cannula flow and watch closely", outcome: "bad",
            feedback: "Inadequate response. She needs immediate positive-pressure ventilation, not more passive oxygen. The diagnosis here is impending respiratory arrest." },
          { label: "Bag her with BVM at 100% O₂ and prepare for RSI", outcome: "good",
            feedback: "Correct. She needs immediate bag-mask ventilation with 100% O₂ and is heading for intubation. RSI with attention to vent strategy for asthma (slow rate, long expiratory time, permissive hypercapnia). Push-dose pressors ready." },
          { label: "BiPAP at IPAP 10 / EPAP 5", outcome: "bad",
            feedback: "She is no longer cooperative or protecting her airway in a meaningful way. NIV in a peri-arrest patient is a delay tactic. Bag her now and tube her." }
        ] },
      { prompt: "Q4. After intubation, the vent settings for status asthmaticus should emphasize:",
        choices: [
          { label: "High rate (RR 20) to normalize CO₂ quickly", outcome: "bad",
            feedback: "Wrong direction. High rate in obstructive disease causes breath stacking and auto-PEEP — and worsens hypotension. Slow the rate." },
          { label: "Slow rate (RR 8–10), long expiratory time (I:E 1:4–1:5), accept higher CO₂", outcome: "good",
            feedback: "Correct. Asthma is fundamentally an exhalation problem. Let her exhale. Permissive hypercapnia (pH ≥ 7.20) is acceptable. We cover this in detail in Module 9." },
          { label: "Very high PEEP to splint airways open", outcome: "bad",
            feedback: "PEEP can worsen auto-PEEP and drop blood pressure in this scenario. Keep PEEP low (0–5). The lever here is expiratory time, not PEEP." }
        ] }
    ],
    conclusion: "She is intubated, bagged at slow rate while you prepare the vent. Settings: AC/VC, RR 10, Vt 6 mL/kg IBW, I:E 1:5, PEEP 5, FiO₂ 100%. Push-dose epi ready. EtCO₂ returns at 70 with a shark-fin trace — manageable. Transport stable to the receiving ICU. Identifying pre-arrest in time saved this patient."
  }
},

// =====================================================================
// MODULE 3 — Indications for Ventilatory Support
// =====================================================================
{
  id: 3,
  title: "Indications for Ventilatory Support",
  blurb: "Pick the right level of support — first time. CPAP for CHF. BiPAP for COPD. Invasive for failure. The evidence behind each and the contraindications that must not be missed.",
  estMin: 40,
  practiceScenario: "niv-vs-tube",
  practiceNote: "Make the indication call on an awake COPD patient — BiPAP trial vs the tube — then set it up.",

  lessons: [
    {
      id: "niv-indications",
      kicker: "3.1 · NIV Indications",
      title: "When Non-Invasive Ventilation Is the Right Tool",
      body: [
        "Non-invasive ventilation (NIV) delivers positive-pressure ventilation through a tightly-fitting mask rather than an endotracheal tube. In EMS, two indications dominate: acute cardiogenic pulmonary edema (treated with CPAP) and acute COPD exacerbation with hypercapnia (treated with BiPAP).",
        "For acute pulmonary edema, the foundational evidence is Bersten et al. (NEJM 1991): 39 patients randomized to CPAP vs standard oxygen. Intubation rate dropped from 35% to 0% in the CPAP arm. A 2013 Cochrane review pooling more than 30 trials confirmed NIV reduces hospital mortality and intubation in cardiogenic pulmonary edema, with NNT roughly 4 to 7 to prevent one intubation.",
        "For COPD exacerbation with hypercapnia, Brochard et al. (NEJM 1995) randomized 85 patients to BiPAP vs standard care. Intubation: 26% vs 74%. Mortality: 9% vs 29%. Cochrane meta-analyses confirm approximately a 50% relative reduction in both intubation and mortality."
      ],
      evidence: { title: "Strong evidence", body: "CPAP for CHF and BiPAP for COPD-with-hypercapnia are among the most evidence-based EMS interventions. Level I evidence. If your service doesn't carry NIV, advocate for it." }
    },
    {
      id: "cpap-bipap",
      kicker: "3.2 · The Two Flavors",
      title: "CPAP vs BiPAP",
      body: [
        "Continuous Positive Airway Pressure (CPAP) is one steady pressure the whole cycle long — a doorstop wedged under the airway, holding it open the same amount whether the patient breathes in or out. The patient does all the breathing work; the machine just holds the baseline. In CHF, that baseline pushes alveolar fluid back into the capillaries, drops preload (by raising intrathoracic pressure), and reduces LV afterload. The combined effect is often dramatic.",
        "Bilevel Positive Airway Pressure (BiPAP) adds a second, higher pressure on inspiration — like a spotter at the bench press who shoves the bar up each time you push and eases off as you lower it. The two pressures are IPAP (inspiratory) and EPAP (expiratory); their difference is the pressure support delivered with each breath. EPAP is the doorstop (it behaves like PEEP — holding alveoli open and overcoming auto-PEEP); IPAP is the spotter's shove, unloading the tired diaphragm. In COPD with hypercapnia, EPAP overcomes auto-PEEP while IPAP supports the diaphragm long enough for the patient to catch up.",
        "Typical starting settings: CPAP at 5 to 10 cmH₂O with FiO₂ 100% initially, weaned. BiPAP at IPAP 10 / EPAP 5, FiO₂ titrated. Both require a good mask seal. Sit the patient up. Coach them to breathe with the machine."
      ]
    },
    {
      id: "titration",
      kicker: "3.3 · Titration",
      title: "How to Make NIV Work — and Recognize When It Doesn't",
      body: [
        "NIV that is going to work shows signs of working within minutes. Improvement: falling respiratory rate, rising saturation, lengthening of speech, softening accessory muscle use, normalizing EtCO₂ trend. Vital signs should improve in 5 to 15 minutes. Mental status improves in parallel.",
        "NIV that is not going to work also declares itself early. Persistent or rising RR, no change in saturation, declining mental status, vomiting, inability to tolerate the mask are all signs of failure.",
        "Apply the 1-hour rule. If the patient has been on NIV for 60 minutes without clear improvement, escalate to invasive ventilation. Continuing in a non-improving patient delays intubation under increasingly poor conditions — by the time the team gives up, the patient is often hypoxic, hypotensive, and exhausted."
      ],
      pearl: { title: "Sit them up", body: "Upright posture (head of bed 30°+) improves functional residual capacity and reduces work of breathing. Always sit your NIV and your pre-RSI patients up." }
    },
    {
      id: "contraindications",
      kicker: "3.4 · Contraindications",
      title: "When NIV Is the WRONG Tool",
      body: [
        "ABSOLUTE contraindications must be respected.",
        "1. Inability to protect the airway — GCS ≤ 8, no gag, active vomiting, copious secretions. NIV in such a patient is a comfortable way to deliver gastric contents into the lung.",
        "2. Facial trauma or severe deformity preventing mask seal.",
        "3. Hemodynamic instability or peri-arrest state. The time required to set up NIV is wasted on a patient who needs definitive airway control.",
        "4. Pneumothorax (until decompressed). Positive pressure can tension a small PTX into a fatal one.",
        "5. Cardiac or respiratory arrest. Bag-mask ventilation and intubation are the only acceptable options.",
        "When in doubt: secure the airway."
      ],
      pearl: { title: "Vomiting on NIV", body: "If a patient on NIV begins to vomit, remove the mask immediately, suction aggressively, and prepare to secure the airway. Most protocols treat any vomiting episode as an absolute contraindication going forward." }
    },
    {
      id: "invasive",
      kicker: "3.5 · Invasive",
      title: "Indications for Endotracheal Intubation",
      body: [
        "Move to invasive mechanical ventilation when:",
        "1. NIV is failing after a fair trial (typically 30 to 60 minutes; maximum 2 hours).",
        "2. GCS ≤ 8 or unable to protect airway.",
        "3. Apnea or agonal respirations.",
        "4. Refractory hypoxia despite high-FiO₂ NIV.",
        "5. Hemodynamic instability requiring control of work of breathing.",
        "6. Anticipated clinical course will deteriorate — severe burn with airway involvement, anaphylaxis with airway swelling.",
        "Prehospital RSI windows are short. Once you have paralyzed a patient, you are committed to managing the airway and the ventilator for the duration of the transport. Set up deliberately and pre-oxygenate aggressively."
      ]
    },
    {
      id: "preox",
      kicker: "3.6 · Pre-Oxygenation",
      title: "Buying Yourself Eight Minutes",
      body: [
        "Pre-oxygenation before RSI is topping off the tank before a free-dive: you flush the nitrogen out of the lung's reservoir — the functional residual capacity (FRC) — and fill it with oxygen, so the patient can hold that breath through the apnea of intubation far longer before desaturating. In a healthy adult with a good seal and high FiO₂, safe apnea time (before SpO₂ falls below 90%) stretches to approximately 8 minutes. With moderate disease, 3 to 5 minutes. With severe ARDS or obesity, sometimes less than 60 seconds.",
        "Standard technique: 3 minutes of tidal-volume breathing on a tight-sealed NRB at flush rate (15 L/min or higher). Alternative: 8 vital-capacity breaths. In a hypoxic patient who cannot achieve adequate pre-oxygenation by these methods, NIV (CPAP or BiPAP) for 3 to 5 minutes prior to the paralytic is the best option.",
        "Apneic oxygenation extends safe apnea further. A nasal cannula at 15 L/min applied during the laryngoscopy itself continues to deliver oxygen during the apneic interval. This technique — NoDESAT — adds several minutes of safe apnea time, particularly in obese and pediatric patients. Position the patient with the head elevated 20 to 30 degrees for both pre-oxygenation and laryngoscopy."
      ],
      pearl: { title: "NoDESAT", body: "Place a nasal cannula at 15 L/min on the patient during pre-oxygenation and leave it in place during laryngoscopy. The continued oxygen delivery extends safe apnea time. It is the cheapest and most effective single airway technique." }
    }
  ],

  quiz: {
    title: "Module 3 Knowledge Check",
    intro: "Ten questions on indications and contraindications. Answers and rationale appear after each.",
    passScore: 8,
    questions: [
      { q: "A 65-year-old in acute pulmonary edema is awake, RR 32, SpO₂ 84% on non-rebreather, frothy sputum. The BEST next step within EMS scope is:",
        choices: ["Immediate intubation", "BVM with PEEP valve only", "CPAP at 5–10 cmH₂O with FiO₂ 100%", "Nasal cannula at 6 L/min"], answer: 2,
        rationale: "Acute pulmonary edema in an awake patient with intact airway protection is the textbook CPAP indication. Cochrane evidence: NNT ~5 to prevent intubation. Reassess in 5–10 min." },
      { q: "Which of the following is an ABSOLUTE contraindication to NIV?",
        choices: ["Inability to protect the airway", "Mild claustrophobia", "Tachypnea > 30", "Mild bronchospasm"], answer: 0,
        rationale: "Cannot protect the airway (GCS ≤ 8, vomiting, copious secretions) is absolute. NIV in such patients risks aspiration." },
      { q: "BiPAP is first-line for which of the following EMS scenarios?",
        choices: ["Acute pulmonary edema with CHF", "COPD exacerbation with hypercapnia", "Severe traumatic brain injury", "Tension pneumothorax (post-decompression)"], answer: 1,
        rationale: "COPD with hypercapnia is the textbook BiPAP indication. Brochard NEJM 1995 demonstrated mortality reduction. CHF is CPAP. TBI patients with GCS ≤ 8 need intubation, not NIV." },
      { q: "The Brochard 1995 trial in COPD demonstrated that BiPAP reduced intubation from approximately:",
        choices: ["50% to 25%", "74% to 26%", "20% to 10%", "No significant difference"], answer: 1,
        rationale: "Brochard et al. NEJM 1995: intubation 74% (control) vs 26% (BiPAP); mortality 29% vs 9%. NNT ~2 to prevent one intubation in this trial." },
      { q: "An obese, significantly hypoxic patient is being prepared for RSI. The BEST pre-oxygenation strategy is:",
        choices: ["NIV for 3–5 min prior to paralytic, plus apneic oxygen via nasal cannula during laryngoscopy", "3 min of tidal-volume breathing on NRB only", "Bag-mask ventilation at room air", "Skip pre-oxygenation to save time"], answer: 0,
        rationale: "Obese and significantly hypoxic patients benefit from NIV pre-oxygenation (addresses atelectasis and shunt) plus apneic oxygenation during the laryngoscopy itself. Plain NRB may not be sufficient." },
      { q: "Typical starting settings for CPAP in acute pulmonary edema are:",
        choices: ["20 cmH₂O at FiO₂ 21%", "5–10 cmH₂O at FiO₂ 100%, then wean", "1–2 cmH₂O at FiO₂ 50%", "IPAP 20 / EPAP 5"], answer: 1,
        rationale: "Start CPAP at 5–10 cmH₂O with FiO₂ 100%, then titrate as the patient improves. The IPAP/EPAP option is BiPAP, not CPAP." },
      { q: "The 1-hour rule for NIV means:",
        choices: ["If no improvement at 60 minutes, escalate to invasive ventilation", "NIV must be attempted for at least 1 hour before escalation", "NIV cannot exceed 1 hour total", "Switch from CPAP to BiPAP every hour"], answer: 0,
        rationale: "If the patient is not improving at 60 minutes on NIV, escalate. Continuing in a non-improving patient delays intubation under increasingly poor conditions." },
      { q: "NoDESAT (apneic oxygenation during laryngoscopy) involves:",
        choices: ["A nasal cannula at 15 L/min left in place during intubation", "Increasing the NRB flow during the apneic phase", "Bag-mask ventilation during laryngoscopy", "Cricoid pressure for the entire apnea"], answer: 0,
        rationale: "NoDESAT: place a nasal cannula at flush rate (15 L/min) during pre-oxygenation and leave it in place during the laryngoscopy. Extends safe apnea time, particularly in obese and pediatric patients." },
      { q: "Mechanism of benefit of CPAP in acute pulmonary edema includes:",
        choices: ["Reduced preload AND LV afterload, plus alveolar recruitment", "Bronchodilation", "Increased cardiac contractility", "Direct diuresis"], answer: 0,
        rationale: "CPAP raises intrathoracic pressure (reducing preload) and reduces LV afterload (reducing transmural cardiac pressure), in addition to pushing alveolar fluid back into capillaries. Triple effect." },
      { q: "A COPD patient on BiPAP for 60 minutes shows no improvement, persistent CO₂ retention, and is becoming drowsy. The MOST appropriate next step is:",
        choices: ["Escalate to invasive mechanical ventilation", "Continue BiPAP — give it more time", "Switch to CPAP", "Add high-flow nasal cannula on top of BiPAP"], answer: 0,
        rationale: "1-hour rule. NIV failure with worsening mental status is an indication for invasive ventilation. Continuing now wastes time and risks aspiration as he loses airway protection." }
    ]
  },

  match: {
    title: "Pick the Right Support",
    intro: "Six clinical pictures. Match each to the appropriate first-line ventilatory support.",
    bins: [
      { id: "cpap", title: "CPAP", sub: "ONE steady pressure · oxygenation failure (low SpO₂, normal CO₂) — CHF / pulmonary edema" },
      { id: "bipap", title: "BiPAP", sub: "TWO pressures, IPAP + EPAP · ventilation failure (high EtCO₂, acidotic) — COPD" },
      { id: "invasive", title: "Invasive Ventilation", sub: "Failed NIV, declining LOC, or unprotected airway" }
    ],
    items: [
      { id: "chf",     label: "Acute pulmonary edema, awake, SpO₂ 84%, EtCO₂ normal", correctBin: "cpap" },
      { id: "chf-mild", label: "Cardiogenic pulmonary edema, awake, RR 24, SpO₂ 90% on NRB", correctBin: "cpap" },
      { id: "copd",    label: "COPD exacerbation, awake, EtCO₂ 68 and climbing, drowsy", correctBin: "bipap" },
      { id: "copd2",   label: "COPD, alert but tiring, EtCO₂ 75, pH 7.26", correctBin: "bipap" },
      { id: "trauma",  label: "Severe TBI, GCS 6", correctBin: "invasive" },
      { id: "edema-niv-fail", label: "Pulmonary edema on CPAP 60 min, RR rising, mental status declining", correctBin: "invasive" }
    ],
    feedback: {
      pass: "Exactly. CPAP = one pressure for an OXYGENATION problem — CHF / pulmonary edema, where SpO₂ is low but CO₂ is normal. BiPAP = two pressures that add inspiratory support for a VENTILATION problem — COPD, where EtCO₂ is high and the patient is acidotic. Go invasive when NIV fails or the airway is unprotected.",
      fail: "Sort by the failing number. Low SpO₂ with a normal CO₂ (CHF) → CPAP. Rising EtCO₂ / acidosis (COPD) → BiPAP. Declining mental status or a failed NIV trial → invasive."
    }
  },

  scenario: {
    title: "Scenario: \"Just put a non-rebreather on her\"",
    intro: "68-year-old female. Known HFrEF (EF 30%). Stopped her diuretic 5 days ago. Severe dyspnea 90 minutes ago, progressive.",
    patient: "68-year-old female, 80 kg, 5'4\". HFrEF, atrial fibrillation, type 2 diabetes, hypertension. Sleeping on three pillows.",
    vitals: [
      ["RR",     "32, labored, accessory muscles in use"],
      ["SpO₂",   "82% on NRB at 15 L"],
      ["EtCO₂",  "30 mmHg, normal square waveform"],
      ["HR",     "124, irregular"],
      ["BP",     "174/98"],
      ["Lungs",  "Bilateral crackles, frothy pink sputum"],
      ["Mental", "Awake, anxious, 2-word sentences"]
    ],
    steps: [
      { prompt: "Q1. Which type of respiratory failure does this picture fit?",
        choices: [
          { label: "Type I — hypoxic failure (the dominant problem is oxygenation)", outcome: "good",
            feedback: "Correct. EtCO₂ is normal/low and SpO₂ is the primary concern. Acute pulmonary edema is the prototype Type I failure — V/Q shunt from alveolar flooding." },
          { label: "Type II — hypercapnic failure", outcome: "bad",
            feedback: "EtCO₂ is 30 (normal/low). The CO₂ is fine; she is hyperventilating to compensate for hypoxia. This is Type I (hypoxic), not Type II." },
          { label: "Mixed failure — both equally", outcome: "bad",
            feedback: "EtCO₂ is normal/low — there is no hypercapnic component. The dominant problem is oxygenation. Pick again." }
        ] },
      { prompt: "Q2. What is the FIRST-LINE non-invasive intervention?",
        choices: [
          { label: "Continue NRB at 15 L/min and watch", outcome: "bad",
            feedback: "She is already on NRB and not improving. Shunt physiology from alveolar flooding does not respond to FiO₂ alone — she needs PEEP to push the fluid out of the alveoli." },
          { label: "CPAP at 5–10 cmH₂O, FiO₂ 100%", outcome: "good",
            feedback: "Correct. Acute pulmonary edema in an awake cooperative patient is the textbook CPAP indication. The PEEP recruits alveoli, pushes alveolar fluid into capillaries, AND reduces preload + LV afterload — a triple effect." },
          { label: "BiPAP at IPAP 10 / EPAP 5", outcome: "partial",
            feedback: "BiPAP works in pulmonary edema too, but the textbook first-line is CPAP. For her physiology (oxygenation problem, intact ventilatory drive), a single pressure is sufficient. BiPAP is preferred when the patient has a hypercapnic component as well." },
          { label: "Immediate intubation", outcome: "bad",
            feedback: "She is awake, cooperative, protecting her airway. NIV is the right first try. CPAP avoids intubation in roughly 1 of every 5 of these patients (Cochrane). Reserve intubation for NIV failure or airway compromise." }
        ] },
      { prompt: "Q3. You start CPAP at 7 cmH₂O, FiO₂ 100%. When do you reassess and what trajectory do you want to see?",
        choices: [
          { label: "30 minutes — give it time to work", outcome: "partial",
            feedback: "Too long for the first reassessment. NIV success or failure usually declares itself within 5 to 10 minutes. Reassess earlier so you can escalate quickly if needed." },
          { label: "5 to 10 minutes — looking for RR down, sat up, speech lengthening", outcome: "good",
            feedback: "Right. Reassess at 5 and again at 10 minutes. Falling RR, rising sat, longer phrases, softer accessory muscle use are signs of success. Document the trend." },
          { label: "Reassessment is not necessary once CPAP is on", outcome: "bad",
            feedback: "Never. NIV is a trial, not a destination. Reassess regularly. If she is not improving by 30–60 minutes, the 1-hour rule says escalate." }
        ] },
      { prompt: "Q4. Ten minutes into CPAP: RR 22, SpO₂ 94%, frothier sputum reduced, she is speaking 4–5 word sentences. What now?",
        choices: [
          { label: "Continue CPAP, document the response, transport on NIV", outcome: "good",
            feedback: "Correct. She is responding to first-line therapy. Continue, document, transport on CPAP. Notify the receiving facility of the response trajectory. This is a successful NIV trial." },
          { label: "Stop CPAP because she's better", outcome: "bad",
            feedback: "Stopping CPAP now removes the support that is helping. She will likely deteriorate quickly. Continue CPAP until the receiving team transitions her." },
          { label: "Escalate to BiPAP for additional support", outcome: "bad",
            feedback: "She is responding to CPAP — no reason to escalate. BiPAP is not better than CPAP in pulmonary edema patients who are responding. Stay the course." }
        ] }
    ],
    conclusion: "She arrives at the ED on CPAP at 7 cmH₂O / FiO₂ titrated to 60%. RR 18, SpO₂ 96%, crackles reduced. The ED team confirms acute decompensated CHF and starts nitrates and diuresis. She avoids intubation entirely. Total prehospital time: 35 minutes. This is the case Cochrane meta-analyses were built on."
  }
}

,

// =====================================================================
// MODULE 4 — Ventilator Vocabulary & Initial Settings
// =====================================================================
{
  id: 4,
  title: "Vent Vocabulary & Initial Settings",
  blurb: "The eight numbers every vented patient has. IBW math, the ARDSNet history, and how to defend any setting you turn.",
  estMin: 50,
  practiceScenario: "initial-settings",
  practiceNote: "Build safe initial settings on a freshly intubated patient — Vt by IBW, PEEP, and minute ventilation.",

  lessons: [
    {
      id: "vt", kicker: "4.1 · Tidal Volume", title: "Vt — How Much Air Per Breath",
      body: [
        "Tidal volume is the volume the ventilator delivers with each mandatory breath, measured in milliliters.",
        "Modern adult target: 6 to 8 mL per kilogram of IDEAL body weight. Lower (4 to 6 mL/kg IBW) for ARDS. Pediatric: 6 to 8 mL/kg of ACTUAL body weight.",
        "History matters. The 1990s standard was 10 to 12 mL/kg. ARDSNet ARMA (NEJM 2000) randomized 861 ARDS patients to 12 vs 6 mL/kg IBW. Mortality dropped from 39.8% to 31.0% (NNT 11). One of the most evidence-based interventions in critical care.",
        "Too low: dead space eats the breath; CO₂ rises despite normal-looking MV. Too high: alveolar over-distention, volutrauma. Always use IBW, not actual."
      ],
      evidence: { title: "ARDSNet ARMA, NEJM 2000", body: "Randomized 861 ARDS patients to 12 mL/kg vs 6 mL/kg IBW. Mortality 39.8% vs 31.0%. NNT 11. The trial also kept Pplat < 30 and paired PEEP with FiO₂." }
    },
    {
      id: "rr-mv", kicker: "4.2 · Rate", title: "Respiratory Rate & Minute Ventilation",
      body: [
        "Respiratory rate is the number of mandatory breaths per minute the vent delivers. Adult initial: 12 to 16, titrated to EtCO₂ 35 to 45.",
        "Lower (8 to 10) for asthma/COPD — let them exhale. Higher (18 to 22) in ARDS where Vt is reduced.",
        "Minute ventilation (MV) = RR × Vt. Adult target 6 to 8 L/min. For a 70 kg IBW adult: Vt 480 mL × RR 14 = 6.7 L/min, right in range.",
        "Set the LOW MV alarm at ~70% of expected MV. The apnea alarm fires after 20 seconds of no breath — by then the patient has been failing for a while."
      ]
    },
    {
      id: "fio2-peep", kicker: "4.3 · Oxygenation Knobs", title: "FiO₂ and PEEP",
      body: [
        "FiO₂ is the fraction of oxygen in the inspired gas. Range 0.21 (room air) to 1.00 (100%). Start at 100% on every fresh intubation; wean.",
        "Target SpO₂ ≥ 92% (adult), ≥ 88% (COPD per GOLD), ≥ 94% (TBI per BTF). Hyperoxia post-ROSC worsens neurologic outcome — AHA recommends SpO₂ 90–98% after cardiac arrest (2025 update; previously 92–98%). Oxygen is a drug, not a vital sign.",
        "PEEP is the pressure remaining in airways at end-exhalation. Adult default 5 cmH₂O. ARDS uses 10–15 cmH₂O paired with FiO₂ per the ARDSNet table.",
        "PEEP recruits collapsed alveoli — the fix for shunt physiology. It also reduces preload, which can drop BP in volume-depleted patients. Pair PEEP with FiO₂ together, not separately."
      ],
      pearl: { title: "FiO₂ alone won't fix shunt", body: "Patient on 100% FiO₂ and saturation barely moves? It's a shunt. The bedside fix is PEEP — usually via CPAP in awake patients." }
    },
    {
      id: "ie", kicker: "4.4 · Timing", title: "I:E Ratio",
      body: [
        "I:E is the ratio of inspiratory time to expiratory time. Adult default is 1:2 — inspiration takes half as long as exhalation.",
        "In obstructive disease (asthma, COPD), set 1:4 or 1:5. Let the patient exhale. Forcing the rate up traps gas (auto-PEEP), drops blood pressure, and risks barotrauma.",
        "On the LTV: you set inspiratory TIME in seconds (typically 1.0 to 1.2 in adults). The screen calculates the I:E.",
        "Watch the expiratory flow waveform. If it doesn't return to zero before the next breath starts, you have auto-PEEP. Slow the rate and lengthen exhalation."
      ]
    },
    {
      id: "pressures", kicker: "4.5 · Pressures", title: "PIP, Pplat, and Driving Pressure",
      body: [
        "Peak Inspiratory Pressure (PIP): highest airway pressure during inspiration. Displayed continuously. Keep < 35 cmH₂O.",
        "Plateau Pressure (Pplat): airway pressure during a 0.5-second inspiratory hold (no flow). Reflects alveolar pressure / compliance. Keep < 30 cmH₂O — ARDSNet protocol. Press and hold the inspiratory hold button on the LTV to measure.",
        "Math: PIP ≈ Pplat + (Resistance × Flow). High PIP + normal Pplat = AIRWAY problem (resistance). Both high = LUNG problem (compliance).",
        "Driving pressure (ΔP) = Pplat − PEEP. Amato et al. (NEJM 2015) reanalyzed nine ARDS RCTs and showed ΔP was the strongest mortality predictor. Each 7 cmH₂O rise increased mortality ~40%. Target ΔP < 14 cmH₂O in ARDS."
      ],
      evidence: { title: "Amato 2015 driving pressure", body: "Pplat − PEEP < 14 cmH₂O is the modern ARDS target. Stronger mortality predictor than Vt, Pplat, or PEEP individually." }
    },
    {
      id: "settings", kicker: "4.6 · Defaults", title: "IBW Math and Safe Initial Settings",
      body: [
        "Devine IBW formulas. Men: 50 + 2.3 × (inches over 60). Women: 45.5 + 2.3 × (inches over 60).",
        "Examples. 5'6\" man: 50 + 2.3 × 6 = 63.8 kg → safe Vt 380–510 mL. 5'10\" woman: 45.5 + 2.3 × 10 = 68.5 kg → safe Vt 410–548 mL.",
        "Safe adult defaults to defend: AC/VC mode; Vt 6–8 mL/kg IBW; RR 14, titrated to EtCO₂ 35–45; FiO₂ 100% then wean; PEEP 5; I:E 1:2; alarms PIP 35, low MV 4, low PEEP 3, apnea 20 sec.",
        "When in doubt, return to defaults. Change ONE thing at a time, reassess in 30 seconds, and document with vitals before and after."
      ],
      pearl: { title: "5'10\" rule of thumb", body: "5'10\" adult ≈ 73 kg IBW → Vt 440–580 mL. Memorize this anchor for when you don't have a card handy." }
    }
  ],

  quiz: {
    title: "Module 4 Knowledge Check",
    intro: "Ten questions on the eight numbers and IBW math.",
    passScore: 8,
    questions: [
      { q: "A 5'6\" male weighs 250 lb. What initial Vt should you set on AC/VC?",
        choices: ["6–8 mL/kg of actual 113 kg → 700–900 mL", "6–8 mL/kg of IBW ~64 kg → 380–510 mL", "Use last documented Vt", "10 mL/kg actual weight"], answer: 1,
        rationale: "Devine IBW for a 5'6\" man = 50 + 2.3 × 6 = 63.8 kg. Vt = 6–8 mL/kg IBW = 380–510 mL. Lungs scale with height, not actual weight." },
      { q: "ARDSNet (ARMA, NEJM 2000) showed mortality at 6 mL/kg vs 12 mL/kg IBW was approximately:",
        choices: ["31% vs 40%", "No difference", "20% vs 25%", "50% vs 60%"], answer: 0,
        rationale: "31.0% (6 mL/kg) vs 39.8% (12 mL/kg). Absolute reduction 8.8%. NNT 11 lives saved. Foundational evidence for lung-protective ventilation." },
      { q: "Plateau pressure ceiling in ARDS, per ARDSNet protocol:",
        choices: ["< 30 cmH₂O", "< 50 cmH₂O", "< 20 cmH₂O", "No specific ceiling"], answer: 0,
        rationale: "ARDSNet keeps Pplat < 30 cmH₂O. Above this threshold, mortality rises sharply due to alveolar over-distention." },
      { q: "Driving pressure (ΔP) is defined as:",
        choices: ["PIP − Pplat", "PIP − PEEP", "Pplat + PEEP", "Pplat − PEEP"], answer: 3,
        rationale: "ΔP = Pplat − PEEP. Amato 2015 showed it's the strongest mortality predictor in ARDS. Target < 14 cmH₂O." },
      { q: "Appropriate I:E ratio for a status asthmaticus patient on AC/VC:",
        choices: ["1:4 or longer", "1:1", "1:2", "Inverse 2:1"], answer: 0,
        rationale: "Obstructive disease needs prolonged exhalation. 1:4 or 1:5 prevents breath stacking and auto-PEEP. Forcing higher rates risks barotrauma." },
      { q: "Strict normocapnia (EtCO₂ 35–40) is the target in which population?",
        choices: ["ARDS", "TBI / increased ICP", "Asthma", "Post-ROSC"], answer: 1,
        rationale: "Brain Trauma Foundation 4th edition: maintain EtCO₂ 35–40 mmHg in TBI. Avoid prophylactic hyperventilation. Hyperventilation only as transient herniation rescue." },
      { q: "Best practice for FiO₂ in a post-ROSC adult per AHA guidance:",
        choices: ["Always 100% to maximize oxygen delivery", "Titrate to SpO₂ 90–98% — avoid hyperoxia", "Room air only", "Whatever the prior intubator chose"], answer: 1,
        rationale: "Hyperoxia post-ROSC worsens neurologic outcome (multiple observational studies). The 2025 AHA guidelines recommend titrating FiO₂ to SpO₂ 90–98% (prior target 92–98%)." },
      { q: "Adult target minute ventilation:",
        choices: ["6–8 L/min", "2–4 L/min", "12–14 L/min", "20+ L/min"], answer: 0,
        rationale: "Adult MV target is 6–8 L/min (RR × Vt). For a 70 kg IBW adult: Vt 480 × RR 14 = 6.7 L/min." },
      { q: "PIP rises from 22 to 40, Pplat stays at 24. The MOST likely cause is:",
        choices: ["Worsening ARDS", "Pneumothorax", "Auto-PEEP", "Mucus plug or bronchospasm"], answer: 3,
        rationale: "PIP up + Pplat unchanged = AIRWAY problem (resistance). ARDS or PTX would raise both. Suction, bronchodilator, check the tube." },
      { q: "Safe initial PEEP for an uncomplicated adult intubation:",
        choices: ["5 cmH₂O", "0 cmH₂O", "10 cmH₂O", "15 cmH₂O"], answer: 0,
        rationale: "Adult default PEEP is 5 cmH₂O (\"physiologic PEEP\"). Higher (10–15) is reserved for ARDS, paired with FiO₂ via the ARDSNet table." }
    ]
  },

  match: {
    title: "Set or Monitored?",
    intro: "Eight ventilator parameters. Sort each into operator-SET (you choose the value) or MONITORED (the vent measures and reports).",
    bins: [
      { id: "set", title: "Operator-Set Settings", sub: "You program these" },
      { id: "monitored", title: "Monitored Values", sub: "The vent reports these" }
    ],
    items: [
      { id: "vt-set",   label: "Vt (set tidal volume)",       correctBin: "set" },
      { id: "rr-set",   label: "RR (set rate)",               correctBin: "set" },
      { id: "fio2",     label: "FiO₂",                        correctBin: "set" },
      { id: "peep-set", label: "PEEP (set)",                  correctBin: "set" },
      { id: "ie-set",   label: "I:E ratio",                   correctBin: "set" },
      { id: "pip",      label: "PIP (peak insp pressure)",    correctBin: "monitored" },
      { id: "pplat",    label: "Pplat (plateau pressure)",    correctBin: "monitored" },
      { id: "exh-vt",   label: "Exhaled Vt (delivered)",      correctBin: "monitored" }
    ],
    feedback: {
      pass: "Right. You program Vt, RR, FiO₂, PEEP, and I:E. The vent measures and reports PIP, Pplat, and exhaled Vt. Divergence between SET and MONITORED Vt is your earliest sign of a leak or compliance change.",
      fail: "Review section 4.5. The operator sets the goals; the vent reports what the patient actually receives. The divergence is diagnostic — a leak shows up as exhaled Vt < set Vt."
    }
  },

  scenario: {
    title: "Scenario: \"Just took the vent. Settings look weird.\"",
    intro: "You're picking up a fresh intubation from a referring ED. The vent is running. Look at the settings. Look at the patient.",
    patient: "5'6\" male, 250 lb actual. Just intubated for hypoxic respiratory failure (pneumonia).",
    vitals: [
      ["Mode",    "AC/VC"],
      ["Vt set",  "800 mL"],
      ["RR set",  "14"],
      ["FiO₂",    "100%"],
      ["PEEP",    "5"],
      ["PIP",     "42 cmH₂O (alarm sounding intermittently)"],
      ["Pplat",   "34 cmH₂O on inspiratory hold"],
      ["SpO₂",   "94% on FiO₂ 100%"]
    ],
    steps: [
      { prompt: "Q1. What is the single biggest problem with these settings?",
        choices: [
          { label: "PEEP too low for ARDS", outcome: "bad",
            feedback: "This isn't necessarily ARDS yet. The actual problem is the Vt was set from actual body weight, not IBW. Pick again." },
          { label: "Vt was calculated from actual body weight (250 lb), not from ideal body weight", outcome: "good",
            feedback: "Right. 800 mL on a 5'6\" patient is enormous. His IBW is 50 + 2.3 × 6 = 63.8 kg. Safe Vt is 6–8 mL/kg IBW = 380–510 mL. He's getting almost double a safe breath, hence Pplat 34." },
          { label: "FiO₂ is too high", outcome: "partial",
            feedback: "FiO₂ should be weaned, but the urgent problem is the dangerous tidal volume causing high Pplat. Identify the worst problem first." }
        ] },
      { prompt: "Q2. Pplat is 34 cmH₂O. Driving pressure (Pplat − PEEP) is 29. What's the immediate target?",
        choices: [
          { label: "Drop Vt to ~6 mL/kg IBW (380 mL) and re-check Pplat", outcome: "good",
            feedback: "Correct. Lower Vt brings Pplat back under 30 and ΔP back toward 14. You may need to bump RR to maintain MV with smaller Vt." },
          { label: "Increase PEEP to bring driving pressure down", outcome: "bad",
            feedback: "Raising PEEP also raises Pplat. The lever here is Vt reduction. PEEP titration is separate and should follow the ARDSNet table." },
          { label: "Switch to AC/PC immediately", outcome: "partial",
            feedback: "AC/PC is reasonable if Vt reduction doesn't bring Pplat under control. Start with the simpler fix — drop Vt — and reassess." }
        ] },
      { prompt: "Q3. You drop Vt to 380 mL. What single thing must you do next?",
        choices: [
          { label: "Reassess Pplat and document vitals before AND after the change", outcome: "good",
            feedback: "Yes. Every change is paired with a vital-sign set before and after. Press the inspiratory hold to measure new Pplat. Confirm < 30. Document." },
          { label: "Lower the RR to compensate", outcome: "bad",
            feedback: "Wrong direction. Smaller Vt means you need MORE rate to maintain MV, not less. Move RR up if EtCO₂ trends high." },
          { label: "Nothing — settings change is the end of the workflow", outcome: "bad",
            feedback: "Every vent change is paired with a reassessment within 30 seconds and documentation. Don't move on without checking the patient." }
        ] },
      { prompt: "Q4. After Vt reduction, Pplat is 26, ΔP is 21, exhaled Vt 380, RR raised to 18, EtCO₂ 42. What now?",
        choices: [
          { label: "Continue current settings, document, and notify receiving facility", outcome: "good",
            feedback: "Correct. Pplat < 30, ΔP under control, EtCO₂ in range, sat acceptable on titrated FiO₂. Document the change and trajectory. Notify the receiving facility of pre/post numbers." },
          { label: "Drop Vt further to 250 mL", outcome: "bad",
            feedback: "Vt is already in the lung-protective range (6 mL/kg IBW). Going lower means ventilating mostly dead space. Stop at 4–6 mL/kg IBW." },
          { label: "Pull PEEP off entirely", outcome: "bad",
            feedback: "PEEP 5 is physiologic and helpful. Removing it costs oxygenation. Hold the line." }
        ] }
    ],
    conclusion: "You arrive at the receiving facility with the patient on safe lung-protective settings: AC/VC Vt 380, RR 18, FiO₂ 60% (weaned), PEEP 5, Pplat 26, ΔP 21. You hand off the pre and post numbers. The receiving team thanks you for catching the dangerous Vt before it caused barotrauma. This is what IBW math saves you from."
  }
},

// =====================================================================
// MODULE 5 — Modes of Ventilation
// =====================================================================
{
  id: 5,
  title: "Modes of Ventilation",
  blurb: "Volume targeted, pressure targeted, and the partnerships in between. Pick the mode the patient needs — not the mode you remember.",
  estMin: 60,
  practiceScenario: "niv-setup",
  practiceNote: "Pick and set the right mode for an awake CHF patient — non-invasive CPAP before the tube.",

  lessons: [
    {
      id: "v-vs-p", kicker: "5.1 · Targeting", title: "Volume vs Pressure Targeting",
      body: [
        "Every vent breath guarantees one thing and lets the other float — like inflating a tire: pump to a set volume of air and the pressure lands where it lands, or pump to a set pressure and the volume lands where it lands. You never get to fix both at once.",
        "Volume-targeted (AC/VC): you set Vt — vent delivers it. PRESSURE varies with lung compliance. Most EMS default. Watch PIP / Pplat.",
        "Pressure-targeted (AC/PC): you set inspiratory pressure — vent delivers it. VOLUME varies. Pressure capped, so barotrauma risk lower. Watch delivered Vt.",
        "Trade-off: AC/VC gives predictable minute ventilation but variable pressure. AC/PC caps pressure but volume floats with stiffness."
      ]
    },
    {
      id: "ac", kicker: "5.2 · Assist-Control", title: "What \"Control\" Really Means",
      body: [
        "\"Control\" does NOT mean the patient is locked out. In AC mode, the patient can trigger their own breaths above the set rate.",
        "AC guarantees a MINIMUM number of breaths per minute (set by RR). Patient-triggered breaths receive the full set Vt (or pressure) too. No \"small supportive\" breaths in pure AC.",
        "Historical note: the original mode was CMV (Continuous Mandatory Ventilation) — patient locked out completely. AC came along to allow triggering, dramatically improving comfort.",
        "Tachypneic patient on AC can stack breaths and develop auto-PEEP. Fix the cause of tachypnea (sedation, pain, hypoxia) — don't just lower the set rate."
      ],
      pearl: { title: "Pure AC = full breath every time", body: "There are no small supportive breaths in AC. Every triggered breath gets the full set Vt." }
    },
    {
      id: "simv-ps", kicker: "5.3 · SIMV & Pressure Support", title: "SIMV and Why It Fell Out of Favor",
      body: [
        "Synchronized Intermittent Mandatory Ventilation: vent delivers a SET rate of mandatory breaths. Between mandatory breaths, the patient breathes spontaneously at any volume. Often paired with Pressure Support for the spontaneous breaths.",
        "Originally designed as a weaning mode — set rate decreased as the patient improved. Intuitive but not supported by evidence.",
        "Esteban et al. (NEJM 1995) randomized weaning strategies. SIMV was the SLOWEST of four methods. Once-daily T-piece trials and PSV alone produced faster extubation. Most modern ICUs no longer use SIMV.",
        "Pressure Support (PSV): vent senses spontaneous effort and adds a fixed pressure (5–15 cmH₂O). Compensates for ETT/circuit resistance (~5) or actively unloads the diaphragm (10–15). Inspiration cycles when flow drops to ~25% of peak."
      ],
      evidence: { title: "Esteban 1995", body: "T-piece and PSV both produced faster weaning than SIMV. Modern ICUs use spontaneous breathing trials, not SIMV gradual taper." }
    },
    {
      id: "cpap-bipap", kicker: "5.4 · NIV Modes", title: "CPAP vs BiPAP",
      body: [
        "CPAP: ONE pressure throughout the breath. Patient does all the work. Best for OXYGENATION problems (CHF, acute pulmonary edema). Mechanism: pushes alveolar fluid into capillaries, reduces preload + LV afterload. Start 5–10 cmH₂O / FiO₂ 100%.",
        "Bersten et al. (NEJM 1991): in cardiogenic pulmonary edema, CPAP eliminated intubation in the treated arm. Cochrane: NNT 4–7 to prevent intubation.",
        "BiPAP: TWO pressures (IPAP / EPAP). IPAP − EPAP = pressure support per breath. Best for VENTILATION problems (COPD with hypercapnia). Mechanism: EPAP overcomes auto-PEEP; IPAP unloads tired diaphragm. Start IPAP 10 / EPAP 5.",
        "Brochard et al. (NEJM 1995): in COPD exacerbation with hypercapnia, BiPAP reduced intubation from 74% to 26% and mortality from 29% to 9%."
      ]
    },
    {
      id: "prvc", kicker: "5.5 · PRVC", title: "PRVC and Newer Modes",
      body: [
        "Pressure-Regulated Volume Control: a HYBRID. You set a Vt target; the vent delivers it using the LOWEST pressure required, measuring compliance breath-by-breath. Best of both worlds — volume guaranteed, pressure capped.",
        "Vendor names differ: Drager AutoFlow, Servo PRVC, Hamilton ASV-like — all variations on the same idea.",
        "The LTV 1200 does NOT natively offer PRVC. If you inherit a patient on PRVC from a sending facility, coordinate with the team, then switch to AC/VC (matching Vt and RR) or AC/PC. Watch PIP closely after the change.",
        "APRV (Airway Pressure Release Ventilation) — used in refractory ARDS. NAVA (Neurally Adjusted Ventilatory Assist) — ICU-level synchrony. HFOV — once a rescue, OSCILLATE (NEJM 2013) showed harm. All beyond EMS scope but worth recognizing."
      ]
    },
    {
      id: "synchrony", kicker: "5.6 · Synchrony", title: "Trigger Sensitivity & Inspiratory Rise Time",
      body: [
        "Patient-vent dyssynchrony is the patient and the machine fighting over who leads the breath — pushing and pulling at different moments, like two people trying to row out of step. It affects ~25% of vented patients (Blanch, Intensive Care Med 2015) and raises work of breathing, sedation needs, and mortality.",
        "Trigger sensitivity controls how easily the patient initiates a breath. Pressure trigger (−1 to −2 cmH₂O) is the common default. Flow trigger (1–3 L/min) is more responsive. Too sensitive → auto-cycling from circuit motion. Not sensitive enough → patient struggles.",
        "Inspiratory rise time: how fast the pressure ramps up at the start of inspiration (pressure-targeted modes). Faster rise (0.1–0.2 sec) feels powerful but can jolt awake patients. Slower (0.4–0.6 sec) is gentler but can feel like flow starvation in dyspneic patients.",
        "EMS bedside fix for most dyssynchrony: deepen sedation, ensure analgesia, check trigger settings."
      ]
    }
  ],

  quiz: {
    title: "Module 5 Knowledge Check",
    intro: "Ten questions on modes and synchrony.",
    passScore: 8,
    questions: [
      { q: "First-line mode for an awake adult with acute cardiogenic pulmonary edema:",
        choices: ["AC/VC", "AC/PC", "SIMV + pressure support", "CPAP"], answer: 3,
        rationale: "CPAP is first-line for acute pulmonary edema in awake patients. Bersten 1991 / Cochrane NNT ~5 to prevent intubation. Reduces preload, afterload, and shunt fraction." },
      { q: "First-line mode for an awake COPD patient with hypercapnia:",
        choices: ["CPAP", "AC/VC", "BiPAP", "AC/PC"], answer: 2,
        rationale: "BiPAP for COPD with hypercapnia. EPAP overcomes auto-PEEP; IPAP unloads the tired diaphragm. Brochard 1995: intubation 74% → 26%, mortality 29% → 9%." },
      { q: "In pure AC mode, when the patient triggers a breath above the set rate, the vent delivers:",
        choices: ["A small supportive breath", "Whatever the patient pulls in spontaneously", "No additional breath until the next mandatory cycle", "The full set tidal volume (or pressure)"], answer: 3,
        rationale: "Pure AC has no \"small\" breaths. Every triggered breath gets the full set Vt or set inspiratory pressure. This is why tachypneic patients can stack and develop auto-PEEP." },
      { q: "The Esteban 1995 NEJM weaning trial demonstrated that:",
        choices: ["SIMV produces the fastest extubation", "T-piece trials and PSV are faster than SIMV", "AC/VC is superior to AC/PC", "BiPAP reduces mortality in COPD"], answer: 1,
        rationale: "Esteban showed SIMV was the SLOWEST weaning mode of four studied. Once-daily T-piece trials and pressure support alone produced shorter time to extubation. Most modern ICUs no longer use SIMV." },
      { q: "PRVC is best characterized as:",
        choices: ["Pure pressure-targeted ventilation", "Pure volume-targeted ventilation", "Hybrid — volume target with pressure cap", "An NIV mode"], answer: 2,
        rationale: "PRVC: set a volume target; the vent delivers it using the lowest pressure required, adjusting breath-by-breath. Hybrid. Drager AutoFlow / Servo PRVC are equivalent." },
      { q: "OSCILLATE (NEJM 2013) studied High-Frequency Oscillatory Ventilation in moderate-severe ARDS. The trial was:",
        choices: ["Positive — HFOV reduces mortality", "Inconclusive — neither benefit nor harm", "Never completed", "Stopped early because of harm (increased mortality in HFOV arm)"], answer: 3,
        rationale: "OSCILLATE was stopped early because of increased mortality in the HFOV arm (47% vs 35%). OSCAR also showed no benefit. HFOV is no longer a first-line ARDS rescue strategy." },
      { q: "Inspiratory rise time controls:",
        choices: ["The set respiratory rate", "How quickly the pressure ramps at the start of inspiration", "Trigger sensitivity", "I:E ratio"], answer: 1,
        rationale: "Inspiratory rise time = how fast the pressure ramps up at the start of inspiration in pressure-targeted modes. Faster jolts awake patients; slower can feel like flow starvation." },
      { q: "Patient-vent dyssynchrony affects approximately what fraction of vented patients (Blanch, ICM 2015)?",
        choices: ["~5%", "~50%", "~25%", "~75%"], answer: 2,
        rationale: "Approximately 25% of all vented patients have significant dyssynchrony episodes (Blanch 2015 prospective observation). Associated with prolonged ventilation and higher mortality." },
      { q: "Pressure Support of approximately 5 cmH₂O is generally considered:",
        choices: ["Aggressive — actively unloads the diaphragm", "Roughly physiologic — compensates for ETT/circuit resistance", "Therapeutic for ARDS", "Equivalent to CPAP"], answer: 1,
        rationale: "Pressure support of about 5 cmH₂O compensates for the resistance added by the ETT and circuit — \"physiologic\" support. 10–15 actively unloads the diaphragm." },
      { q: "You inherit a patient on PRVC at a sending facility. The LTV does not offer PRVC. The MOST appropriate move is:",
        choices: ["Refuse the transfer", "Coordinate with the sending team and switch to AC/VC matching the Vt target", "Leave the patient on the sending vent", "Switch to BiPAP"], answer: 1,
        rationale: "Coordinate the change, set AC/VC with matching Vt and RR, document pre and post numbers, watch PIP closely. If PIP exceeds 35, transition to AC/PC." }
    ]
  },

  match: {
    title: "Pick the Mode",
    intro: "Six clinical scenarios. Match each to its first-line ventilator mode.",
    bins: [
      { id: "cpap", title: "CPAP", sub: "Type I, awake (oxygenation problem)" },
      { id: "bipap", title: "BiPAP", sub: "Type II, awake (ventilation problem)" },
      { id: "acvc", title: "AC/VC", sub: "Adult invasive ventilation default" }
    ],
    items: [
      { id: "chf-awake",  label: "65 yo CHF, awake, RR 32, sat 82% on NRB", correctBin: "cpap" },
      { id: "edema-mild", label: "Awake pulmonary edema, sat 90% on NRB", correctBin: "cpap" },
      { id: "copd-fatigue", label: "70 yo COPD, drowsy, EtCO₂ 62, RR 28", correctBin: "bipap" },
      { id: "asthma-coop", label: "Asthma exacerbation, awake, EtCO₂ 55, cooperative", correctBin: "bipap" },
      { id: "fresh-tube", label: "Just RSI'd trauma patient, lung mechanics unknown", correctBin: "acvc" },
      { id: "sepsis-tube", label: "Septic shock post-RSI, intubated 5 min ago", correctBin: "acvc" }
    ],
    feedback: {
      pass: "Solid mode selection. CPAP for Type I (oxygenation) in awake patients. BiPAP for Type II (ventilation) in awake patients. AC/VC for adult invasive ventilation. This is the EMS bread-and-butter triage.",
      fail: "Review the CPAP vs BiPAP lesson. The decision tree: airway protected → oxygenation vs ventilation problem → CPAP or BiPAP → if failing or unprotected, invasive ventilation in AC/VC."
    }
  },

  scenario: {
    title: "Scenario: Inherited Patient on PRVC",
    intro: "Critical-care transport from a community ICU. The patient is on PRVC. Your LTV 1200 doesn't offer PRVC. Walk through the safe handoff.",
    patient: "54-year-old female, 5'5\" (IBW ~57 kg). ARDS day 1 from urosepsis. On PRVC, target Vt 340 mL.",
    vitals: [
      ["Sending vent",  "PRVC, target Vt 340, RR 22, FiO₂ 80%, PEEP 12"],
      ["PIP / Pplat",  "28 / 24 cmH₂O on sending"],
      ["SpO₂",         "94%"],
      ["EtCO₂",        "44 mmHg"],
      ["HR",           "108"],
      ["BP",           "112/68 on norepi 6 mcg/min"]
    ],
    steps: [
      { prompt: "Q1. The LTV doesn't offer PRVC. What's your first move?",
        choices: [
          { label: "Refuse the transfer until they switch the patient to an LTV-compatible mode", outcome: "bad",
            feedback: "Not your call to refuse. Coordinate with the sending team and switch yourself, documenting the change." },
          { label: "Coordinate with sending team; switch to AC/VC with matching Vt 340 and RR 22; document pre/post vitals", outcome: "good",
            feedback: "Right. PRVC behaves like volume-targeted with a pressure cap. Switching to AC/VC at the same Vt and RR is the safest equivalent. Coordinate, switch, document." },
          { label: "Just leave the patient on the sending ventilator for transport", outcome: "bad",
            feedback: "Most sending vents can't leave the facility. You need the patient on your LTV. The right approach is the coordinated mode switch." }
        ] },
      { prompt: "Q2. On AC/VC at Vt 340 / RR 22 / PEEP 12 / FiO₂ 80%, Pplat measures 28. Driving pressure?",
        choices: [
          { label: "ΔP = 16. Above target — consider Vt reduction.", outcome: "good",
            feedback: "Correct. ΔP = Pplat − PEEP = 28 − 12 = 16. Amato 2015 target is < 14. You can drop Vt slightly (toward 4–5 mL/kg IBW) to reduce ΔP." },
          { label: "ΔP = 28 (same as Pplat)", outcome: "bad",
            feedback: "ΔP = Pplat − PEEP, not just Pplat. PEEP matters because it's the baseline above which the lung is cyclically stretched." },
          { label: "ΔP = 40 (Pplat + PEEP)", outcome: "bad",
            feedback: "ΔP = Pplat MINUS PEEP, not plus. Driving pressure is the cyclic stress on the lung above baseline." }
        ] },
      { prompt: "Q3. You drop Vt from 340 to 280 mL (4.9 mL/kg IBW). Pplat now 24. EtCO₂ trends up to 52. What do you do?",
        choices: [
          { label: "Accept permissive hypercapnia as long as pH ≥ 7.20", outcome: "good",
            feedback: "Right. Permissive hypercapnia is the ARDS rule. Pplat under control (24) and ΔP now 12 are more important than a perfectly normal CO₂. Re-check pH if available." },
          { label: "Push Vt back up to 340 to bring CO₂ down", outcome: "bad",
            feedback: "Don't trade Pplat for CO₂. The whole point of lung-protective ventilation is accepting some hypercapnia in exchange for lower alveolar pressures." },
          { label: "Increase RR aggressively to 30", outcome: "partial",
            feedback: "Bumping RR slightly (e.g., to 24) is reasonable to help with MV. But going to 30 risks breath stacking and auto-PEEP. Modest bump, watch the flow waveform." }
        ] },
      { prompt: "Q4. SpO₂ drifts to 88% on FiO₂ 80% PEEP 12. Per ARDSNet PEEP/FiO₂ pairing, what's the next step?",
        choices: [
          { label: "Bump PEEP toward 14 with FiO₂ 90% per the ARDSNet lower-PEEP table", outcome: "good",
            feedback: "Correct. The ARDSNet table pairs PEEP and FiO₂. At FiO₂ 0.9, the suggested PEEP is 14–18. Move in the right direction; reassess Pplat after the change." },
          { label: "Increase FiO₂ to 100% only — don't touch PEEP", outcome: "partial",
            feedback: "FiO₂ to 100% is reasonable as immediate response, but you also need to bump PEEP per the ARDSNet table. PEEP recruits collapsed alveoli; FiO₂ alone won't fix shunt." },
          { label: "Decrease PEEP to reduce intrathoracic pressure", outcome: "bad",
            feedback: "Wrong direction. In ARDS, PEEP is what's keeping her oxygenating. Removing it makes things worse." }
        ] }
    ],
    conclusion: "You arrive at the receiving ICU: AC/VC Vt 280 / RR 24 / FiO₂ 90% / PEEP 14, Pplat 26, ΔP 12, SpO₂ 92%, EtCO₂ 56 with pH 7.27. You hand off coordinated changes, pre/post documentation, and a stable lung-protective trajectory. The receiving team has time to plan prone positioning before deterioration. This is what the ARDSNet protocol looks like in transport."
  }
},

// =====================================================================
// MODULE 6 — LTV 1200 Platform
// =====================================================================
{
  id: 6,
  title: "LTV 1200 — The Platform Tour",
  blurb: "Every knob, every screen, every alarm — without a patient on it. POST every shift, every patient.",
  estMin: 50,
  practiceLevel: 1,
  practiceNote: "Learn the controls hands-on: work the LTV 1200 tutorial on the simulator.",

  lessons: [
    {
      id: "front", kicker: "6.1 · Hardware", title: "Front Panel and Side Connections",
      body: [
        "Front panel essentials: Power button (top corner, momentary press). Display (settings on left, monitored on right). Control knob (right of display — scrolls values). Select button (moves cursor between parameters). Manual breath, Alarm Silence (60-sec mute), Alarm Reset.",
        "Side panel: O₂ inlet at 50 PSI (DISS or quick-connect). Patient circuit ports including the easily-missed exhalation valve drive line. Battery compartment, AC/DC power, bacterial/viral filter, USB (service only).",
        "Practice on the unit until you can find every control by feel. In a noisy ambulance bay or moving aircraft, you can't read labels.",
        "The exhalation valve drive line is the most-missed connection. Without it, the patient cannot exhale. Verify every POST."
      ],
      pearl: { title: "Memorize by feel", body: "Spend ten minutes with eyes closed, locating each control by touch. Pays off the first time you have to silence an alarm at 3 a.m. in a moving truck." }
    },
    {
      id: "battery", kicker: "6.2 · Power", title: "Battery and Line Power",
      body: [
        "Internal battery: lithium-ion, ~60 min at moderate load. Drains FASTER at high FiO₂, high PEEP, rapid rates. Worst-case: ~30 min.",
        "Battery health degrades over service life. A unit in service > 3 years and never replaced will deliver less than spec. Document unexpected battery alarms.",
        "On the truck: confirm \"line power\" on the display before loading the patient. If the AC plug bumps loose, the LTV switches silently to battery without alarm.",
        "Pre-flight rule: 100% battery + line power confirmed = ready. Test external battery packs under load — a pack that holds static charge but fails under demand is a transport hazard."
      ]
    },
    {
      id: "display", kicker: "6.3 · Display", title: "Reading the Screen",
      body: [
        "Display is organized left-to-right. SETTINGS on the left — what you programmed. MONITORED VALUES on the right — what the patient is actually receiving.",
        "Settings half: Mode (top), Vt, RR, FiO₂, PEEP, I:E, trigger sensitivity. Scan top to bottom on every check.",
        "Monitored half: PIP, exhaled Vt, total RR (set + spontaneous), exhaled MV, Pplat (when inspiratory hold is pressed), calculated I:E, FiO₂ delivered (if sensor present).",
        "Divergence between SET Vt and EXHALED Vt is the earliest sign of a leak or compliance change. Don't silence — investigate."
      ],
      pearl: { title: "Set vs Exhaled", body: "Exhaled Vt consistently < set Vt by > 10%? Check ETT cuff, walk the circuit, look at the exhalation valve drive line. Persistent leak = lost PEEP = lost oxygenation." }
    },
    {
      id: "alarms", kicker: "6.4 · Alarms", title: "The Six Alarms",
      body: [
        "HIGH PRESSURE — PIP exceeded threshold (default ~40 cmH₂O; set to 35 in lung-protective). Most common in EMS.",
        "LOW PRESSURE / LOW PEEP — circuit leak, disconnect, ETT cuff leak. Default 4 cmH₂O below set PEEP.",
        "LOW MINUTE VOLUME — exhaled MV below threshold. Default is often 0 — set this to ~70% of expected MV.",
        "APNEA — no detected breath in apnea time (default 20 sec). Triggered by complete loss of effort or sensor failure.",
        "POWER FAILURE / LOW BATTERY — switch to AC immediately. GAS SUPPLY — O₂ source pressure low; check tank, regulator, hose.",
        "Triage: READ the alarm BEFORE silencing. Silencing without identifying the cause is a sentinel-level safety event."
      ]
    },
    {
      id: "post", kicker: "6.5 · POST", title: "Power-On Self-Test",
      body: [
        "Every shift change, every patient. Five steps.",
        "1. Connect circuit + test lung BEFORE powering on. POST without a circuit is meaningless.",
        "2. Power on. Watch screen for any RED indicator. POST runs automatically — let it complete.",
        "3. Verify alarms by triggering them: occlude circuit (high pressure should fire). Disconnect lung (low pressure should fire).",
        "4. Verify Pplat: press inspiratory hold; confirm reading on display.",
        "5. Document POST in service equipment log. Pull from service if POST fails."
      ],
      evidence: { title: "Why POST", body: "Most field LTV failures are caught during POST. The worst time to find one is mid-transport." }
    },
    {
      id: "workflow", kicker: "6.6 · Workflow", title: "Safe Changes & Common Pitfalls",
      body: [
        "Safe-change workflow: 1) Verbalize the change BEFORE you turn the dial. 2) Press SELECT to navigate. 3) Rotate CONTROL knob. 4) Press SELECT (or wait 5 sec) to commit. 5) Reassess in 30 sec. 6) Document with vitals before AND after.",
        "Common pitfalls from incident reviews: forgetting to set LOW MV alarm; setting PEEP at the dial but forgetting to attach the PEEP valve; pediatric patient on the adult circuit (dead space > Vt); battery silently switching to internal when AC plug bumps loose; POST skipped because \"the next shift will do it.\""
      ]
    }
  ],

  quiz: {
    title: "Module 6 Knowledge Check",
    intro: "Ten questions on the LTV 1200 and operating discipline.",
    passScore: 8,
    questions: [
      { q: "Before using the LTV 1200 on a patient, the FIRST step is:",
        choices: ["Set Vt to 1000 mL to be safe", "Disable all alarms", "Perform POST with a complete circuit and test lung", "Set FiO₂ to 21%"], answer: 2,
        rationale: "POST with a circuit and test lung is required. POST without a circuit is meaningless. Most field failures are caught here." },
      { q: "An EMS provider notes exhaled Vt is consistently 70 mL lower than set Vt. The MOST appropriate first action is:",
        choices: ["Silence the alarm and continue", "Increase Vt to compensate", "Switch from AC/VC to AC/PC", "Investigate for a circuit or cuff leak"], answer: 3,
        rationale: "Persistent divergence between set and exhaled Vt is a leak. Check ETT cuff with a pilot syringe; walk the circuit for loose connections; check the exhalation valve drive line." },
      { q: "Internal LTV battery runtime at moderate load is approximately:",
        choices: ["10 min", "180 min", "60 min", "8 hr"], answer: 2,
        rationale: "Approximately 60 minutes at moderate load. Less at high FiO₂, high PEEP, or rapid rates. Always verify line power on the truck." },
      { q: "Most commonly missed connection on the LTV circuit:",
        choices: ["Exhalation valve drive line", "Bacterial filter", "Y-piece", "Inspiratory limb"], answer: 0,
        rationale: "The exhalation valve drive line is a small skinny tube that's easily missed when packing. Without it, the valve doesn't open and the patient cannot exhale." },
      { q: "The default value for the LOW MINUTE VOLUME alarm is often:",
        choices: ["Set automatically to 70% of expected MV", "Always 4 L/min", "Zero — must be set manually for each patient", "Linked to the apnea alarm"], answer: 2,
        rationale: "Default is often 0 (off). Set it to ~70% of expected MV on every patient. Don't trust apnea alone — by then 20+ seconds have passed." },
      { q: "The LTV display organizes the screen as:",
        choices: ["Set values on top, monitored values on bottom", "All settings on the right", "Settings on the LEFT, monitored values on the RIGHT", "Alphabetically"], answer: 2,
        rationale: "Settings on the left (what you programmed), monitored values on the right (what the patient receives). Scan top-to-bottom on both halves." },
      { q: "The Alarm Silence button quiets an active alarm for approximately:",
        choices: ["10 seconds", "5 minutes", "Indefinitely", "60 seconds"], answer: 3,
        rationale: "60 seconds. Silence is a fix-the-problem window, not a permanent mute. After 60 sec, if the cause persists, the alarm re-fires." },
      { q: "To measure plateau pressure on the LTV, you:",
        choices: ["Wait for the vent to display it automatically", "Disconnect the patient briefly", "Press and hold the inspiratory hold button during inspiration", "Increase the set rate"], answer: 2,
        rationale: "Press and hold the inspiratory hold button while observing the pressure waveform. Pplat appears as a brief flat segment after the peak. Release to resume." },
      { q: "When changing a setting on the LTV, the correct workflow is:",
        choices: ["Change it quickly so you don't miss anything", "Verbalize the change, navigate, change one parameter, reassess in 30 sec, document", "Make all needed changes at once for efficiency", "Wait for the patient to deteriorate before adjusting"], answer: 1,
        rationale: "Verbalize → Change ONE thing → Reassess in 30 sec → Document with pre/post vitals. Two changes at once defeats your ability to know which helped." },
      { q: "The exhalation valve drive line:",
        choices: ["Provides oxygen to the patient", "Powers the active exhalation valve so the patient can exhale", "Carries inspired gas", "Is an optional accessory"], answer: 1,
        rationale: "It's the small tube that powers the active exhalation valve. Without it, the valve doesn't open and the patient cannot exhale. Always verify connection." }
    ]
  },

  match: {
    title: "Front-Panel Controls",
    intro: "Match each LTV control to its primary function.",
    bins: [
      { id: "select", title: "Navigates / Selects", sub: "Moves cursor or commits values" },
      { id: "alarms", title: "Manages Alarms", sub: "Silences or clears alarms" },
      { id: "delivery", title: "Delivers a Breath / Measures", sub: "Direct breath delivery or measurement" }
    ],
    items: [
      { id: "select-btn",  label: "Select button",          correctBin: "select" },
      { id: "control",     label: "Control knob",           correctBin: "select" },
      { id: "silence",     label: "Alarm Silence (60-sec mute)", correctBin: "alarms" },
      { id: "reset",       label: "Alarm Reset",            correctBin: "alarms" },
      { id: "manual",      label: "Manual Breath button",   correctBin: "delivery" },
      { id: "hold",        label: "Inspiratory Hold (measures Pplat)", correctBin: "delivery" }
    ],
    feedback: {
      pass: "Right. Select + Control are how you navigate and program. Silence + Reset manage alarms. Manual breath delivers one on demand; Inspiratory Hold measures Pplat.",
      fail: "Review the front-panel lesson. Spend lab time finding each button by feel — you can't read labels in a moving truck."
    }
  },

  scenario: {
    title: "Scenario: Pre-Shift Walkaround",
    intro: "0700 shift change. LTV 1200 in the vehicle dock. Code call expected within 30 minutes. Get the vent ready.",
    patient: "Pre-shift unit check. No patient yet.",
    vitals: [
      ["Battery LED",  "GREEN — 100%"],
      ["AC plug",      "Connected"],
      ["Display",      "OFF (unit powered down)"],
      ["Last POST",    "Unknown — last shift didn't document"],
      ["Circuit",      "Bagged in cabinet — needs to be opened"],
      ["Test lung",    "On the shelf"]
    ],
    steps: [
      { prompt: "Q1. Before powering the unit on, what's the FIRST step?",
        choices: [
          { label: "Power it on and let POST run", outcome: "bad",
            feedback: "POST without a circuit is meaningless. The unit needs a complete circuit + test lung in place BEFORE you power on. Otherwise POST can't test what it needs to test." },
          { label: "Connect a complete circuit + test lung", outcome: "good",
            feedback: "Right. POST only tests properly with a circuit in place. Connect everything — inspiratory limb, exhalation valve drive line, filter, test lung — then power on." },
          { label: "Set Vt and RR before powering on", outcome: "bad",
            feedback: "Settings come after POST passes. First confirm the unit is working, then program for the patient." }
        ] },
      { prompt: "Q2. POST runs. Display lights up. Where's the first place to look for a problem?",
        choices: [
          { label: "Listen for tones", outcome: "partial",
            feedback: "Tones are useful but secondary. The primary check is any RED indicator on the screen during POST. Visual inspection first." },
          { label: "Watch the display for any RED indicator during POST", outcome: "good",
            feedback: "Correct. POST reports failures visually. Any red icon or alert means the unit needs to be pulled from service. Document and replace." },
          { label: "Skip POST — just program the settings", outcome: "bad",
            feedback: "Skipping POST is exactly how broken vents end up in patient care. Every shift, every patient. Document the POST." }
        ] },
      { prompt: "Q3. POST passes. To verify alarms, you should:",
        choices: [
          { label: "Trust POST and move on", outcome: "partial",
            feedback: "POST runs the unit's self-check, but manually triggering alarms confirms they actually sound. Briefly occlude the circuit to fire HIGH PRESSURE; disconnect the lung to fire LOW PRESSURE." },
          { label: "Occlude the circuit (high pressure should fire) and disconnect the test lung (low pressure should fire)", outcome: "good",
            feedback: "Right. Trigger each alarm to confirm it sounds. Then reset and reconnect. Also verify Pplat displays when you press the inspiratory hold button." },
          { label: "Disconnect from AC power to fire the battery alarm", outcome: "bad",
            feedback: "Don't unplug a charged unit just to test the alarm — you'll start draining battery. The high-pressure and low-pressure alarms are the bedside-relevant ones to verify." }
        ] },
      { prompt: "Q4. Everything verified. Last check before considering the unit \"ready for patient use\"?",
        choices: [
          { label: "Confirm the display reads 'LINE POWER' — not 'BATTERY'", outcome: "good",
            feedback: "Right. The LTV switches silently to internal battery if the AC plug bumps loose. Confirm line power on the display before declaring ready. Document POST in the service equipment log." },
          { label: "Reset Vt and RR to factory defaults", outcome: "bad",
            feedback: "Settings will be programmed for the specific patient at pickup. Don't fiddle with them as a final step." },
          { label: "Wipe the unit down with bleach", outcome: "bad",
            feedback: "Cleaning is part of pre-shift but not the LAST step. The critical last step is confirming line power. Bleach is also too harsh for the LTV display — use approved wipes." }
        ] }
    ],
    conclusion: "You document the POST in the equipment log: passed, alarms verified, Pplat reads on hold, battery 100%, line power confirmed. The unit is ready for patient pickup. When the call comes, you load the patient knowing the vent has been validated. This is the discipline that catches failures BEFORE the patient pays for them."
  }
},

// =====================================================================
// MODULE 7 — Alarms & Troubleshooting (DOPE)
// =====================================================================
{
  id: 7,
  title: "Alarms & Troubleshooting",
  blurb: "Every alarm is information. DOPE is the universal algorithm. The 10-second rule is non-negotiable.",
  estMin: 55,
  practiceLevel: 2,
  practiceNote: "Test yourself on the simulator's clinical scenarios — set alarm limits and correct the vent under pressure.",

  lessons: [
    {
      id: "philosophy", kicker: "7.1 · Philosophy", title: "What Alarms Are For",
      body: [
        "Alarms are NOT nuisances. They are information about a deteriorating system. Two kinds: equipment alarms (machine problem) and patient alarms (patient problem). Some are both.",
        "The cardinal rule: READ the alarm before you SILENCE it. Silencing an alarm without identifying the cause is a sentinel-level safety event, documented in nearly every transport-service incident review.",
        "Silence gives you 60 seconds of quiet to fix. Not 60 seconds to ignore. After 60 sec, if the problem persists, the alarm re-fires.",
        "Build the habit: read first, silence second, fix third, document fourth. Train it until it's automatic."
      ],
      pearl: { title: "Sentinel error", body: "Silencing without investigating is the #1 contributor to adverse vent events in transport. Don't let muscle memory take over." }
    },
    {
      id: "dope-d", kicker: "7.2 · D", title: "Dislodgement",
      body: [
        "Most common cause of sudden vent crisis in transport. Movement during loading, lifting, transferring between gurney and aircraft, or a road bump can dislodge an ETT.",
        "Confirm depth: marking at the lip should match what was secured (21 cm women, 23 cm men typically).",
        "Confirm capnography: a sudden drop to zero is dislodgement until proven otherwise.",
        "Auscultate: equal bilateral breath sounds. Right-only = mainstem migration. Absent or epigastric = esophageal or completely out.",
        "If the tube is out, bag with BVM + mask while preparing to re-intubate. Verify depth AGAIN after every transition."
      ]
    },
    {
      id: "dope-o", kicker: "7.3 · O", title: "Obstruction",
      body: [
        "Tube patent in position but blocked. Causes: mucus plug (most common in post-arrest, post-aspiration, COPD), biting on the tube, condensation pooled in dependent loop, kinked tube, over-inflated cuff herniating into lumen.",
        "Pass a suction catheter. This is BOTH diagnostic AND therapeutic. If it passes easily and brings back secretions, you've solved the problem.",
        "If suction passes but doesn't clear secretions, consider bronchodilator or repositioning.",
        "If suction doesn't pass — you have a fixed obstruction or dislodgement. Disconnect and bag while investigating."
      ]
    },
    {
      id: "dope-p", kicker: "7.4 · P", title: "Pneumothorax",
      body: [
        "Sudden rise in PIP, often with falling SpO₂ and BP. Decreased or absent breath sounds on the affected side. Tracheal deviation away from the affected side (LATE).",
        "Hyperresonance to percussion of the affected side. JVD + hemodynamic compromise = TENSION pneumothorax. Clinical diagnosis at the bedside, not waiting for imaging.",
        "Decompress per protocol: needle thoracostomy at the 2nd ICS midclavicular OR 4th–5th ICS midaxillary. Then chest seal / tube as appropriate.",
        "High-risk populations: asthma/COPD on positive pressure, trauma, recent central line placement. Suspect early."
      ]
    },
    {
      id: "dope-e", kicker: "7.5 · E", title: "Equipment Failure",
      body: [
        "Machine is the problem. Causes: disconnected circuit (most often exhalation valve drive line), failed sensor or transducer, silent battery switch, O₂ source disconnect, software hang, loose ETT cuff.",
        "Universal answer: DISCONNECT FROM THE VENT AND BAG WITH 100% O₂. The bag tells you whether the problem is patient or machine.",
        "Easy bag + sat rises = vent problem. Troubleshoot vent off-patient. Hard bag = patient problem — apply DOPE (D, O, or P).",
        "Bagging is rarely the wrong answer. It is diagnostic AND therapeutic at the same time."
      ]
    },
    {
      id: "rule", kicker: "7.6 · The 10-Second Rule", title: "When to Disconnect and Bag",
      body: [
        "If you cannot identify and fix an alarm in 10 seconds, disconnect from the ventilator and bag with 100% oxygen. Then troubleshoot.",
        "Vented patients deteriorate fast — sats can drop 20 points in two minutes of failed ventilation. Bagging buys time.",
        "The bag gives you something the vent cannot: direct hands-on feedback. You feel resistance. You see chest rise. You CONFIRM gas exchange.",
        "If bagging is easy and sat comes up, the problem is the machine. If bagging is hard, the problem is the patient — DOPE. Bagging is rarely the wrong answer."
      ],
      pearl: { title: "10 seconds, then bag", body: "If you're hesitating past 10 seconds, you're losing time. Disconnect and bag. Troubleshoot with confidence that the patient is being ventilated." }
    },
    {
      id: "dyssynchrony", kicker: "7.7 · Dyssynchrony", title: "When the Patient and Vent Argue",
      body: [
        "Patient-vent dyssynchrony affects ~25% of vented patients (Blanch, ICM 2015). Four patterns:",
        "Trigger asynchrony: patient effort doesn't initiate a breath. Fix: increase trigger sensitivity (flow trigger if available).",
        "Flow asynchrony: vent flow doesn't match patient demand. Fix: increase peak flow or shorten inspiratory time.",
        "Double triggering: patient effort outlasts inspiration; second breath stacks immediately. Fix: lengthen inspiratory time, deepen sedation, treat air hunger.",
        "EMS bedside fix for most dyssynchrony: deepen sedation, ensure adequate analgesia, check trigger settings."
      ]
    }
  ],

  quiz: {
    title: "Module 7 Knowledge Check",
    intro: "Ten questions on DOPE and alarm response.",
    passScore: 8,
    questions: [
      { q: "DOPE stands for:",
        choices: ["Diagnosis, Oxygen, Pressure, Equipment", "Dyspnea, Outcomes, Pulse, EtCO₂", "Drugs, Oxygen, PEEP, Education", "Dislodgement, Obstruction, Pneumothorax, Equipment failure"], answer: 3,
        rationale: "DOPE: Dislodgement, Obstruction, Pneumothorax, Equipment failure. The universal algorithm for every deteriorating ventilated patient. Some texts add S for Stacked breaths (auto-PEEP)." },
      { q: "If you cannot resolve an alarm in approximately 10 seconds, the next step is:",
        choices: ["Silence the alarm and continue", "Increase FiO₂ on the vent", "Call medical control before doing anything", "Disconnect from the vent and bag with 100% O₂"], answer: 3,
        rationale: "The 10-second rule. Bagging is diagnostic (tells you whether patient or machine is the problem) AND therapeutic. Rarely the wrong answer." },
      { q: "A vented patient suddenly develops PIP 52, no EtCO₂ waveform, BS absent right, hypotension, JVD. The MOST urgent action is:",
        choices: ["Increase FiO₂ to 100%", "Increase sedation", "Document and continue transport", "Decompress the right chest"], answer: 3,
        rationale: "Tension pneumothorax until proven otherwise. Decompress at the bedside (needle at 2nd ICS midclavicular OR 4th–5th midaxillary). Bag with 100% during decompression." },
      { q: "Most common cause of OBSTRUCTION in a post-arrest vented patient:",
        choices: ["Pneumothorax", "Bronchospasm", "Mucus plug", "Auto-PEEP"], answer: 2,
        rationale: "Mucus plugging is the most common O cause, especially in post-arrest, post-aspiration, and COPD patients. Pass a suction catheter — diagnostic and therapeutic." },
      { q: "READING the alarm before silencing is:",
        choices: ["Optional — depends on workflow", "A sentinel-level safety habit; silencing without investigating is a recordable safety event", "Only required in certain protocols", "Less important than mechanical troubleshooting"], answer: 1,
        rationale: "Silencing without identifying the cause is documented as a sentinel-level error in transport-service incident reviews. Build the habit: read, silence, fix, document." },
      { q: "Bagging a vented patient with a hard, resistive bag suggests:",
        choices: ["A patient problem — DOPE: D, O, or P", "The ventilator is the problem", "Battery failure", "Normal physiology"], answer: 0,
        rationale: "Hard bag = patient problem. Work through DOPE: dislodgement (depth, EtCO₂), obstruction (suction), pneumothorax (BS, JVD). Easy bag would suggest a machine problem." },
      { q: "Patient-vent dyssynchrony affects approximately what fraction of vented patients (Blanch 2015)?",
        choices: ["~5%", "~50%", "~80%", "~25%"], answer: 3,
        rationale: "Approximately 25%. Associated with increased work of breathing, sedation needs, and mortality." },
      { q: "Double triggering — patient effort outlasts the vent's inspiratory phase — is best managed by:",
        choices: ["Lengthening inspiratory time, deepening sedation, treating air hunger", "Decreasing trigger sensitivity (make it less responsive)", "Switching modes immediately", "Removing the patient from the vent"], answer: 0,
        rationale: "Double triggering is usually fixed by lengthening inspiratory time, deepening sedation, and treating air hunger. Pure mode switches without root-cause attention often don't help." },
      { q: "Sudden loss of EtCO₂ waveform in an intubated patient is most concerning for which of the following:",
        choices: ["Bronchospasm", "Auto-PEEP", "Sensor needing recalibration", "Tube dislodgement, complete obstruction, cardiac arrest, or massive PE"], answer: 3,
        rationale: "Sudden drop to zero or near-zero in EtCO₂ in a vented patient is dislodgement, obstruction, arrest, or massive PE. All four require immediate action. DOPE." },
      { q: "Sentinel-level safety event in ventilator transport often documented in incident reviews:",
        choices: ["Reading vital signs more often than every 15 minutes", "Using a checklist", "Silencing an alarm without identifying the cause", "Documenting every change"], answer: 2,
        rationale: "Silencing without investigating is the most commonly cited contributor to adverse vent events in transport-service incident reviews. Read first, silence second." }
    ]
  },

  match: {
    title: "Sort the Signs by DOPE Letter",
    intro: "Eight clinical findings. Match each to the DOPE letter it most strongly suggests.",
    bins: [
      { id: "d", title: "D — Dislodgement", sub: "Tube out of trachea" },
      { id: "o", title: "O — Obstruction", sub: "Tube blocked" },
      { id: "p", title: "P — Pneumothorax", sub: "Air in pleural space" },
      { id: "e", title: "E — Equipment", sub: "Machine problem" }
    ],
    items: [
      { id: "ec-zero",   label: "Sudden EtCO₂ drop to zero, ETT depth changed", correctBin: "d" },
      { id: "right-only", label: "Right-only breath sounds after lifting patient", correctBin: "d" },
      { id: "high-pip-suction", label: "Rising PIP, secretions returned on suction", correctBin: "o" },
      { id: "biting",    label: "Patient biting on tube, PIP spike with awakening", correctBin: "o" },
      { id: "absent-jvd", label: "PIP up, BS absent right, JVD, BP falling", correctBin: "p" },
      { id: "tracheal-dev", label: "Tracheal deviation away from affected side", correctBin: "p" },
      { id: "circuit-disc", label: "Low-pressure alarm, exhalation valve drive line loose", correctBin: "e" },
      { id: "battery-silent", label: "AC plug bumped loose, vent silently on battery", correctBin: "e" }
    ],
    feedback: {
      pass: "Strong. DOPE in order, every time. Verify depth and capnography for D. Suction for O. Look + listen + JVD for P. Disconnect and bag to confirm E. Verbalize each step out loud during the lab.",
      fail: "Review the DOPE lessons. The order matters because the differential narrows as you go. Confirm tube placement first; obstruction next; pneumothorax third; equipment last."
    }
  },

  scenario: {
    title: "Scenario: Run DOPE in 60 Seconds",
    intro: "27-year-old female, intubated 30 minutes ago for status asthmaticus. Sedated, paralyzed, AC/VC. You're alone in the back of the truck — partner is driving.",
    patient: "27-year-old female, 65 kg IBW, status asthmaticus, intubated 30 min ago",
    vitals: [
      ["Alarm",       "HIGH PRESSURE, PIP 52 cmH₂O"],
      ["EtCO₂",       "No waveform"],
      ["SpO₂",        "82%, falling"],
      ["Breath sounds", "Absent on right"],
      ["BP",          "84/52, trending down"],
      ["JVD",         "Present"]
    ],
    steps: [
      { prompt: "Q1. First action — before anything else?",
        choices: [
          { label: "Silence the alarm so you can think", outcome: "bad",
            feedback: "Silencing without investigating is the sentinel-level error. The alarm IS the information you need. Read first." },
          { label: "Verbalize DOPE out loud and start checking — depth, EtCO₂, BS, then bag", outcome: "good",
            feedback: "Right. Verbalize \"D-O-P-E\" out loud while moving through each check. Depth marking, EtCO₂ waveform (lost), breath sounds (absent right), then bag." },
          { label: "Increase FiO₂ to 100% on the vent and watch", outcome: "bad",
            feedback: "FiO₂ doesn't fix anything when the lung isn't ventilating. Don't change settings — find the cause." }
        ] },
      { prompt: "Q2. Depth marking is unchanged. You bag — it's HARD to push. What's the leading diagnosis?",
        choices: [
          { label: "Equipment failure (E) — try cycling the vent", outcome: "bad",
            feedback: "Hard bagging rules OUT equipment. The bag gives you direct feedback — if it's hard, the problem is the patient: Dislodgement, Obstruction, or Pneumothorax. Equipment is excluded." },
          { label: "Tension pneumothorax (P) — given absent BS right, JVD, hypotension", outcome: "good",
            feedback: "Right. The constellation — hard bagging, absent BS unilaterally, JVD, falling BP — is tension PTX until proven otherwise. Asthmatic on positive pressure is high-risk." },
          { label: "Mucus plug — pass a suction catheter", outcome: "partial",
            feedback: "Obstruction is in your differential, but with absent BS unilaterally + JVD + hypotension, tension PTX is the leading diagnosis and the most time-critical. Don't waste seconds on suction." }
        ] },
      { prompt: "Q3. What is your immediate action?",
        choices: [
          { label: "Call medical control before doing anything", outcome: "bad",
            feedback: "She doesn't have time. Tension PTX with hemodynamic compromise is a clinical diagnosis treated at the bedside, not waiting for a call." },
          { label: "Needle decompression at 2nd ICS midclavicular OR 4th–5th midaxillary, right side, per protocol", outcome: "good",
            feedback: "Right. Decompress now. Bag continues at 100% O₂ during decompression. Expect immediate audible air release if tension, and BP recovery within seconds to minutes." },
          { label: "Transport to ED for a chest X-ray", outcome: "bad",
            feedback: "X-ray confirms what you already diagnosed clinically. Don't wait — she'll arrest in transport. Decompress at the bedside." }
        ] },
      { prompt: "Q4. After decompression, BS return on the right and BP recovers to 102/64. What now?",
        choices: [
          { label: "Reconnect the patient to the vent at current settings — no other action needed", outcome: "bad",
            feedback: "Asthma + barotrauma + post-decompression = needs a chest seal / tube to prevent re-tensioning. Place a chest seal per protocol; the receiving facility will place a definitive chest tube." },
          { label: "Place chest seal/dressing per protocol, notify receiving, transport on slower/longer-exhalation vent settings", outcome: "good",
            feedback: "Correct. Chest seal prevents air re-entry. Notify receiving of the decompression. Vent settings for status asthmaticus: AC/VC, low RR (8–10), long I:E (1:4–1:5), permissive hypercapnia." },
          { label: "Pause ventilation entirely while you work", outcome: "bad",
            feedback: "Don't stop ventilating a paralyzed patient. Bag through any pause; reconnect to the vent as soon as feasible at safer settings." }
        ] }
    ],
    conclusion: "You decompressed at the bedside, placed a chest seal, reconnected on safer settings (RR 8, I:E 1:5, PEEP 5, accept permissive hypercapnia). Arrival vitals: PIP 36, BP 108/68, SpO₂ 94%, EtCO₂ 60 with shark-fin waveform. The receiving team thanks you for the field decompression and places a definitive chest tube within minutes. Asthma + positive pressure = always be ready for tension PTX. DOPE saves lives."
  }
},

// =====================================================================
// MODULE 8 — Sedation & Analgesia
// =====================================================================
{
  id: 8,
  title: "Sedation & Analgesia",
  blurb: "If the patient can fight the vent, the vent will lose. Analgesia first. Push-dose pressors ready before you push the induction agent.",
  estMin: 40,
  practiceScenario: "agitation",
  practiceNote: "A patient fighting the vent with normal mechanics — recognize when the fix is a drug, not a knob.",

  lessons: [
    {
      id: "why", kicker: "8.1 · Why Sedate", title: "Five Reasons",
      body: [
        "Comfort: an ETT is uncomfortable; bucking the vent is exhausting.",
        "Synchrony: a patient fighting the vent generates dangerously high airway pressures (barotrauma).",
        "Safety: awake fighting patients pull tubes and lines — self-extubation is a sentinel event.",
        "Oxygenation: lower work of breathing = lower O₂ demand = easier oxygenation.",
        "Hemodynamics: well-sedated patients have less sympathetic drive and more predictable response to vasopressors.",
        "Modern ICU evidence (ABCDE bundle, SAT/SBT): LIGHTER sedation with daily wake-ups reduces vent days and mortality. EMS target: RASS −1 to −2 — calm but arousable."
      ],
      pearl: { title: "Iron rule", body: "Paralyze ONLY a patient who is also analgesed AND sedated. Bolt-and-paralyze without sedation = awareness with paralysis. Sentinel safety event." }
    },
    {
      id: "rass", kicker: "8.2 · RASS", title: "The Sedation Scale",
      body: [
        "Richmond Agitation-Sedation Scale runs +4 (combative) to −5 (unarousable).",
        "+4 combative danger to staff. +3 very agitated, pulls at tubes. +2 agitated, fights vent. +1 restless but cooperative.",
        "0 alert and calm.",
        "−1 drowsy, sustained eye contact > 10 sec to voice. −2 light sedation, briefly opens eyes to voice. −3 moderate, movement to voice no eye contact. −4 deep, movement to physical stimulus only. −5 unarousable.",
        "Transport target is RASS −1 to −2. Deeper than −2 makes handoff assessment hard. Lighter than −1 risks self-extubation."
      ]
    },
    {
      id: "agents", kicker: "8.3 · Agents", title: "EMS Sedation/Analgesia Toolbox",
      body: [
        "Fentanyl 1–2 mcg/kg IV, redose 0.5–1 mcg/kg q15–20 min. Analgesia first. Watch chest wall rigidity at high doses pushed rapidly.",
        "Ketamine 1–2 mg/kg IV induction; 0.5–1 mg/kg redose. PREFERRED in shock — sympathetic effect supports BP. KETASED (Jabre 2009): equivalent to etomidate, safer in shock. Modern evidence: acceptable in TBI. On AMR KC this is a Paramedic, intubated-adults-only sedation agent — NOT a field induction drug (see the AMR KC box).",
        "Midazolam 0.05–0.1 mg/kg IV q5–10 min. Sedation + amnesia. Synergistic respiratory depression with opioids. Reversible with flumazenil.",
        "Propofol 5–50 mcg/kg/min infusion (per service formulary). Drops BP. PRIS (propofol-related infusion syndrome): metabolic acidosis, rhabdomyolysis, cardiac arrhythmia at > 4 mg/kg/hr or > 48 hr infusions. Not carried on AMR KC — a hospital-supplied infusion you may monitor, not initiate.",
        "Etomidate 0.3 mg/kg IV induction. Clean hemodynamics but causes adrenal suppression — many EMS prefer ketamine in shock RSI. Not in the AMR KC formulary."
      ],
      kc: { title: "On the truck vs hospital-supplied", body: [
        "Fentanyl — 25–100 mcg slow IV/IO push (repeat 25–50; max 200). AEMT+.",
        "Midazolam — 2–5 mg for seizure (AEMT+). Behavioral sedation & any infusion: Paramedic only.",
        "Ketamine — Paramedic only, intubated adults only: 0.5–1 mg/kg IV or 1 mg/kg/hr. NOT for induction, peds, or behavioral use.",
        "Propofol & etomidate — NOT carried. Propofol = hospital drip you may monitor; etomidate is out of scope.",
        "Naloxone — keep it ready any time you give an opioid."
      ] }
    },
    {
      id: "pressors", kicker: "8.4 · Push-Dose Pressors", title: "Ready BEFORE You Push Induction",
      body: [
        "Post-intubation hypotension affects ~25% of EMS RSI (Heffner 2012). The fix is anticipation.",
        "Push-dose epinephrine — first-line for most EMS shock states. Mix 1 mg (1:10,000) into 100 mL NS = 10 mcg/mL. Dose 5–20 mcg IV (typically 10 mcg) every 1–5 min. Onset 1 min, duration 5–10 min. Inotropy + vasoconstriction.",
        "Push-dose phenylephrine — alternative when avoiding tachycardia. Mix 10 mg into 100 mL NS = 100 mcg/mL. Dose 50–200 mcg IV q1–5 min. Pure α-agonist; reflex bradycardia possible.",
        "Label every syringe clearly. Document every push. Move to a continuous infusion as soon as practical — norepinephrine is the first-line infused vasopressor for most shock states (Surviving Sepsis 2021), started at 0.05–0.1 mcg/kg/min and titrated to MAP ≥ 65, and it can run peripherally through a good IV for transport. Push-dose pressors are a bridge to that infusion."
      ],
      evidence: { title: "Post-intubation hypotension", body: "Heffner 2012: incidence ~25% in EMS RSI. Higher in shock states. Always have push-dose pressors prepared before pushing the induction agent." },
      kc: { title: "Push-dose and infusion scope", body: [
        "Push-dose epinephrine — the ONLY carried push-dose pressor. Paramedic only.",
        "KC prep: 1 mL of 1:10,000 into a 10 mL syringe, fill to 10 mL with NS = 10 mcg/mL. Give 1–2 mL (10–20 mcg) q1–2 min.",
        "Push-dose phenylephrine — NOT carried.",
        "Norepinephrine — carried infusion vasopressor (Paramedic only). Titrate to MAP ≥ 65; check site q15 min.",
        "AEMTs may not start or titrate any pressor infusion."
      ] }
    },
    {
      id: "pitfalls", kicker: "8.5 · Pitfalls", title: "What Goes Wrong",
      body: [
        "Under-sedation in the first 10 minutes after intubation. Long-acting paralytics outlast a single induction dose. Bolt → sedate → redose sedation BEFORE paralysis wears off.",
        "Over-sedation pre-arrival. RASS −5 patients can't help with hand-off and are at higher risk of hemodynamic instability. Target RASS −1 to −2 by handoff.",
        "Paralytic without analgesia/sedation. Awareness with paralysis — sentinel safety event. Always pair long-acting paralytics with BOTH.",
        "Post-intubation hypotension. ~25% incidence. Push-dose pressors should be in your hand before induction.",
        "Mixing too many agents. Stick with one analgesic + one sedative for transport."
      ]
    },
    {
      id: "kc-formulary", kicker: "8.6 · AMR KC Formulary", title: "What You Carry — and Who Can Give It",
      body: [
        "Section III of the 2026 protocols (effective May 15 2026, Dr. Deshmukh) sets exactly what rides on the truck and who may give it. Know your scope before you reach for a drug. The tag after each drug is the lowest level that can give it: All = any provider · AEMT+ = AEMT or Paramedic · PM = Paramedic only.",
        "Analgesia & sedation:",
        ["Fentanyl — 25–100 mcg IV/IO/IN/IM, max 200 (AEMT+)",
         "Midazolam — 2–5 mg for seizure (AEMT+); behavioral sedation & infusions are PM only",
         "Ketamine — Paramedic only, intubated adults only",
         "Ondansetron — 4 mg antiemetic (AEMT+)",
         "Naloxone — all levels, titrate to breathing"],
        "Hemodynamics:",
        ["Norepinephrine infusion — PM only, titrate to MAP ≥ 65",
         "Push-dose epinephrine — PM only, 10–20 mcg",
         "Epi 1:10,000 IV/IO for arrest — AEMT+",
         "Epi 1:1,000 IM for anaphylaxis — all levels, 0.3–0.5 mg",
         "NS bolus 250–500 mL — AEMT+ (EMT may maintain a line only)"],
        "Cardiac & other:",
        ["Adenosine, Magnesium, Sodium bicarb, NTG infusion — PM",
         "Amiodarone, Lidocaine, NTG SL, Dextrose 10%, Diphenhydramine — AEMT+",
         "Atropine — PM for bradycardia; AEMT DuoDote for nerve agents",
         "Aspirin, Albuterol, Ipratropium — all levels"],
        "The rule that matters most: AEMTs give IV-push and IO meds on their list but may NOT start or titrate ANY infusion. Sedation infusions, push-dose pressors, ketamine, and norepinephrine are Paramedic-only. When in doubt, call DMO."
      ],
      kc: { title: "Who's the designated agent", body: [
        "Opioid → Fentanyl (AEMT)",
        "Antiemetic → Ondansetron (AEMT)",
        "Benzo → Midazolam (seizure use for AEMT)",
        "Dissociative → Ketamine (intubated adults, Paramedic only)",
        "These come from KBEMS class authorization + Medical Director standing orders — AMR KC policy, not generic EMS."
      ] }
    },
    {
      id: "kc-infusions", kicker: "8.7 · Hospital Infusions", title: "What You Monitor on a Transfer",
      body: [
        "On IFT you continue drips the sending hospital started (Section IV) — verify, monitor, and keep them running safely. You do not start them. Paramedics titrate ONLY with explicit sending-physician parameters; otherwise hold the rate and call DMO.",
        "Pressors & BP drips you'll see:",
        ["Vasopressors: norepinephrine (first-line), epi, dopamine, phenylephrine, dobutamine, milrinone",
         "Vasopressin — fixed rate, do NOT titrate",
         "Nicardipine / clevidipine — BP control in neuro emergencies"],
        "Sedation, analgesia & paralysis:",
        ["Propofol — drops BP (BP q5 min; check the milky line)",
         "Dexmedetomidine — watch for bradycardia",
         "Midazolam, fentanyl, ketamine, hydromorphone infusions",
         "Paralyzed patient = deeply sedated AND analgesed (the iron rule still applies)"],
        "Cardiac, endocrine, antibiotics, blood:",
        ["Heparin / anticoagulants — do not adjust without orders",
         "Diltiazem / esmolol — rate control",
         "Insulin — glucose q30 min",
         "KCl — pump only, NEVER bolus",
         "3% hypertonic saline — DMO to change"],
        "Any infusion or transfusion reaction: stop it, run NS, ABCs, anaphylaxis protocol if indicated, notify DMO and the receiving facility.",
        "Before every departure: confirm drug, concentration, ordered rate, current pump rate, line trace + label, access patency, volume for the trip plus a buffer, and a pump-failure backup. Dual-verify and document."
      ],
      kc: { title: "AEMT infusion boundary", body: [
        "AEMT may monitor a drip ONLY if it matches their scope: NS, fentanyl analgesia (non-sedated), ondansetron, amiodarone, lidocaine, dextrose, KCl / antibiotic add-mixtures, naloxone.",
        "ANY sedation, vasopressor, paralytic, insulin, heparin, or blood product = Paramedic transport.",
        "Unauthorized drip running? The AEMT cannot depart — call dispatch for a Paramedic."
      ] }
    }
  ],

  quiz: {
    title: "Module 8 Knowledge Check",
    intro: "Ten questions on sedation, analgesia, and post-intubation hemodynamics.",
    passScore: 8,
    questions: [
      { q: "Paralyzing a patient with rocuronium WITHOUT adequate sedation is:",
        choices: ["Acceptable for very short transports", "Standard practice", "Required to prevent self-extubation", "A sentinel safety event — awareness with paralysis"], answer: 3,
        rationale: "Awareness with paralysis is documented as a sentinel safety event. Always pair long-acting paralytics with analgesia AND sedation. The patient is awake, terrified, and unable to move." },
      { q: "Push-dose epinephrine is mixed as:",
        choices: ["1 mg into 10 mL NS = 100 mcg/mL", "1 mg into 100 mL NS = 10 mcg/mL", "10 mg into 100 mL NS = 100 mcg/mL", "0.1 mg into 100 mL NS"], answer: 1,
        rationale: "Standard push-dose epi: 1 mg of 1:10,000 epi into 100 mL NS = 10 mcg/mL. Dose 5–20 mcg IV (typically 10 mcg = 1 mL) every 1–5 min. AMR KC standing order uses the 10 mL-syringe prep (1 mL of 1:10,000 into 10 mL NS = 10 mcg/mL), 10–20 mcg every 1–2 min, Paramedic only." },
      { q: "Push-dose phenylephrine is prepared as:",
        choices: ["1 mg into 100 mL NS = 10 mcg/mL", "100 mg into 100 mL NS = 1000 mcg/mL", "10 mg into 1000 mL NS = 10 mcg/mL", "10 mg into 100 mL NS = 100 mcg/mL"], answer: 3,
        rationale: "Push-dose phenylephrine: 10 mg into 100 mL NS = 100 mcg/mL. Dose 50–200 mcg IV every 1–5 min. Pure α-agonist; reflex bradycardia possible. Note: push-dose phenylephrine is NOT on the AMR KC truck — KC carries push-dose epinephrine only." },
      { q: "Post-intubation hypotension incidence in EMS RSI is approximately (Heffner 2012):",
        choices: ["~5%", "~50%", "~25%", "~75%"], answer: 2,
        rationale: "Approximately 25% of EMS RSI patients develop post-intubation hypotension. Push-dose pressors should be prepared BEFORE pushing the induction agent." },
      { q: "Which agent is generally preferred for RSI induction in a septic shock patient?",
        choices: ["Midazolam", "Ketamine", "Propofol", "Etomidate alone"], answer: 1,
        rationale: "Ketamine preserves or augments sympathetic tone — preferred in shock. KETASED (Jabre 2009) showed ketamine equivalent to etomidate without the adrenal suppression. Etomidate's adrenal suppression is debated in septic shock. On AMR KC, ketamine is restricted to ongoing sedation of already-intubated adults (Paramedic only) — it is not a field induction agent in this service." },
      { q: "PRIS (propofol-related infusion syndrome) is most associated with:",
        choices: ["Single induction dose of propofol", "Infusion rates > 4 mg/kg/hr or duration > 48 hr", "Patients receiving fentanyl simultaneously", "Patients on ketamine"], answer: 1,
        rationale: "PRIS occurs at high doses or prolonged infusions: > 4 mg/kg/hr or > 48 hr. Metabolic acidosis, rhabdomyolysis, cardiac arrhythmia — potentially fatal." },
      { q: "Transport RASS target for a vented EMS patient is typically:",
        choices: ["0 — alert and calm", "−3 to −4 — moderate to deep sedation", "−5 — unarousable", "−1 to −2 — calm but arousable"], answer: 3,
        rationale: "RASS −1 to −2 is the transport target: calm but arousable. Allows handoff assessment at the receiving facility. Deeper sedation increases hemodynamic risk and complicates handoff." },
      { q: "Fentanyl chest wall rigidity is most associated with:",
        choices: ["High doses pushed rapidly (e.g., > 5 mcg/kg fast bolus)", "Low doses", "Long infusions", "Pediatric patients"], answer: 0,
        rationale: "Chest wall rigidity is rare but occurs with high doses pushed rapidly. Push fentanyl slowly. Treatment if it occurs: neuromuscular blockade to bag the patient." },
      { q: "Modern evidence on ketamine in traumatic brain injury (TBI) suggests:",
        choices: ["Always avoid — raises ICP significantly", "Only for pediatric TBI", "Equivalent to barbiturates", "Acceptable in TBI when hemodynamic stability matters"], answer: 3,
        rationale: "Older teaching avoided ketamine in TBI. Modern evidence (multiple RCTs through the 2010s) shows no clinically meaningful ICP rise. Ketamine is acceptable in TBI, particularly when hemodynamic stability matters." },
      { q: "Modern ICU sedation evidence (ABCDE bundle, SAT/SBT trials) supports:",
        choices: ["Deeper sedation (RASS −5) to prevent agitation", "Continuous paralytics for synchrony", "Avoiding sedation entirely", "Lighter sedation with daily wake-ups"], answer: 3,
        rationale: "Modern ICU evidence (ABCDE bundle, SAT/SBT) shows LIGHTER sedation with daily wake-ups reduces vent days and mortality. Target lighter sedation (RASS −1 to −2 in EMS transport)." }
    ]
  },

  match: {
    title: "Pick the Sedation/Pressor Agent",
    intro: "Six clinical situations. Match each to the BEST first agent.",
    bins: [
      { id: "ketamine", title: "Ketamine", sub: "Preserves BP in shock" },
      { id: "fentanyl", title: "Fentanyl", sub: "Primary analgesia" },
      { id: "epi",      title: "Push-Dose Epi", sub: "Most EMS shock states" }
    ],
    items: [
      { id: "septic-rsi",  label: "Septic shock RSI, BP 88/52", correctBin: "ketamine" },
      { id: "shock-tbi",   label: "TBI with hemorrhagic shock, BP 90/60", correctBin: "ketamine" },
      { id: "post-tube-pain", label: "Post-intubation, no analgesia given, BP fine", correctBin: "fentanyl" },
      { id: "redose",      label: "Sedated vented patient, suctioning needed, hemodynamically stable", correctBin: "fentanyl" },
      { id: "post-induce-hypo", label: "Just intubated; BP dropped to 76/48", correctBin: "epi" },
      { id: "norepi-bridge", label: "Distributive shock, line not yet in place, need pressor bridge", correctBin: "epi" }
    ],
    feedback: {
      pass: "Solid pharmacology. Ketamine for induction in shock states (and now acceptable in TBI). Fentanyl for analgesia, especially in stable hemodynamics. Push-dose epi for the inevitable post-intubation hypotension or bridging to a continuous infusion.",
      fail: "Review the agents and pitfalls lessons. The decision tree: shock state → ketamine for induction; analgesia first → fentanyl; post-intubation hypotension → push-dose epi while you set up the continuous infusion."
    }
  },

  scenario: {
    title: "Scenario: Septic Shock RSI",
    intro: "76-year-old female. Urosepsis. Intubated 5 min ago at a community ED. You're picking her up. You have 25 minutes of transport.",
    patient: "76-year-old female, 60 kg, urosepsis, on norepinephrine 8 mcg/min for MAP support",
    vitals: [
      ["Just intubated", "5 minutes ago"],
      ["RR set",        "16, FiO₂ 100%, PEEP 5"],
      ["BP",            "92/54 on norepi 8 mcg/min"],
      ["HR",            "112, sinus tach"],
      ["RASS post-RSI", "+1 (restless, fighting tube)"],
      ["Last sedation", "Etomidate at induction only — 4 min ago"],
      ["Last paralytic", "Rocuronium 100 mg — 5 min ago"]
    ],
    steps: [
      { prompt: "Q1. Etomidate is wearing off. Rocuronium hasn't. What is the patient currently experiencing?",
        choices: [
          { label: "Restful sedation — the etomidate will last another hour", outcome: "bad",
            feedback: "Etomidate's induction effect is short — about 5–10 minutes. Rocuronium lasts 30–60 minutes. She is waking up paralyzed. Awareness with paralysis is happening RIGHT NOW." },
          { label: "Awareness with paralysis — emergent need for analgesia and sedation", outcome: "good",
            feedback: "Right. Long-acting paralytic outlasts short-acting induction. She is awake, terrified, unable to move. This is a sentinel safety event in real time. Fix immediately." },
          { label: "Normal post-intubation state", outcome: "bad",
            feedback: "Restlessness (RASS +1) in a paralyzed patient is awareness with paralysis. Not normal." }
        ] },
      { prompt: "Q2. What's your first administration sequence?",
        choices: [
          { label: "Midazolam 5 mg IV + fentanyl 100 mcg IV", outcome: "partial",
            feedback: "Fentanyl + midazolam will work for analgesia and sedation, but midazolam will drop her BP further and she's already on norepi. Ketamine is the safer first choice in this hemodynamic profile." },
          { label: "Fentanyl 60 mcg IV (analgesia first) + ketamine 30 mg IV (sedation, supports BP)", outcome: "good",
            feedback: "Correct. Analgesia first (fentanyl 1 mcg/kg). Then sedation with ketamine (~0.5 mg/kg redose) — preserves or augments BP via sympathetic tone. Reassess RASS in 2–3 min." },
          { label: "Propofol bolus 100 mg", outcome: "bad",
            feedback: "Propofol drops BP significantly. A 100 mg bolus in a septic patient on norepi is courting hypotensive arrest. Skip propofol in shock." }
        ] },
      { prompt: "Q3. After sedation, BP dips to 78/48. You're 20 min out. What's your first move?",
        choices: [
          { label: "Push-dose epinephrine 10 mcg IV; continue titrating", outcome: "good",
            feedback: "Right. 10 mcg push-dose epi (1 mL of your 10 mcg/mL mix) IV every 1–5 min, titrate to MAP. Onset 1 min, duration 5–10 min. Bridge until norepi infusion catches up. Document every push." },
          { label: "Bolus 1 L normal saline rapidly", outcome: "partial",
            feedback: "A fluid bolus may help over minutes, but you need a pressor RIGHT NOW. Push-dose epi first to recover MAP; fluid bolus can follow." },
          { label: "Increase norepinephrine to 20 mcg/min from the pump", outcome: "partial",
            feedback: "Increasing the norepi infusion is reasonable, but the pump takes minutes to ramp. Push-dose epi acts in 1 minute. Bridge with push-dose, escalate the continuous infusion in parallel." }
        ] },
      { prompt: "Q4. BP recovers to 102/64 on push-dose epi + 12 mcg norepi. RASS is −2. What needs to be documented before handoff?",
        choices: [
          { label: "Only the final settings — handoff is verbal", outcome: "bad",
            feedback: "Document everything: drugs given, doses, times, BP responses, RASS trajectory, vent settings before and after each change. The receiving team needs a clear record." },
          { label: "Every dose given (drug, dose, time), BP response, RASS trajectory, vent settings", outcome: "good",
            feedback: "Right. Comprehensive documentation. Fentanyl 60 mcg at time X. Ketamine 30 mg at time X. Push-dose epi 10 mcg at time X, BP response. RASS at each reassessment. Pre/post vent settings. The receiving team will thank you." },
          { label: "Just the final BP and RASS", outcome: "bad",
            feedback: "Not enough. A snapshot at handoff hides the trajectory. Document the timeline." }
        ] }
    ],
    conclusion: "You arrive at the receiving ICU at RASS −2, BP 108/68 on norepi 14, sedation maintained with ketamine drip ordered. Push-dose epi was used twice in transport (10 mcg each) — both documented. The receiving team has the full timeline, transitions her to continuous sedation, and notes the comprehensive handoff. This is what \"have pressors in your hand before induction\" looks like in practice."
  }
},

// =====================================================================
// MODULE 9 — Special Populations
// =====================================================================
{
  id: 9,
  title: "Special Populations",
  blurb: "Same vent. Different goals. Asthma/COPD, ARDS, TBI, pediatrics. Pick the goal first; the settings follow.",
  estMin: 60,
  practiceLevel: 3,
  practiceNote: "Take on the simulator's advanced cases — ARDS, COPD, TBI and more, no hand-holding.",

  lessons: [
    {
      id: "asthma-copd", kicker: "9.1 · Asthma & COPD", title: "Let Them Exhale",
      body: [
        "Obstructive disease is fundamentally an EXHALATION problem. Air goes in easily; getting it out takes time.",
        "Strategy: low rate (RR 8–10), long expiratory time (I:E 1:4 or 1:5), Vt 6–8 mL/kg IBW, FiO₂ to SpO₂ ≥ 88% (COPD) or ≥ 92% (asthma), PEEP 0–5 cmH₂O. Permissive hypercapnia is acceptable; pH ≥ 7.20 typical floor.",
        "Don't chase a normal CO₂ at the cost of barotrauma. Forcing the rate up stacks breaths and drops BP via auto-PEEP."
      ]
    },
    {
      id: "auto-peep", kicker: "9.2 · Auto-PEEP", title: "When the Lung Doesn't Empty",
      body: [
        "Picture pouring into a glass that drains slowly: send the next splash before it empties and the level climbs until it overflows. Auto-PEEP is the same — in an obstructed lung that exhales slowly, the next breath starts before the last one finishes, so air stacks, the chest over-fills, intrathoracic pressure rises, venous return drops, and BP falls.",
        "Clinical signs: rising PIP without rising Pplat; falling BP; patient \"fights\" the vent; expiratory flow waveform doesn't return to zero before next breath.",
        "Management: slow RR (often dramatically — to 8 or even 6). Lengthen exp time (I:E 1:4 or 1:5).",
        "If hemodynamically compromised: BRIEFLY DISCONNECT FROM THE VENT for 5–10 seconds. Trapped gas releases. BP often improves immediately. Reconnect on slower settings. Vented status asthmaticus has ~30% incidence of post-intubation hypotension — anticipate it."
      ],
      pearl: { title: "Brief disconnect", body: "Hypotensive asthmatic on the vent? Disconnect from the circuit for 5–10 sec. Release the trapped gas. BP often recovers in under a minute. Reconnect on slower settings." }
    },
    {
      id: "ards", kicker: "9.3 · ARDS", title: "Lung-Protective Ventilation",
      body: [
        "Acute Respiratory Distress Syndrome: diffuse alveolar damage, refractory hypoxia. Berlin definition (2012): bilateral infiltrates, not cardiac, within 1 week. Severity by P/F ratio: mild 200–300, moderate 100–200, severe < 100. A 2023/2024 Global Definition of ARDS now also allows diagnosis by SpO₂/FiO₂ and includes patients on HFNO ≥ 30 L/min or CPAP/NIV ≥ 5 cmH₂O — but the Berlin P/F severity bands remain in everyday bedside use.",
        "Goal: protect the alveoli you have left. The mental model is the 'baby lung' — in ARDS so much lung is flooded or collapsed that only a small, child-sized portion is still open to ventilate. You are not filling an adult lung; you are filling what survives. So: small breaths, modest pressure, generous PEEP — a normal-sized Vt would over-stretch those few survivors and injure them.",
        "Settings: AC/VC or AC/PC; Vt 4–6 mL/kg IBW (LOWER than usual); RR 18–22 to maintain MV; PEEP 10–15 per ARDSNet table; Pplat < 30; driving pressure (Pplat − PEEP) < 14 cmH₂O.",
        "ARDSNet ARMA (NEJM 2000): mortality 31% vs 40% comparing 6 vs 12 mL/kg IBW. NNT 11. The most evidence-based ARDS intervention."
      ],
      evidence: { title: "ARDSNet PEEP/FiO₂ Lower-PEEP Table", body: "FiO₂ 0.3 → PEEP 5. FiO₂ 0.5 → PEEP 8–10. FiO₂ 0.7 → PEEP 10–14. FiO₂ 1.0 → PEEP 18–24. Carry the card." }
    },
    {
      id: "ards-rescue", kicker: "9.4 · ARDS Rescue", title: "When Lung-Protective Isn't Enough",
      body: [
        "When lung-protective settings (6 mL/kg, Pplat < 30, ΔP < 14) aren't enough, these are the rescue options — roughly in order of evidence:",
        ["Prone positioning — PROSEVA (Guérin, NEJM 2013): 16 hr/day in severe ARDS (P/F < 150). Mortality 33% → 16%, NNT 6. The strongest single rescue.",
         "Neuromuscular blockade — ACURASYS (NEJM 2010) showed a mortality benefit with 48-hr cisatracurium; ROSE (NEJM 2019) didn't replicate it. Now reserved for severe dyssynchrony despite deep sedation.",
         "HFOV — OSCILLATE / OSCAR (NEJM 2013): no benefit; OSCILLATE was stopped for harm. Not first-line.",
         "ECMO — ICU-level. Transport teams may move ECMO patients but don't initiate. Notify the receiving facility early when standard care is failing."]
      ]
    },
    {
      id: "tbi", kicker: "9.5 · TBI", title: "Strict Normocapnia",
      body: [
        "Two enemies of the injured brain: hypoxia and hypotension. A single SpO₂ < 90 or SBP < 90 doubles mortality in moderate-severe TBI (Brain Trauma Foundation 4th ed., 2017).",
        "Strict normocapnia: target EtCO₂ 35–40 mmHg. Avoid prophylactic hyperventilation (BTF Level IIB recommendation) — drops cerebral blood flow and worsens secondary injury.",
        "Standard TBI settings: AC/VC, Vt 6–8 mL/kg IBW, RR 12–16 titrated to EtCO₂ 35–40, PEEP 5, FiO₂ to SpO₂ ≥ 94%, pressors ready. BTF age-stratified BP target: SBP ≥ 100 (ages 50–69), SBP ≥ 110 (other ages); for simplicity, target SBP > 100 in all adult TBI.",
        "Hyperventilation rescue (transient, for impending herniation only): increase RR to target EtCO₂ 30–35 mmHg (NEVER below 30). Return to normocapnia once the exam improves (typically 2–5 min)."
      ],
      pearl: { title: "Hyperventilation past the rescue window is harmful", body: "Use brief hyperventilation only for signs of impending herniation (Cushing's triad, blown pupil, posturing). Return EtCO₂ to 35–40 as soon as exam improves. EtCO₂ < 30 worsens ischemia." }
    },
    {
      id: "peds", kicker: "9.6 · Pediatrics", title: "Smaller Everything, Bigger Margins",
      body: [
        "Use length-based weight (Broselow / Handtevy) — don't guess. Vt 6–8 mL/kg of ACTUAL body weight in peds (different from adults).",
        "Age-based RR: infant 25–30, child 15–20, adolescent 12–16. PEEP starts 5; can go higher in severe parenchymal disease.",
        "PALS 2020: cuffed endotracheal tubes are preferred in most pediatric patients, including infants. Pay attention to cuff pressure to avoid tracheal injury.",
        "Most common pediatric error: adult circuit on a pediatric patient. Adult circuit dead space can exceed pediatric Vt — you're ventilating the circuit, not the lungs. Use the pediatric circuit. Verify visually."
      ]
    }
  ],

  quiz: {
    title: "Module 9 Knowledge Check",
    intro: "Ten questions on population-specific strategies.",
    passScore: 8,
    questions: [
      { q: "First-line strategy for status asthmaticus on the vent:",
        choices: ["Low rate (RR 8–10), long expiratory time (I:E 1:4–1:5), permissive hypercapnia", "High rate (RR 20+) to normalize CO₂", "High PEEP to splint airways", "Inverse I:E ratio"], answer: 0,
        rationale: "Asthma is an exhalation problem. Slow rate, long exp time, accept higher CO₂ (pH ≥ 7.20). High rate stacks breaths and drops BP via auto-PEEP." },
      { q: "PROSEVA (Guérin, NEJM 2013) demonstrated that:",
        choices: ["Prone positioning has no effect in ARDS", "Prone positioning reduces mortality in severe ARDS approximately by half", "Prone positioning is harmful", "Prone positioning is only useful in pediatric ARDS"], answer: 1,
        rationale: "PROSEVA: severe ARDS, 16-hr daily prone vs supine. Mortality 33% → 16% (absolute reduction 17%, NNT 6). Standard of care in severe ARDS." },
      { q: "Routine EtCO₂ target in TBI per Brain Trauma Foundation:",
        choices: ["35–40 mmHg", "25–30 mmHg", "30–35 mmHg", "45–50 mmHg"], answer: 0,
        rationale: "Strict normocapnia at 35–40 mmHg. Avoid prophylactic hyperventilation (BTF Level IIB). Hyperventilation only for transient herniation rescue (to 30–35, never below 30)." },
      { q: "ARDS patient (IBW 57 kg) on Vt 480 mL. Pplat is 32. The MOST appropriate next adjustment:",
        choices: ["Increase Vt to 600 mL", "Increase RR to 30 immediately", "Decrease Vt toward 4–6 mL/kg IBW (240–340 mL); accept higher CO₂ if needed", "Drop PEEP to 0"], answer: 2,
        rationale: "Pplat > 30 in ARDS = drop Vt. ARDSNet 6 mL/kg IBW (~340 mL here), down to 4 mL/kg if Pplat doesn't improve. Permissive hypercapnia OK; pH ≥ 7.20 typical floor." },
      { q: "A previously-stable vented asthmatic suddenly drops BP to 70/40. Flow waveform doesn't return to zero before next breath. The bedside maneuver to try FIRST is:",
        choices: ["Briefly disconnect from the vent for 5–10 seconds to release trapped gas", "Push fluids and norepinephrine", "Increase PEEP to splint airways", "Increase the rate to normalize CO₂"], answer: 0,
        rationale: "Auto-PEEP physiology — trapped gas → high intrathoracic pressure → preload drops → BP falls. Brief disconnect releases the trapped gas. BP often recovers in under a minute." },
      { q: "PALS 2020 guidance on ETT cuff type in most pediatric patients:",
        choices: ["Cuffed tubes are preferred, including in infants", "Uncuffed tubes are preferred", "Always use double-lumen tubes", "Only adolescents tolerate cuffed tubes"], answer: 0,
        rationale: "PALS 2020 recommends cuffed ETTs in most pediatric patients, including infants. Pay attention to cuff pressure to prevent tracheal injury." },
      { q: "Cushing's triad consists of:",
        choices: ["Hypertension, tachycardia, regular respirations", "Hypertension, bradycardia, irregular respirations", "Hypotension, tachycardia, tachypnea", "Hypotension, bradycardia, apnea"], answer: 1,
        rationale: "Cushing's triad: hypertension + bradycardia + irregular respirations. Sign of impending herniation. Trigger for transient hyperventilation rescue (EtCO₂ 30–35, never below 30)." },
      { q: "ARDSNet PEEP/FiO₂ lower-PEEP table: at FiO₂ 1.0, suggested PEEP is approximately:",
        choices: ["18–24 cmH₂O", "5 cmH₂O", "10 cmH₂O", "14 cmH₂O"], answer: 0,
        rationale: "ARDSNet lower-PEEP at FiO₂ 1.0 is PEEP 18–24 cmH₂O. PEEP and FiO₂ are paired together via the table — the worse the oxygenation, the higher both go." },
      { q: "Most common pediatric ventilation error:",
        choices: ["Setting RR too low", "Using cuffed ETT", "Using the adult circuit on a pediatric patient (dead space > Vt)", "Using normal saline"], answer: 2,
        rationale: "Adult circuit dead space can exceed a pediatric patient's tidal volume — ventilating the circuit, not the lungs. Always use the pediatric circuit and verify visually." },
      { q: "In TBI, prophylactic hyperventilation:",
        choices: ["Is recommended by BTF guidelines", "Is the first-line strategy", "Should be maintained for 24 hours after injury", "Is contraindicated except as transient herniation rescue"], answer: 3,
        rationale: "BTF 4th edition (2017) Level IIB recommendation: avoid prophylactic hyperventilation in TBI. Reserve hyperventilation for transient herniation rescue (EtCO₂ 30–35, never below 30, return to normocapnia after 2–5 min)." }
    ]
  },

  match: {
    title: "Population-Specific Strategy",
    intro: "Six clinical scenarios. Match each to the appropriate ventilator strategy.",
    bins: [
      { id: "obstructive", title: "Obstructive (low rate, long I:E)", sub: "Asthma / COPD" },
      { id: "lung-prot",   title: "Lung-Protective (low Vt)", sub: "ARDS" },
      { id: "normo",       title: "Strict Normocapnia (EtCO₂ 35–40)", sub: "TBI" }
    ],
    items: [
      { id: "asthmatic",   label: "30 yo asthmatic, EtCO₂ 70, fatigued", correctBin: "obstructive" },
      { id: "copd-tube",   label: "70 yo COPD, just intubated, EtCO₂ 65", correctBin: "obstructive" },
      { id: "sepsis-ards", label: "55 yo septic ARDS, P/F 90, Pplat climbing", correctBin: "lung-prot" },
      { id: "pna-ards",    label: "60 yo pneumonia → ARDS, refractory hypoxia", correctBin: "lung-prot" },
      { id: "head-trauma", label: "22 yo MVC, GCS 5, pupillary asymmetry", correctBin: "normo" },
      { id: "intracerebral", label: "Intracerebral hemorrhage, herniation risk", correctBin: "normo" }
    ],
    feedback: {
      pass: "Excellent. Obstructive disease (asthma/COPD) needs exhalation time and permissive hypercapnia. ARDS needs lung-protective (low Vt, generous PEEP, ΔP < 14). TBI needs strict normocapnia and avoidance of hypoxia/hypotension.",
      fail: "Review the population-specific lessons. Each clinical pattern has a different ventilator goal: let asthmatics exhale; protect ARDS alveoli; hold normocapnia in TBI."
    }
  },

  scenario: {
    title: "Scenario: TBI with Impending Herniation",
    intro: "22-year-old motorcyclist, unhelmeted MVC. Intubated at scene. You're on the ground transport to a Level I trauma center, 25 minutes out. Halfway through, things change.",
    patient: "22-year-old male, 80 kg, severe TBI from MVC. Intubated 30 min ago with RSI (ketamine + rocuronium). Sedated with fentanyl/midazolam.",
    vitals: [
      ["Settings",     "AC/VC, Vt 540, RR 14, FiO₂ 60%, PEEP 5"],
      ["EtCO₂",        "38 mmHg (had been 36)"],
      ["SpO₂",         "97%"],
      ["BP",           "188/108 (was 142/82 ten minutes ago)"],
      ["HR",           "52, sinus brady (was 88)"],
      ["Pupils",       "Right 7 mm fixed; left 3 mm reactive (was equal)"],
      ["Posturing",    "Decerebrate extension on noxious stim"]
    ],
    steps: [
      { prompt: "Q1. What's happening?",
        choices: [
          { label: "Pain response — push more fentanyl", outcome: "bad",
            feedback: "Cushing's triad (HTN + brady + irregular resp) + new blown pupil + decerebrate posturing = impending herniation, not pain. Acting on it as pain wastes critical time." },
          { label: "Impending herniation — Cushing's triad, blown right pupil, decerebrate posturing", outcome: "good",
            feedback: "Right. The constellation is unmistakable. He has rising ICP causing brainstem compression. You have a narrow window for rescue." },
          { label: "Sedation wearing off — push more midazolam", outcome: "bad",
            feedback: "These findings aren't sedation lightening — they're brainstem compression. More benzo will lower BP and worsen perfusion to an injured brain." }
        ] },
      { prompt: "Q2. The herniation rescue maneuver involves:",
        choices: [
          { label: "Aggressive hyperventilation to EtCO₂ 20–25", outcome: "bad",
            feedback: "Going below EtCO₂ 30 worsens cerebral ischemia. The rescue window is 30–35, NEVER below 30." },
          { label: "Transient increase in RR to target EtCO₂ 30–35 mmHg (NOT below 30); mannitol/hypertonic per protocol; head of bed up 30°", outcome: "good",
            feedback: "Correct. Target EtCO₂ 30–35 transiently. Push mannitol 1 g/kg or hypertonic saline per protocol. Head of bed up 30° if not contraindicated. Notify trauma/neurosurgery now." },
          { label: "Lower EtCO₂ to 25 and maintain there for transport", outcome: "bad",
            feedback: "Maintained hyperventilation worsens outcome. The rescue is BRIEF — return to normocapnia (35–40) within 2–5 min once the exam improves." }
        ] },
      { prompt: "Q3. You bump RR from 14 to 18, push hypertonic saline. Three minutes later: EtCO₂ 32, BP 162/94, HR 68, right pupil now 5 mm and sluggishly reactive, no posturing. What now?",
        choices: [
          { label: "Continue hyperventilating to EtCO₂ 25–30 throughout transport for safety", outcome: "bad",
            feedback: "The rescue worked. Sustained hyperventilation past the rescue window worsens outcome. Return EtCO₂ to 35–40 now that the exam is improving." },
          { label: "Drop RR back toward 14 and return EtCO₂ to 35–40 mmHg", outcome: "good",
            feedback: "Right. The exam improved within the rescue window. Return to normocapnia. Continue normocapnic settings for the rest of transport. Document the herniation event, the maneuver, and the response." },
          { label: "Stop ventilating to let CO₂ recover", outcome: "bad",
            feedback: "Don't ever stop ventilating a TBI patient. The strategy is gradual return — drop RR, let EtCO₂ drift back to 35–40 over a few minutes." }
        ] },
      { prompt: "Q4. BP creeps to 178/96 again on slow return. You're 12 min out. What's your priority?",
        choices: [
          { label: "Notify trauma/neurosurgery NOW with the herniation event timeline, BP trajectory, and current status", outcome: "good",
            feedback: "Right. Receiving team needs to know there was a herniation event so they can prep for emergent intervention (mannitol, possibly OR). Trajectory matters. Document everything." },
          { label: "Push more sedation to bring BP down", outcome: "bad",
            feedback: "BP > 100 SBP is the BTF target — don't actively lower it. The HTN here may reflect re-rising ICP. Notify receiving and stay vigilant rather than chase the number." },
          { label: "Decrease FiO₂ to 40%", outcome: "bad",
            feedback: "Wrong direction. TBI target is SpO₂ ≥ 94%. Don't drop FiO₂ when oxygenation is good — just maintain. Hypoxia in TBI doubles mortality." }
        ] }
    ],
    conclusion: "You arrive at the trauma bay with the patient stabilized at EtCO₂ 38, BP 152/82, HR 78, right pupil 5 mm sluggish but no longer blown, no posturing. The receiving team was alerted 12 minutes out, had mannitol and the OR ready, and takes the patient directly to neurosurgery for craniotomy. Documented timeline of the herniation event and the rescue maneuver supports their decisions. Recognizing the signs, acting within the rescue window, then returning to normocapnia: that is the textbook TBI transport. Hypoxia and hypotension are still the enemies. Don't add prolonged hyperventilation to the list."
  }
}

]; // END MODULES

// ---------- 1b. FINAL EXAM (capstone) ----------
// Cumulative exam, unlocked only after every module is complete.
const FINAL_EXAM = {
  title: "Final Certification Exam",
  intro: "Twenty-five cumulative questions drawn from all nine modules. You need 20 correct (80%) to pass and earn your certificate. Rationale appears after each answer.",
  passScore: 20,
  questions: [
    { q: "Minute ventilation — the volume of gas moved per minute — is the product of:",
      choices: ["Tidal volume × respiratory rate", "FiO₂ × PEEP", "PIP × Pplat", "Driving pressure × compliance"], answer: 0,
      rationale: "Minute ventilation = Vt × RR and is the primary determinant of CO₂ clearance. Oxygenation is governed by the other pair — FiO₂ and PEEP." },
    { q: "A vented patient is ventilating adequately (EtCO₂ 38) but remains hypoxic at SpO₂ 86%. Which two settings do you adjust?",
      choices: ["Respiratory rate and tidal volume", "Inspiratory time and rate", "FiO₂ and PEEP", "PIP and trigger sensitivity"], answer: 2,
      rationale: "Oxygenation is controlled by FiO₂ and PEEP. Raising RR/Vt would only blow off more CO₂ without fixing oxygenation." },
    { q: "PIP jumps from 24 to 40 cmH₂O. On an inspiratory hold, Pplat is 26 cmH₂O. The problem is in the:",
      choices: ["Lung parenchyma (compliance)", "Chest wall", "Ventilator calibration", "Airway (resistance)"], answer: 3,
      rationale: "High PIP with a near-normal Pplat isolates the problem to airway resistance — kink, secretions, bronchospasm, or biting. A compliance problem would raise Pplat too." },
    { q: "Driving pressure (ΔP), a key ARDS mortality predictor, is calculated as:",
      choices: ["PIP − PEEP", "PIP − Pplat", "Pplat + PEEP", "Pplat − PEEP"], answer: 3,
      rationale: "ΔP = Pplat − PEEP. Amato et al. (NEJM 2015) found ΔP > 14 cmH₂O strongly predicts ARDS mortality." },
    { q: "Tidal volume on a ventilated patient should be set according to:",
      choices: ["Actual body weight", "BMI", "Ideal body weight (height and sex)", "Body surface area"], answer: 2,
      rationale: "Vt tracks lung size, which scales with height — so it is set on ideal body weight. Using actual weight in an obese patient delivers injurious volumes." },
    { q: "The ARDSNet (ARMA) trial established a lung-protective tidal volume target of:",
      choices: ["4 mL/kg IBW", "10 mL/kg IBW", "12 mL/kg IBW", "6 mL/kg IBW"], answer: 3,
      rationale: "6 mL/kg IBW reduced mortality from ~40% to ~31% versus 12 mL/kg, with plateau pressure kept ≤ 30 cmH₂O." },
    { q: "To minimize ventilator-induced lung injury, plateau pressure should generally be kept at or below:",
      choices: ["20 cmH₂O", "40 cmH₂O", "30 cmH₂O", "50 cmH₂O"], answer: 2,
      rationale: "Pplat ≤ 30 cmH₂O is the lung-protective ceiling; Pplat reflects alveolar pressure and correlates with overdistension injury." },
    { q: "A pneumonia patient stays hypoxic despite FiO₂ 100% (shunt physiology). The most effective bedside correction is:",
      choices: ["Increase tidal volume", "Increase respiratory rate", "Increase inspiratory time", "Add/increase PEEP"], answer: 3,
      rationale: "Shunt is blood passing unventilated alveoli, so more FiO₂ can't reach them. PEEP recruits collapsed/flooded alveoli and reduces shunt fraction." },
    { q: "A COPD patient becomes acutely hypotensive with rising PIP and suspected auto-PEEP. Your FIRST maneuver is to:",
      choices: ["Increase the set PEEP", "Disconnect the circuit and allow full exhalation", "Increase the respiratory rate", "Give a fluid bolus and continue"], answer: 1,
      rationale: "Briefly disconnecting lets trapped air escape and relieves the hemodynamic compromise immediately. Then prevent recurrence with a lower rate and longer expiratory time." },
    { q: "To prevent auto-PEEP in an obstructed (COPD/asthma) patient you should:",
      choices: ["Lower the rate and prolong expiratory time", "Increase rate and tidal volume", "Increase inspiratory time", "Increase PEEP to match"], answer: 0,
      rationale: "Air trapping is an expiratory-time problem. Lower the rate, shorten inspiratory time, and target a longer expiratory phase (I:E 1:4 or greater)." },
    { q: "The appropriate I:E strategy for a severe asthmatic on the ventilator is:",
      choices: ["1:1", "1:2", "Prolonged expiration, 1:4 or greater", "Prolonged inspiration, 2:1"], answer: 2,
      rationale: "Obstructed lungs empty slowly. A long expiratory time (1:4+) prevents breath stacking and auto-PEEP." },
    { q: "A vented patient's capnography develops a 'shark-fin' upslope. This indicates:",
      choices: ["Hyperventilation", "Esophageal intubation", "Bronchospasm / obstructive airflow", "Cardiac arrest"], answer: 2,
      rationale: "Loss of the sharp alpha angle reflects uneven, obstructed expiratory flow — bronchospasm. Treat the obstruction; don't chase the number." },
    { q: "The capnography waveform suddenly drops to zero. After confirming the monitor works, the FIRST concern is:",
      choices: ["Tube dislodgement, circuit disconnect, or loss of perfusion", "Increased sedation need", "Hyperventilation", "Auto-PEEP"], answer: 0,
      rationale: "A sudden flatline means no CO₂ is reaching the sensor — dislodged/obstructed tube, disconnect, or arrest. Assess the patient and airway immediately." },
    { q: "The single most reliable method to confirm and continuously monitor ETT placement is:",
      choices: ["Auscultation of breath sounds", "Chest rise", "Pulse oximetry", "Waveform capnography"], answer: 3,
      rationale: "Sustained waveform capnography is the gold standard for confirming and monitoring tracheal placement. SpO₂ lags and breath sounds can mislead." },
    { q: "An ETT advanced too far usually enters the right mainstem because that bronchus:",
      choices: ["Is longer and narrower", "Branches at a steeper, more vertical angle (~25°)", "Lies anterior to the left", "Has more cartilage"], answer: 1,
      rationale: "The right mainstem leaves the trachea at ~25° versus ~45° on the left — the path of least resistance. Suspect it with asymmetric breath sounds and rising PIP." },
    { q: "Why can SpO₂ sit near 95% and then fall precipitously as a patient deteriorates?",
      choices: ["The oximeter is usually broken", "SpO₂ tracks PaO₂ linearly", "The oxyhemoglobin curve is flat up high, then drops steeply below ~90% / PaO₂ 60 mmHg", "Saturation is unrelated to PaO₂"], answer: 2,
      rationale: "On the flat upper curve, big PaO₂ changes barely move SpO₂. Past the steep portion (~90% / 60 mmHg), saturation falls fast — the 'cliff.'" },
    { q: "After return of spontaneous circulation, FiO₂ should be titrated to an SpO₂ target of:",
      choices: ["100% at all times", "85–90%", "90–98%", "As high as possible"], answer: 2,
      rationale: "Hyperoxia after ROSC is linked to worse neurologic outcomes. The 2025 AHA guidelines recommend titrating to SpO₂ 90–98% (prior target 92–98%) rather than leaving FiO₂ at 100%." },
    { q: "For a ventilated TBI patient WITHOUT herniation signs, the EtCO₂ target is:",
      choices: ["25–30 mmHg", "30–35 mmHg", "35–40 mmHg", "45–50 mmHg"], answer: 2,
      rationale: "Normocapnia (35–40) is the target. Hypercapnia raises ICP; prophylactic hyperventilation causes cerebral vasoconstriction and ischemia." },
    { q: "Controlled mild hyperventilation (EtCO₂ ~30–35) in TBI is appropriate ONLY when:",
      choices: ["The patient is intubated", "EtCO₂ reads above 40", "There are acute herniation signs (blown pupil, posturing, Cushing response)", "On every head injury"], answer: 2,
      rationale: "Hyperventilation is a temporary rescue for active herniation only and should not drop below 30. Return to normocapnia once the crisis is managed." },
    { q: "A previously wheezing asthmatic now has a 'silent chest.' This indicates:",
      choices: ["Resolved bronchospasm", "Critically reduced airflow — a pre-arrest sign", "Improving air movement", "A measurement artifact"], answer: 1,
      rationale: "Wheeze requires airflow. A silent chest in a severe asthmatic means almost no air is moving — impending respiratory arrest." },
    { q: "Noninvasive positive-pressure ventilation (CPAP/BiPAP) is best supported first-line in:",
      choices: ["A patient with a depressed gag who is vomiting", "Cardiac arrest", "Facial trauma with airway bleeding", "Cardiogenic pulmonary edema or COPD in an awake, cooperative patient"], answer: 3,
      rationale: "NPPV has the strongest evidence in cardiogenic pulmonary edema and COPD when the patient can protect their airway and cooperate. The others are contraindications." },
    { q: "Increasing PEEP can lower blood pressure primarily because it:",
      choices: ["Directly dilates arteries", "Causes bradycardia", "Raises intrathoracic pressure and reduces venous return (preload)", "Increases CO₂"], answer: 2,
      rationale: "Positive intrathoracic pressure impedes venous return, dropping preload and cardiac output — most pronounced when the patient is hypovolemic." },
    { q: "Which picture best characterizes Type II (hypercapnic) respiratory failure?",
      choices: ["Elevated PaCO₂ with respiratory acidosis", "Low PaO₂ with low/normal PaCO₂", "Normal gas with anxiety", "Isolated metabolic alkalosis"], answer: 0,
      rationale: "Type II is a ventilation (pump) failure — CO₂ rises and pH falls. Type I is an oxygenation failure with low PaO₂ and normal/low PaCO₂." },
    { q: "A high peak-pressure alarm on transport prompts the DOPE mnemonic, which stands for:",
      choices: ["Displacement, Obstruction, Pneumothorax, Equipment failure", "Disconnect, Oxygen, Pressure, EtCO₂", "Drugs, Output, PEEP, Edema", "Distension, Overfeeding, Perfusion, Embolism"], answer: 0,
      rationale: "DOPE: tube Displacement, Obstruction (secretions/kink/bite), Pneumothorax, Equipment failure. Work through it; if unresolved, disconnect and bag." },
    { q: "Plateau pressure is measured by:",
      choices: ["Reading PIP during a normal breath", "Performing an end-inspiratory hold (no gas flow)", "Performing an end-expiratory hold", "Subtracting PEEP from FiO₂"], answer: 1,
      rationale: "An end-inspiratory hold stops flow so pressure equilibrates to alveolar pressure — that is Pplat, reflecting compliance. An end-expiratory hold instead measures auto-PEEP." }
  ]
};

// ---------- 2. STATE / STORAGE ----------

const STORAGE_KEY = "vta-pwa-state-v2";

// ---------- ADMIN MODE ----------
// Unlocks every module and the final exam for review — lets an educator open any
// quiz, match, scenario, or the final exam without completing prerequisites.
// Three ways in: the "Admin" button in the footer (password-gated, persists on
// this device), or the ?admin / #admin URL shortcut. NOTE: this is a soft
// convenience gate, not real security — the password lives in this client file.
const ADMIN_PASSWORD = "amrkc-vent";
const ADMIN = (function () {
  try {
    if (localStorage.getItem("vta_admin") === "1") return true;
    return new URLSearchParams(location.search).has("admin") || /(?:^|[#&])admin\b/.test(location.hash);
  } catch (e) { return false; }
})();
function disableAdmin() {
  if (!confirm("Turn OFF admin mode? Modules will be gated normally again.")) return;
  try { localStorage.removeItem("vta_admin"); } catch (e) {}
  location.href = location.pathname;   // also drops any ?admin / #admin
}

// ---------- SCORE LOGGING (Google Sheets → exportable to Excel) ----------
// Paste the Web App /exec URL from vta-certifications-AppsScript.gs here to log
// each certification to your spreadsheet. Leave "" to disable logging.
const VTA_LOG_ENDPOINT = "";

const defaultModuleState = () => ({
  lessonsRead: {},
  quizResults: null,
  quizInProgress: null,
  matchResults: null,
  matchInProgress: null,
  scenarioResults: null,
  scenarioInProgress: null,
  completed: false
});

const Store = {
  state: {
    currentModule: null,
    modules: {},
    examResults: null,
    examInProgress: null,
    certificate: null
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state.currentModule = parsed.currentModule || null;
        this.state.modules = parsed.modules || {};
        this.state.examResults = parsed.examResults || null;
        this.state.examInProgress = parsed.examInProgress || null;
        this.state.certificate = parsed.certificate || null;
      }
    } catch (e) { /* ignore */ }
    // Ensure every defined module has an entry
    MODULES.forEach(m => {
      if (!this.state.modules[m.id]) this.state.modules[m.id] = defaultModuleState();
    });
  },

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); }
    catch (e) { /* ignore */ }
  },

  resetAll() {
    this.state = { currentModule: null, modules: {}, examResults: null, examInProgress: null, certificate: null };
    MODULES.forEach(m => { this.state.modules[m.id] = defaultModuleState(); });
    this.save();
  },

  resetModule(id) {
    this.state.modules[id] = defaultModuleState();
    this.save();
  },

  setCurrentModule(id) { this.state.currentModule = id; this.save(); },

  mod(id) {
    if (!this.state.modules[id]) this.state.modules[id] = defaultModuleState();
    return this.state.modules[id];
  },

  markLessonRead(modId, lessonId) { this.mod(modId).lessonsRead[lessonId] = true; this.save(); },
  setQuizResults(modId, r) { this.mod(modId).quizResults = r; this.mod(modId).quizInProgress = null; this.save(); },
  setQuizInProgress(modId, p) { this.mod(modId).quizInProgress = p; this.save(); },
  clearQuizInProgress(modId) { this.mod(modId).quizInProgress = null; this.save(); },
  setMatchResults(modId, r) { this.mod(modId).matchResults = r; this.mod(modId).matchInProgress = null; this.save(); },
  setMatchInProgress(modId, p) { this.mod(modId).matchInProgress = p; this.save(); },
  clearMatchInProgress(modId) { this.mod(modId).matchInProgress = null; this.save(); },
  setScenarioResults(modId, r) { this.mod(modId).scenarioResults = r; this.mod(modId).scenarioInProgress = null; this.save(); },
  setScenarioInProgress(modId, p) { this.mod(modId).scenarioInProgress = p; this.save(); },
  clearScenarioInProgress(modId) { this.mod(modId).scenarioInProgress = null; this.save(); },
  setCompleted(modId, b) { this.mod(modId).completed = b; this.save(); },

  // ---------- progress helpers ----------
  lessonsCount(modId) {
    const def = MODULES.find(m => m.id === modId);
    const m = this.mod(modId);
    return def ? def.lessons.filter(l => m.lessonsRead[l.id]).length : 0;
  },
  isLessonsDone(modId) {
    const def = MODULES.find(m => m.id === modId);
    return def && this.lessonsCount(modId) === def.lessons.length;
  },
  isQuizDone(modId)     { return !!this.mod(modId).quizResults; },
  isQuizPassed(modId)   {
    const r = this.mod(modId).quizResults;
    const def = MODULES.find(m => m.id === modId);
    return r && def && r.score >= def.quiz.passScore;
  },
  isMatchDone(modId)    { return !!this.mod(modId).matchResults; },
  isMatchPassed(modId)  {
    const r = this.mod(modId).matchResults;
    return r && r.correct === r.total;
  },
  isScenarioDone(modId) { return !!this.mod(modId).scenarioResults; },

  modulePercent(modId) {
    const def = MODULES.find(m => m.id === modId);
    if (!def) return 0;
    let score = 0;
    score += this.lessonsCount(modId) / def.lessons.length * 50;
    if (this.isQuizDone(modId)) score += 20;
    if (this.isMatchDone(modId)) score += 15;
    if (this.isScenarioDone(modId)) score += 15;
    return Math.round(score);
  },

  // ---------- Module completion and unlocking ----------
  isModuleComplete(modId) {
    // Strict completion: every component done AND quiz/match passed
    return this.isLessonsDone(modId)
      && this.isQuizPassed(modId)
      && this.isMatchPassed(modId)
      && this.isScenarioDone(modId);
  },

  isModuleUnlocked(modId) {
    // Module 1 always open; subsequent modules require previous to be complete
    if (ADMIN) return true;
    if (modId <= 1) return true;
    return this.isModuleComplete(modId - 1);
  },

  hasQuizInProgress(modId)    { return !!this.mod(modId).quizInProgress; },
  hasMatchInProgress(modId)   { return !!this.mod(modId).matchInProgress; },
  hasScenarioInProgress(modId) { return !!this.mod(modId).scenarioInProgress; },

  // ---------- Final exam & certificate ----------
  allModulesComplete()  { return MODULES.every(m => this.isModuleComplete(m.id)); },
  isExamUnlocked()      { return ADMIN || this.allModulesComplete(); },
  isExamDone()          { return !!this.state.examResults; },
  isExamPassed()        { return !!this.state.examResults && this.state.examResults.passed; },
  hasCertificate()      { return !!this.state.certificate; },
  hasExamInProgress()   { return !!this.state.examInProgress; },
  setExamResults(r)     { this.state.examResults = r; this.state.examInProgress = null; this.save(); },
  setExamInProgress(p)  { this.state.examInProgress = p; this.save(); },
  clearExamInProgress() { this.state.examInProgress = null; this.save(); },
  setCertificate(c)     { this.state.certificate = c; this.save(); }
};

// ---------- 3. NAVIGATION ----------

const Nav = {
  view: "course",     // "course", "module", "lessons", "quiz", "match", "scenario", "summary"
  moduleId: null,
  lessonIdx: 0,

  go(view, opts) {
    this.view = view;
    if (opts && typeof opts.idx === "number") this.lessonIdx = opts.idx;
    if (opts && opts.moduleId != null) { this.moduleId = opts.moduleId; Store.setCurrentModule(opts.moduleId); }
    if (view === "lessons" && this.moduleId != null) {
      const def = MODULES.find(m => m.id === this.moduleId);
      if (def) {
        if (this.lessonIdx >= def.lessons.length) this.lessonIdx = def.lessons.length - 1;
        if (this.lessonIdx < 0) this.lessonIdx = 0;
      }
    }
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  enterModule(id) {
    if (!Store.isModuleUnlocked(id)) {
      const prev = MODULES.find(m => m.id === id - 1);
      const prevTitle = prev ? prev.title : `Module ${id - 1}`;
      alert(`Module ${id} is locked.\n\nFinish Module ${id - 1} (${prevTitle}) first.\nYou need: all lessons read, quiz passed, match perfect, and scenario completed.`);
      return;
    }
    this.moduleId = id; Store.setCurrentModule(id); this.go("module");
  },
  exitToCourse()  { this.moduleId = null; Store.setCurrentModule(null); this.go("course"); }
};

// ---------- 4. RENDERING ----------

function el(tag, attrs, ...children) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, "");
      else if (v != null && v !== false) n.setAttribute(k, v);
    }
  }
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) c.forEach(cc => cc && n.appendChild(typeof cc === "string" ? document.createTextNode(cc) : cc));
    else n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
}

function mount(node) {
  const app = document.getElementById("app");
  app.innerHTML = "";
  node.classList.add("fade-in");
  app.appendChild(node);
}

function updateProgressPill() {
  let pct;
  if (Nav.view === "course") {
    const total = MODULES.length;
    const sum = MODULES.reduce((acc, m) => acc + Store.modulePercent(m.id), 0);
    pct = total === 0 ? 0 : Math.round(sum / total);
    document.getElementById("progressLabel").textContent = pct + "% course";
  } else if (Nav.moduleId != null) {
    pct = Store.modulePercent(Nav.moduleId);
    document.getElementById("progressLabel").textContent = pct + "% module";
  } else {
    pct = 0;
    document.getElementById("progressLabel").textContent = "0%";
  }
  document.getElementById("progressFill").style.width = pct + "%";

  // Brand subtitle
  const sub = document.querySelector(".brand-sub");
  if (sub) {
    if (Nav.moduleId != null) {
      const m = MODULES.find(mm => mm.id === Nav.moduleId);
      sub.textContent = m ? `Module ${m.id} · ${m.title}` : "Virtual Academy";
    } else {
      sub.textContent = "Virtual Academy · Course Hub";
    }
  }
}

function renderNav() {
  const nav = document.getElementById("appNav");
  nav.innerHTML = "";

  // Course-level nav: just one button back to course
  if (Nav.view === "course") {
    nav.appendChild(el("button", { class: "nav-pill active", type: "button", onclick: () => Nav.go("course") }, "Course Hub"));
    return;
  }

  // Final-exam / certificate views: single return-to-hub pill
  if (Nav.view === "exam" || Nav.view === "certform" || Nav.view === "certificate") {
    nav.appendChild(el("button", { class: "nav-pill", type: "button", onclick: () => Nav.exitToCourse() }, "← Course Hub"));
    const label = Nav.view === "certificate" ? "Certificate" : Nav.view === "certform" ? "Claim Certificate" : "Final Exam";
    nav.appendChild(el("button", { class: "nav-pill active", type: "button", onclick: () => {} }, label));
    return;
  }

  // Module-level nav
  const modId = Nav.moduleId;
  const items = [
    { id: "course", label: "← Course", done: false },
    { id: "module", label: "Hub", done: false },
    { id: "lessons", label: "Lessons", done: Store.isLessonsDone(modId) },
    { id: "quiz", label: "Quiz", done: Store.isQuizDone(modId) },
    { id: "match", label: "Match", done: Store.isMatchDone(modId) },
    { id: "scenario", label: "Scenario", done: Store.isScenarioDone(modId) },
    { id: "summary", label: "Summary", done: Store.mod(modId).completed }
  ];
  items.forEach(item => {
    const cls = ["nav-pill"];
    if (Nav.view === item.id) cls.push("active");
    if (item.done) cls.push("done");
    nav.appendChild(el("button", {
      class: cls.join(" "),
      type: "button",
      onclick: () => item.id === "course" ? Nav.exitToCourse() : Nav.go(item.id)
    }, item.label));
  });
}

// ---------- COURSE HUB ----------
function renderCourseHub() {
  const hero = el("div", { class: "hero" },
    el("div", { class: "hero-kicker" }, "Virtual Academy"),
    el("h1", { class: "hero-title" }, "Ventilator Training Academy"),
    el("p", { class: "hero-blurb" }, "Self-paced modules. Lessons, knowledge checks, drag-and-drop exercises, and clinical scenarios for AEMT and Paramedic providers. Progress saves to your browser as you go.")
  );

  const grid = el("div", { class: "hub-grid" });
  MODULES.forEach(m => {
    const pct = Store.modulePercent(m.id);
    const complete = Store.isModuleComplete(m.id);
    const unlocked = Store.isModuleUnlocked(m.id);

    let metaLeft, statusLabel, cardCls = "hub-card";
    if (!unlocked) {
      metaLeft = "🔒 Locked";
      statusLabel = "Locked";
      cardCls += " locked";
    } else if (complete) {
      metaLeft = "All sections passed";
      statusLabel = "Done";
    } else if (pct === 0) {
      metaLeft = "Not started";
      statusLabel = "Start";
    } else {
      metaLeft = "In progress";
      statusLabel = "Resume";
    }

    grid.appendChild(
      el("button", {
        class: cardCls, type: "button",
        onclick: () => Nav.enterModule(m.id)
      },
        el("span", { class: "hub-card-kicker" }, `Module ${m.id} · ~${m.estMin} min`),
        el("h2", { class: "hub-card-title" }, m.title),
        el("p", { class: "hub-card-desc" }, m.blurb),
        el("div", { class: "module-progress" },
          el("div", { class: "module-progress-bar" },
            el("div", { class: "module-progress-fill", style: `width: ${pct}%` })
          ),
          el("span", { class: "module-progress-label" }, unlocked ? `${pct}% complete` : "—")
        ),
        el("div", { class: "hub-card-meta" },
          el("span", null, metaLeft),
          el("span", { class: "hub-card-status" + (complete ? " done" : "") + (!unlocked ? " locked" : "") }, statusLabel)
        )
      )
    );
  });

  mount(el("div", null, hero, grid, buildSimulatorCard(), buildCapstoneCard(), buildResourcesCard()));
}

// Every hands-on simulator mission, in course order — the Practice Lab index.
const PRACTICE_MISSIONS = [
  { mod: "1 · 6", title: "Setup Walkthrough", sub: "Build every LTV control from scratch — the tutorial.", href: "../vent-ltv1200.html?level=1" },
  { mod: "2", title: "Which Kind of Failure?", sub: "Name Type I vs II, then treat it.", href: "../vent-ltv1200.html?scenario=failure-type" },
  { mod: "3", title: "Tube or Mask?", sub: "The NIV-vs-intubation indication call, then set BiPAP.", href: "../vent-ltv1200.html?scenario=niv-vs-tube" },
  { mod: "4", title: "Initial Settings", sub: "Safe starting settings on a fresh intubation.", href: "../vent-ltv1200.html?scenario=initial-settings" },
  { mod: "5", title: "Non-Invasive Setup", sub: "CPAP for the awake CHF patient.", href: "../vent-ltv1200.html?scenario=niv-setup" },
  { mod: "7", title: "Clinical Scenarios", sub: "Six graded cases — alarms, ARDS, COPD & more.", href: "../vent-ltv1200.html?level=2" },
  { mod: "8", title: "Not Every Fight Is a Knob", sub: "Recognize when the fix is a drug, not a setting.", href: "../vent-ltv1200.html?scenario=agitation" },
  { mod: "9", title: "Advanced Management", sub: "Six advanced multi-parameter cases.", href: "../vent-ltv1200.html?level=3" },
  { mod: "★", title: "Capstone — The Whole Package", sub: "Severe ARDS to ECMO: everything at once.", href: "../vent-ltv1200.html?scenario=capstone" },
];

// Practice Lab index: browse every hands-on LTV 1200 mission in one place.
function buildSimulatorCard() {
  const rows = PRACTICE_MISSIONS.map(pm =>
    el("a", { class: "practice-row", href: pm.href },
      el("span", { class: "practice-mod" }, pm.mod),
      el("span", { class: "practice-text" },
        el("span", { class: "practice-title" }, pm.title),
        el("span", { class: "practice-sub" }, pm.sub)
      ),
      el("span", { class: "resource-arr" }, "→")
    )
  );
  return el("div", { class: "resources practice-lab" },
    el("p", { class: "resources-kicker" }, "Practice Lab · LTV 1200 Simulator"),
    el("div", { class: "practice-list" }, ...rows)
  );
}

// Course resources — link to the full written Provider Manual.
function buildResourcesCard() {
  return el("div", { class: "resources" },
    el("p", { class: "resources-kicker" }, "Course Resources"),
    el("a", { class: "resource-link", href: "Provider_Manual.docx", target: "_blank", rel: "noopener", download: "VTA_Provider_Manual.docx" },
      el("span", { class: "resource-ico" }, "📘"),
      el("span", { class: "resource-text" },
        el("span", { class: "resource-title" }, "Provider Manual"),
        el("span", { class: "resource-sub" }, "The full written reference for the academy (.docx)")
      ),
      el("span", { class: "resource-arr" }, "↓")
    )
  );
}

// Capstone card: final exam → certificate, gated behind all modules complete.
function buildCapstoneCard() {
  const unlocked = Store.isExamUnlocked();
  const certified = Store.hasCertificate();
  const examDone = Store.isExamDone();
  const examPassed = Store.isExamPassed();
  const doneCount = MODULES.filter(m => Store.isModuleComplete(m.id)).length;

  let kicker, title, desc, action, onclick, cls = "capstone";

  if (certified) {
    cls += " certified";
    kicker = "★ Certified";
    title = "Ventilator Academy — Certified";
    desc = "You've earned it. View, print, or save your certificate of completion.";
    action = "View Certificate →";
    onclick = () => Nav.go("certificate");
  } else if (!unlocked) {
    cls += " locked";
    kicker = "🔒 Capstone — Locked";
    title = "Final Certification Exam";
    desc = `Complete all nine modules to unlock the final exam. ${doneCount} of ${MODULES.length} modules done.`;
    action = `${doneCount}/${MODULES.length} modules`;
    onclick = null;
  } else if (examPassed) {
    // Passed but hasn't claimed certificate yet
    kicker = "✓ Exam Passed";
    title = "Claim Your Certificate";
    desc = "You passed the final exam. Enter your details to generate your certificate.";
    action = "Claim Certificate →";
    onclick = () => Nav.go("certform");
  } else if (examDone) {
    kicker = "Capstone — Retake";
    title = "Final Certification Exam";
    const r = Store.state.examResults;
    desc = `Last attempt: ${r.score}/${r.total}. You need ${FINAL_EXAM.passScore}/${r.total} to pass. Review the modules and try again.`;
    action = "Retake Exam →";
    onclick = () => { ExamState.reset(); Nav.go("exam"); };
  } else {
    const resuming = Store.hasExamInProgress();
    kicker = "★ Capstone — Unlocked";
    title = "Final Certification Exam";
    desc = resuming
      ? "You have a final exam in progress — pick up where you left off."
      : `All modules complete. ${FINAL_EXAM.questions.length} cumulative questions, ${FINAL_EXAM.passScore}/${FINAL_EXAM.questions.length} (80%) to pass and earn your certificate.`;
    action = resuming ? "Resume Exam →" : "Begin Final Exam →";
    onclick = () => { ExamState.enter(); Nav.go("exam"); };
  }

  return el("button", { class: cls, type: "button", disabled: onclick == null, onclick: onclick || (() => {}) },
    el("span", { class: "capstone-kicker" }, kicker),
    el("h2", { class: "capstone-title" }, title),
    el("p", { class: "capstone-desc" }, desc),
    el("span", { class: "capstone-action" }, action)
  );
}

// ---------- MODULE HUB ----------
function renderModuleHome() {
  const m = MODULES.find(mm => mm.id === Nav.moduleId);
  if (!m) { Nav.exitToCourse(); return; }
  const ms = Store.mod(m.id);

  const hero = el("div", { class: "hero" },
    el("div", { class: "hero-kicker" }, `Module ${m.id}`),
    el("h1", { class: "hero-title" }, m.title),
    el("p", { class: "hero-blurb" }, m.blurb),
  );

  const quizResume = Store.hasQuizInProgress(m.id) && !Store.isQuizDone(m.id);
  const matchResume = Store.hasMatchInProgress(m.id) && !Store.isMatchDone(m.id);
  const scenarioResume = Store.hasScenarioInProgress(m.id) && !Store.isScenarioDone(m.id);
  const lessonsStarted = Store.lessonsCount(m.id) > 0 && !Store.isLessonsDone(m.id);

  const cards = [
    {
      kicker: "Read",
      title: "Lessons",
      desc: `${m.lessons.length} short sections.`,
      meta: `${Store.lessonsCount(m.id)} / ${m.lessons.length} read`,
      status: Store.isLessonsDone(m.id) ? "Complete" : lessonsStarted ? "Resume" : "Start",
      done: Store.isLessonsDone(m.id),
      onClick: () => Nav.go("lessons", { idx: lessonsStarted ? findResumeLesson(m) : 0 })
    },
    {
      kicker: "Knowledge",
      title: m.quiz.title.replace(/Module \d+ /, ""),
      desc: `${m.quiz.questions.length} questions. Pass at ${m.quiz.passScore}/${m.quiz.questions.length}.`,
      meta: Store.isQuizDone(m.id)
        ? `Score ${ms.quizResults.score}/${ms.quizResults.total}`
        : quizResume ? `Question ${(ms.quizInProgress.idx || 0) + 1} of ${m.quiz.questions.length}` : "Not started",
      status: Store.isQuizDone(m.id) ? (Store.isQuizPassed(m.id) ? "Passed" : "Retake") : quizResume ? "Resume" : "Start",
      done: Store.isQuizDone(m.id),
      onClick: () => Nav.go("quiz")
    },
    {
      kicker: "Apply",
      title: m.match.title,
      desc: m.match.intro,
      meta: Store.isMatchDone(m.id)
        ? `${ms.matchResults.correct}/${ms.matchResults.total} correct`
        : matchResume ? "Items placed, not yet submitted" : "Not started",
      status: Store.isMatchDone(m.id) ? (Store.isMatchPassed(m.id) ? "Passed" : "Retry") : matchResume ? "Resume" : "Start",
      done: Store.isMatchDone(m.id),
      onClick: () => Nav.go("match")
    },
    {
      kicker: "Decide",
      title: "Clinical Scenario",
      desc: m.scenario.intro,
      meta: Store.isScenarioDone(m.id) ? "Completed"
        : scenarioResume ? `Decision ${(ms.scenarioInProgress.stepIdx || 0) + 1} of ${m.scenario.steps.length}` : "Not started",
      status: Store.isScenarioDone(m.id) ? "Review" : scenarioResume ? "Resume" : "Start",
      done: Store.isScenarioDone(m.id),
      onClick: () => Nav.go("scenario")
    }
  ];

  function findResumeLesson(mod) {
    for (let i = 0; i < mod.lessons.length; i++) {
      if (!Store.mod(mod.id).lessonsRead[mod.lessons[i].id]) return i;
    }
    return 0;
  }

  const grid = el("div", { class: "hub-grid" });
  cards.forEach(c => {
    grid.appendChild(
      el("button", { class: "hub-card", type: "button", onclick: c.onClick },
        el("span", { class: "hub-card-kicker" }, c.kicker),
        el("h2", { class: "hub-card-title" }, c.title),
        el("p", { class: "hub-card-desc" }, c.desc),
        el("div", { class: "hub-card-meta" },
          el("span", null, c.meta),
          el("span", { class: "hub-card-status" + (c.done ? " done" : "") }, c.status)
        )
      )
    );
  });

  const exit = el("div", { style: "margin-top: 1rem; text-align: center;" },
    el("button", { class: "btn btn-ghost", type: "button", onclick: () => Nav.exitToCourse() }, "← Back to Course Hub")
  );

  const container = el("div", null, hero, grid);

  // Optional hands-on tie-in to the ventilator simulator. A module can point at a
  // purpose-built academy scenario (practiceScenario) or a whole difficulty level.
  if (m.practiceScenario || m.practiceLevel) {
    const href = m.practiceScenario
      ? `../vent-ltv1200.html?scenario=${m.practiceScenario}`
      : `../vent-ltv1200.html?level=${m.practiceLevel}`;
    container.appendChild(
      el("div", { class: "resources" },
        el("p", { class: "resources-kicker" }, "Practice Lab"),
        el("a", { class: "resource-link", href },
          el("span", { class: "resource-ico" }, "🫁"),
          el("span", { class: "resource-text" },
            el("span", { class: "resource-title" }, m.practiceScenario ? "Simulator Scenario" : "Practice on the Simulator"),
            el("span", { class: "resource-sub" }, m.practiceNote || "Apply this module on the LTV 1200 simulator.")
          ),
          el("span", { class: "resource-arr" }, "→")
        )
      )
    );
  }

  container.appendChild(exit);

  if (ms.completed) {
    container.insertBefore(
      el("div", { class: "card", style: "background: linear-gradient(135deg, #2e8b57 0%, #1c6e3f 100%); color: white;" },
        el("p", { class: "hub-card-kicker", style: "color: #FFE9D6;" }, "Module Complete"),
        el("h2", { class: "section-title", style: "color: white; margin-bottom: 0.5rem;" }, "Well done."),
        el("p", { style: "color: rgba(255,255,255,0.92); margin: 0;" }, "All four components done. Click Summary in the bottom navigation for the scorecard, or return to the Course Hub for the next module.")
      ),
      grid
    );
  }

  mount(container);
}

// ---------- LESSONS ----------
function renderLessons() {
  const m = MODULES.find(mm => mm.id === Nav.moduleId);
  if (!m) { Nav.exitToCourse(); return; }
  const lesson = m.lessons[Nav.lessonIdx];

  const dots = el("div", { class: "lesson-dots" });
  m.lessons.forEach((l, i) => {
    const cls = ["lesson-dot"];
    if (Store.mod(m.id).lessonsRead[l.id]) cls.push("done");
    if (i === Nav.lessonIdx) cls.push("current");
    dots.appendChild(el("span", { class: cls.join(" "), title: l.title }));
  });

  const progressRow = el("div", { class: "lesson-progress" },
    el("span", null, `Lesson ${Nav.lessonIdx + 1} of ${m.lessons.length}`),
    dots
  );

  const card = el("article", { class: "card" },
    el("p", { class: "section-kicker" }, lesson.kicker),
    el("h1", { class: "section-title" }, lesson.title),
    el("div", { class: "section-body" }, ...lesson.body.map(p =>
      Array.isArray(p)
        ? el("ul", { class: "lesson-list" }, ...p.map(li => el("li", null, li)))
        : el("p", null, p))),
    lesson.pearl && el("aside", { class: "callout callout-pearl" },
      el("span", { class: "callout-label" }, `Clinical Pearl · ${lesson.pearl.title}`),
      lesson.pearl.body),
    lesson.evidence && el("aside", { class: "callout callout-evidence" },
      el("span", { class: "callout-label" }, `Evidence · ${lesson.evidence.title}`),
      lesson.evidence.body),
    lesson.kc && el("aside", { class: "callout callout-kc" },
      el("span", { class: "callout-label" }, `AMR Kansas City Formulary · ${lesson.kc.title}`),
      Array.isArray(lesson.kc.body)
        ? el("ul", { class: "callout-list" }, ...lesson.kc.body.map(li => el("li", null, li)))
        : lesson.kc.body)
  );

  const isLast = Nav.lessonIdx === m.lessons.length - 1;
  const isFirst = Nav.lessonIdx === 0;

  const buttons = el("div", { class: "button-row" },
    el("button", { class: "btn btn-ghost", type: "button", disabled: isFirst,
      onclick: () => Nav.go("lessons", { idx: Nav.lessonIdx - 1 }) }, "← Back"),
    el("button", { class: "btn btn-primary", type: "button",
      onclick: () => {
        Store.markLessonRead(m.id, lesson.id);
        if (isLast) Nav.go("quiz");
        else Nav.go("lessons", { idx: Nav.lessonIdx + 1 });
        updateProgressPill();
        renderNav();
      }
    }, isLast ? "Finish & Start Quiz →" : "Got It, Next →")
  );

  mount(el("div", null, progressRow, card, buttons));
}

// ---------- QUIZ ----------
const QuizState = {
  modId: null, idx: 0, picked: null, answers: [],

  enter(modId) {
    this.modId = modId;
    const saved = Store.mod(modId).quizInProgress;
    if (saved) {
      this.idx = saved.idx || 0;
      this.picked = (saved.picked === undefined) ? null : saved.picked;
      this.answers = saved.answers || [];
    } else {
      this.idx = 0; this.picked = null; this.answers = [];
    }
  },

  persist() {
    if (this.modId == null) return;
    Store.setQuizInProgress(this.modId, { idx: this.idx, picked: this.picked, answers: this.answers });
  },

  reset() {
    if (this.modId != null) Store.clearQuizInProgress(this.modId);
    this.idx = 0; this.picked = null; this.answers = [];
  }
};

function renderQuiz() {
  const m = MODULES.find(mm => mm.id === Nav.moduleId);
  if (!m) { Nav.exitToCourse(); return; }
  if (QuizState.modId !== m.id) QuizState.enter(m.id);

  if (QuizState.idx < m.quiz.questions.length) renderQuizQuestion(m);
  else renderQuizResults(m);
}

function renderQuizQuestion(m) {
  const q = m.quiz.questions[QuizState.idx];
  const picked = QuizState.picked;
  const answered = picked != null;

  const optionsContainer = el("div", { class: "quiz-options" });
  q.choices.forEach((choice, i) => {
    const cls = ["quiz-option"];
    if (answered) {
      if (i === q.answer) cls.push("correct");
      else if (i === picked) cls.push("incorrect");
    } else if (picked === i) cls.push("selected");
    optionsContainer.appendChild(
      el("button", {
        class: cls.join(" "), type: "button", disabled: answered,
        onclick: answered ? null : () => { QuizState.picked = i; QuizState.persist(); renderQuiz(); }
      },
        el("span", { class: "quiz-letter" }, ["A", "B", "C", "D"][i]),
        el("span", null, choice)
      )
    );
  });

  const card = el("article", { class: "quiz-question" },
    el("p", { class: "quiz-question-number" }, `Question ${QuizState.idx + 1} of ${m.quiz.questions.length}`),
    el("h2", { class: "quiz-question-text" }, q.q),
    optionsContainer
  );

  if (answered) {
    const correct = picked === q.answer;
    card.appendChild(
      el("div", { class: "feedback " + (correct ? "feedback-correct" : "feedback-incorrect") },
        el("span", { class: "feedback-label" }, correct ? "Correct." : `Incorrect (answer: ${["A","B","C","D"][q.answer]}).`),
        q.rationale
      )
    );
  }

  const buttons = el("div", { class: "button-row" },
    el("button", { class: "btn btn-ghost", type: "button", onclick: () => Nav.go("module") }, "Exit"),
    !answered
      ? el("button", { class: "btn btn-primary", type: "button", disabled: true }, "Select an answer")
      : el("button", {
          class: "btn btn-primary", type: "button",
          onclick: () => {
            // Record this question's answer before advancing. (Indexed by
            // question so re-renders/resumes can't double-count.)
            QuizState.answers[QuizState.idx] = { picked, correct: picked === q.answer };
            QuizState.idx++;
            QuizState.picked = null;
            QuizState.persist();
            renderQuiz();
          }
        }, QuizState.idx === m.quiz.questions.length - 1 ? "See Results →" : "Next Question →")
  );

  mount(el("div", null, card, buttons));
}

function renderQuizResults(m) {
  const correctCount = QuizState.answers.filter(a => a.correct).length;
  const total = m.quiz.questions.length;
  const passed = correctCount >= m.quiz.passScore;
  Store.setQuizResults(m.id, { score: correctCount, total, passed, answers: QuizState.answers });

  const message = passed
    ? "You've cleared this module's knowledge check."
    : `Below the ${m.quiz.passScore}/${total} pass line. Review the lessons and retake the quiz.`;

  const card = el("div", { class: "results-card" },
    el("p", { class: "section-kicker" }, "Knowledge Check Results"),
    el("p", { class: "results-score" }, String(correctCount), el("small", null, ` / ${total}`)),
    el("p", { class: "results-message" }, message),
    el("div", { class: "button-row", style: "justify-content: center;" },
      el("button", { class: "btn btn-ghost", type: "button",
        onclick: () => { QuizState.reset(); renderQuiz(); } }, "Retake Quiz"),
      el("button", { class: "btn btn-primary", type: "button",
        onclick: () => { QuizState.reset(); Nav.go(passed ? "match" : "lessons", { idx: 0 }); } },
        passed ? "Continue to Match →" : "Back to Lessons")
    )
  );

  updateProgressPill();
  renderNav();
  mount(card);
}

// ---------- MATCH ----------
const MatchState = {
  modId: null, selectedId: null, placements: {}, submitted: false,

  enter(modId) {
    this.modId = modId;
    const saved = Store.mod(modId).matchInProgress;
    if (saved) {
      this.selectedId = saved.selectedId || null;
      this.placements = saved.placements || {};
      this.submitted = !!saved.submitted;
    } else {
      this.selectedId = null; this.placements = {}; this.submitted = false;
    }
  },

  persist() {
    if (this.modId == null) return;
    Store.setMatchInProgress(this.modId, {
      selectedId: this.selectedId, placements: this.placements, submitted: this.submitted
    });
  },

  reset() {
    if (this.modId != null) Store.clearMatchInProgress(this.modId);
    this.selectedId = null; this.placements = {}; this.submitted = false;
  }
};

function renderMatch() {
  const m = MODULES.find(mm => mm.id === Nav.moduleId);
  if (!m) { Nav.exitToCourse(); return; }
  if (MatchState.modId !== m.id) MatchState.enter(m.id);

  const data = m.match;
  const placedSet = new Set(Object.keys(MatchState.placements));
  const remaining = data.items.filter(it => !placedSet.has(it.id));

  const pool = el("section", { class: "dnd-pool" },
    el("p", { class: "dnd-pool-label" }, "Drag pool"),
    el("div", { class: "dnd-items" },
      remaining.length === 0
        ? el("span", { style: "color: #888;" }, "All items placed.")
        : remaining.map(it => {
            const cls = ["dnd-item"];
            if (MatchState.selectedId === it.id) cls.push("selected");
            return el("button", {
              class: cls.join(" "), type: "button", disabled: MatchState.submitted,
              onclick: () => {
                MatchState.selectedId = MatchState.selectedId === it.id ? null : it.id;
                MatchState.persist();
                renderMatch();
              }
            }, it.label);
          })
    )
  );

  const binsContainer = el("div", { class: "dnd-bins" + (data.bins.length === 3 ? " three" : "") });
  data.bins.forEach(bin => {
    const itemsInBin = data.items.filter(it => MatchState.placements[it.id] === bin.id);
    const cls = ["dnd-bin"];
    if (MatchState.selectedId) cls.push("active-target");

    const binNode = el("div", {
      class: cls.join(" "),
      onclick: () => {
        if (!MatchState.selectedId || MatchState.submitted) return;
        MatchState.placements[MatchState.selectedId] = bin.id;
        MatchState.selectedId = null;
        MatchState.persist();
        renderMatch();
      }
    },
      el("h3", { class: "dnd-bin-title" }, bin.title),
      el("p", { class: "dnd-bin-sub" }, bin.sub),
      el("div", { class: "dnd-items" },
        itemsInBin.length === 0
          ? el("span", { style: "color:#888; font-size: 0.9rem;" }, "Tap an item then tap here.")
          : itemsInBin.map(it => {
              const itemCls = ["dnd-item", "placed"];
              if (MatchState.submitted) itemCls.push(it.correctBin === bin.id ? "correct" : "incorrect");
              return el("button", {
                class: itemCls.join(" "), type: "button", disabled: MatchState.submitted,
                onclick: (e) => {
                  e.stopPropagation();
                  if (MatchState.submitted) return;
                  delete MatchState.placements[it.id];
                  MatchState.persist();
                  renderMatch();
                }
              }, it.label);
            })
      )
    );
    binsContainer.appendChild(binNode);
  });

  const allPlaced = remaining.length === 0;
  const correct = data.items.filter(it => MatchState.placements[it.id] === it.correctBin).length;
  const passed = correct === data.items.length;

  let feedbackNode = null;
  if (MatchState.submitted) {
    feedbackNode = el("div", { class: "feedback " + (passed ? "feedback-correct" : "feedback-incorrect") },
      el("span", { class: "feedback-label" }, passed ? `Perfect — ${correct}/${data.items.length}.` : `${correct}/${data.items.length} correct.`),
      passed ? data.feedback.pass : data.feedback.fail
    );
  }

  const buttons = el("div", { class: "button-row" },
    el("button", { class: "btn btn-ghost", type: "button", onclick: () => Nav.go("module") }, "Exit"),
    MatchState.submitted
      ? el("div", { class: "button-row", style: "gap: 0.5rem; margin: 0;" },
          el("button", { class: "btn btn-ghost", type: "button",
            onclick: () => {
              // Retry — clear both saved results and in-progress, allow re-submission
              MatchState.reset();
              MatchState.modId = m.id;
              renderMatch();
            } }, "Retry"),
          el("button", { class: "btn btn-primary", type: "button",
            onclick: () => { MatchState.reset(); Nav.go("scenario"); } }, "Continue to Scenario →")
        )
      : el("button", {
          class: "btn btn-primary", type: "button", disabled: !allPlaced,
          onclick: () => {
            MatchState.submitted = true;
            Store.setMatchResults(m.id, { correct, total: data.items.length });
            updateProgressPill();
            renderNav();
            renderMatch();
          }
        }, "Submit")
  );

  const instructions = el("div", { class: "dnd-instructions" },
    el("p", { class: "section-kicker" }, "Exercise"),
    el("h1", { class: "section-title" }, data.title),
    el("p", { style: "margin: 0; color: var(--muted);" }, data.intro)
  );

  mount(el("div", null, instructions, pool, binsContainer, feedbackNode, buttons));
}

// ---------- SCENARIO ----------
const ScenarioState = {
  modId: null, stepIdx: 0, choices: [], awaiting: true, lastFeedback: null, lastOutcome: null,

  enter(modId) {
    this.modId = modId;
    const saved = Store.mod(modId).scenarioInProgress;
    if (saved) {
      this.stepIdx = saved.stepIdx || 0;
      this.choices = saved.choices || [];
      this.awaiting = saved.awaiting !== false;
      this.lastFeedback = saved.lastFeedback || null;
      this.lastOutcome = saved.lastOutcome || null;
    } else {
      this.stepIdx = 0; this.choices = []; this.awaiting = true;
      this.lastFeedback = null; this.lastOutcome = null;
    }
  },

  persist() {
    if (this.modId == null) return;
    Store.setScenarioInProgress(this.modId, {
      stepIdx: this.stepIdx, choices: this.choices, awaiting: this.awaiting,
      lastFeedback: this.lastFeedback, lastOutcome: this.lastOutcome
    });
  },

  reset() {
    if (this.modId != null) Store.clearScenarioInProgress(this.modId);
    this.stepIdx = 0; this.choices = []; this.awaiting = true;
    this.lastFeedback = null; this.lastOutcome = null;
  }
};

function renderScenario() {
  const m = MODULES.find(mm => mm.id === Nav.moduleId);
  if (!m) { Nav.exitToCourse(); return; }
  if (ScenarioState.modId !== m.id) ScenarioState.enter(m.id);

  const s = m.scenario;
  const totalSteps = s.steps.length;

  const vitalsGrid = el("div", { class: "vitals-grid" });
  s.vitals.forEach(([k, v]) => {
    vitalsGrid.appendChild(el("span", { class: "vitals-key" }, k));
    vitalsGrid.appendChild(el("span", { class: "vitals-val" }, v));
  });
  const vitalsCard = el("div", { class: "vitals" },
    el("p", { class: "vitals-label" }, "Patient"),
    el("p", { class: "vitals-patient" }, s.patient),
    vitalsGrid
  );

  if (ScenarioState.stepIdx >= totalSteps) {
    Store.setScenarioResults(m.id, { choices: ScenarioState.choices });
    updateProgressPill();
    renderNav();
    const goodCount = ScenarioState.choices.filter(c => c === "good").length;

    const card = el("article", { class: "scenario-card" },
      el("p", { class: "section-kicker" }, "Scenario Complete"),
      el("h1", { class: "section-title" }, "Outcome"),
      el("p", { style: "margin-bottom: 1rem;" }, s.conclusion),
      el("div", { class: "scenario-result info" },
        el("span", { class: "scenario-result-label" }, `Decision accuracy: ${goodCount} / ${totalSteps}`),
        goodCount === totalSteps
          ? "All decisions on first try. You navigated the case the way the textbook does."
          : "Review the feedback for the steps where you picked a partial or incorrect option."
      ),
      el("div", { class: "button-row" },
        el("button", { class: "btn btn-ghost", type: "button",
          onclick: () => { ScenarioState.reset(); ScenarioState.modId = m.id; renderScenario(); } }, "Replay Scenario"),
        el("button", { class: "btn btn-primary", type: "button",
          onclick: () => { ScenarioState.reset(); Store.setCompleted(m.id, true); Nav.go("summary"); } },
          "Continue to Summary →")
      )
    );

    mount(el("div", null, vitalsCard, card));
    return;
  }

  const step = s.steps[ScenarioState.stepIdx];
  const promptCard = el("article", { class: "scenario-card" },
    el("p", { class: "section-kicker" }, `Decision ${ScenarioState.stepIdx + 1} of ${totalSteps}`),
    el("h2", { class: "scenario-prompt" }, step.prompt)
  );

  if (ScenarioState.awaiting) {
    step.choices.forEach((c, i) => {
      promptCard.appendChild(
        el("button", {
          class: "scenario-choice", type: "button",
          onclick: () => {
            ScenarioState.awaiting = false;
            ScenarioState.lastFeedback = c.feedback;
            ScenarioState.lastOutcome = c.outcome;
            ScenarioState.choices.push(c.outcome);
            ScenarioState.persist();
            renderScenario();
          }
        }, `${["A", "B", "C", "D"][i]}.  ${c.label}`)
      );
    });
  } else {
    const cls = ScenarioState.lastOutcome === "good" ? "good"
              : ScenarioState.lastOutcome === "bad"  ? "bad" : "info";
    const label = ScenarioState.lastOutcome === "good" ? "Correct"
              : ScenarioState.lastOutcome === "bad" ? "Wrong move" : "Not quite";
    promptCard.appendChild(
      el("div", { class: "scenario-result " + cls },
        el("span", { class: "scenario-result-label" }, label),
        ScenarioState.lastFeedback
      )
    );

    const onCorrect = ScenarioState.lastOutcome === "good";
    promptCard.appendChild(
      el("div", { class: "button-row" },
        onCorrect ? null : el("button", {
          class: "btn btn-ghost", type: "button",
          onclick: () => {
            ScenarioState.awaiting = true;
            ScenarioState.choices.pop();
            ScenarioState.persist();
            renderScenario();
          }
        }, "Try Again"),
        el("button", {
          class: "btn btn-primary", type: "button",
          onclick: () => {
            ScenarioState.stepIdx++;
            ScenarioState.awaiting = true;
            ScenarioState.lastFeedback = null;
            ScenarioState.lastOutcome = null;
            ScenarioState.persist();
            renderScenario();
          }
        }, ScenarioState.stepIdx === totalSteps - 1 ? "See Outcome →" : "Next Decision →")
      )
    );
  }

  mount(el("div", null, vitalsCard, promptCard));
}

// ---------- SUMMARY ----------
function renderSummary() {
  const m = MODULES.find(mm => mm.id === Nav.moduleId);
  if (!m) { Nav.exitToCourse(); return; }
  const ms = Store.mod(m.id);
  const q = ms.quizResults, mt = ms.matchResults, sc = ms.scenarioResults;

  const items = [
    { kicker: "Lessons", title: "Read & Reviewed",
      status: Store.isLessonsDone(m.id) ? `All ${m.lessons.length} sections` : `${Store.lessonsCount(m.id)} / ${m.lessons.length}`,
      good: Store.isLessonsDone(m.id) },
    { kicker: "Quiz", title: "Knowledge Check",
      status: q ? `${q.score} / ${q.total} — ${q.passed ? "Passed" : "Below pass"}` : "Not attempted",
      good: q && q.passed },
    { kicker: "Match", title: m.match.title,
      status: mt ? `${mt.correct} / ${mt.total}` : "Not attempted",
      good: mt && mt.correct === mt.total },
    { kicker: "Scenario", title: m.scenario.title.replace(/Scenario: /, ""),
      status: sc ? `${sc.choices.filter(c => c === "good").length} / ${sc.choices.length} optimal choices` : "Not attempted",
      good: sc && sc.choices.every(c => c === "good") }
  ];

  const allDone = items.every(it => it.good);

  const cards = el("div", null);
  items.forEach(it => {
    cards.appendChild(
      el("div", { class: "card", style: "display: flex; justify-content: space-between; align-items: center; gap: 1rem;" },
        el("div", null,
          el("p", { class: "section-kicker", style: "margin-bottom: 0.2rem;" }, it.kicker),
          el("h3", { style: "margin: 0; font-size: 1.1rem; color: var(--navy);" }, it.title)
        ),
        el("span", { style: "font-weight: 700; color: " + (it.good ? "#2e8b57" : "var(--terra)") + "; text-align: right;" }, it.status)
      )
    );
  });

  const headerCard = el("div", { class: allDone ? "hero" : "card" },
    allDone
      ? el("p", { class: "hero-kicker", style: "color: var(--terra);" }, `Module ${m.id} Complete`)
      : el("p", { class: "section-kicker" }, `Module ${m.id} Summary`),
    el("h1", { class: allDone ? "hero-title" : "section-title", style: allDone ? "" : "color: var(--navy);" },
      allDone ? `${m.title} — Done.` : "Progress"),
    el("p", { class: allDone ? "hero-blurb" : "", style: allDone ? "" : "color: var(--muted); margin: 0;" },
      allDone
        ? "Lessons read. Quiz passed. Match cleared. Scenario navigated. Return to the Course Hub for the next module."
        : "Complete every section to clear the module. Each one is unlocked from the Module Hub.")
  );

  const buttons = el("div", { class: "button-row" },
    el("button", { class: "btn btn-ghost", type: "button", onclick: () => Nav.go("module") }, "← Module Hub"),
    el("button", { class: "btn btn-primary", type: "button", onclick: () => Nav.exitToCourse() }, "Back to Course Hub →")
  );

  mount(el("div", null, headerCard, cards, buttons));
}

// ---------- FINAL EXAM ----------
const ExamState = {
  idx: 0, picked: null, answers: [],

  enter() {
    const s = Store.state.examInProgress;
    if (s) {
      this.idx = s.idx || 0;
      this.picked = (s.picked === undefined) ? null : s.picked;
      this.answers = s.answers || [];
    } else {
      this.idx = 0; this.picked = null; this.answers = [];
    }
  },
  persist() { Store.setExamInProgress({ idx: this.idx, picked: this.picked, answers: this.answers }); },
  reset()   { Store.clearExamInProgress(); this.idx = 0; this.picked = null; this.answers = []; }
};

function renderExam() {
  if (!Store.isExamUnlocked()) { Nav.exitToCourse(); return; }
  if (ExamState.idx < FINAL_EXAM.questions.length) renderExamQuestion();
  else renderExamResults();
}

function renderExamQuestion() {
  const total = FINAL_EXAM.questions.length;
  const q = FINAL_EXAM.questions[ExamState.idx];
  const picked = ExamState.picked;
  const answered = picked != null;

  const optionsContainer = el("div", { class: "quiz-options" });
  q.choices.forEach((choice, i) => {
    const cls = ["quiz-option"];
    if (answered) {
      if (i === q.answer) cls.push("correct");
      else if (i === picked) cls.push("incorrect");
    } else if (picked === i) cls.push("selected");
    optionsContainer.appendChild(
      el("button", {
        class: cls.join(" "), type: "button", disabled: answered,
        onclick: answered ? null : () => { ExamState.picked = i; ExamState.persist(); renderExam(); }
      },
        el("span", { class: "quiz-letter" }, ["A", "B", "C", "D"][i]),
        el("span", null, choice)
      )
    );
  });

  const card = el("article", { class: "quiz-question" },
    el("p", { class: "quiz-question-number" }, `Final Exam · Question ${ExamState.idx + 1} of ${total}`),
    el("h2", { class: "quiz-question-text" }, q.q),
    optionsContainer
  );

  if (answered) {
    const correct = picked === q.answer;
    card.appendChild(
      el("div", { class: "feedback " + (correct ? "feedback-correct" : "feedback-incorrect") },
        el("span", { class: "feedback-label" }, correct ? "Correct." : `Incorrect (answer: ${["A","B","C","D"][q.answer]}).`),
        q.rationale
      )
    );
  }

  const buttons = el("div", { class: "button-row" },
    el("button", { class: "btn btn-ghost", type: "button", onclick: () => Nav.exitToCourse() }, "Exit"),
    !answered
      ? el("button", { class: "btn btn-primary", type: "button", disabled: true }, "Select an answer")
      : el("button", {
          class: "btn btn-primary", type: "button",
          onclick: () => {
            // Record this answer before advancing (indexed so re-renders can't double-count)
            ExamState.answers[ExamState.idx] = { picked, correct: picked === q.answer };
            ExamState.idx++;
            ExamState.picked = null;
            ExamState.persist();
            renderExam();
          }
        }, ExamState.idx === total - 1 ? "See Results →" : "Next Question →")
  );

  mount(el("div", null, card, buttons));
}

function renderExamResults() {
  const total = FINAL_EXAM.questions.length;
  const correctCount = ExamState.answers.filter(a => a && a.correct).length;
  const passed = correctCount >= FINAL_EXAM.passScore;
  Store.setExamResults({ score: correctCount, total, passed });
  const pct = Math.round(correctCount / total * 100);

  const message = passed
    ? `${pct}% — you've cleared the final certification exam. Enter your details to claim your certificate.`
    : `${pct}%. You need ${FINAL_EXAM.passScore} of ${total} (80%) to pass. Review the modules and retake when ready.`;

  const card = el("div", { class: "results-card" },
    el("p", { class: "section-kicker" }, "Final Exam Results"),
    el("p", { class: "results-score" }, String(correctCount), el("small", null, ` / ${total}`)),
    el("p", { class: "results-message" }, message),
    el("div", { class: "button-row", style: "justify-content: center;" },
      passed
        ? el("button", { class: "btn btn-primary", type: "button",
            onclick: () => Nav.go("certform") }, "Claim Certificate →")
        : el("button", { class: "btn btn-primary", type: "button",
            onclick: () => { ExamState.reset(); Nav.go("exam"); } }, "Retake Exam"),
      el("button", { class: "btn btn-ghost", type: "button",
        onclick: () => Nav.exitToCourse() }, "Back to Course Hub")
    )
  );

  updateProgressPill();
  renderNav();
  mount(card);
}

// Deterministic, human-readable certificate ID.
function makeCertId(name, emp, ts) {
  let h = 0;
  const s = name + "|" + emp + "|" + ts;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const yr = new Date(ts).getFullYear();
  return "VTA-" + yr + "-" + h.toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

// Fire-and-forget POST of a certification record to the Google Sheet endpoint.
// Form-encoded + no-cors so it works from a static page with no preflight.
function logCertification(cert) {
  if (!VTA_LOG_ENDPOINT) return; // logging disabled until an endpoint is set
  try {
    const now = new Date();
    const pct = Math.round(cert.score / cert.total * 100);
    const body = new URLSearchParams({
      submittedAt: now.toISOString(),
      name: cert.name,
      credential: cert.credential,
      employeeNo: cert.employeeNo,
      scoreRaw: cert.score + "/" + cert.total,
      scorePercent: pct + "%",
      passStatus: cert.score >= FINAL_EXAM.passScore ? "PASS" : "FAIL",
      certId: cert.certId
    });
    fetch(VTA_LOG_ENDPOINT, { method: "POST", mode: "no-cors", body }).catch(() => {});
  } catch (e) { /* never block the certificate on logging */ }
}

// ---------- CERTIFICATE: details form ----------
function renderCertForm() {
  if (!Store.isExamPassed()) { Nav.exitToCourse(); return; }
  const existing = Store.state.certificate;

  const nameInput = el("input", { class: "cert-input", type: "text", id: "cert-name",
    placeholder: "First Last", autocomplete: "name", value: existing ? existing.name : "" });
  const credSelect = el("select", { class: "cert-input", id: "cert-cred" },
    el("option", { value: "" }, "Select credential…"),
    ...["EMT", "AEMT", "Paramedic", "RN", "RT", "Other"].map(c =>
      el("option", { value: c, selected: (existing && existing.credential === c) ? true : null }, c))
  );
  const empInput = el("input", { class: "cert-input", type: "text", id: "cert-emp",
    placeholder: "e.g. 100482", autocomplete: "off", value: existing ? existing.employeeNo : "" });
  const status = el("p", { class: "cert-form-status" }, "");

  function submit() {
    const name = nameInput.value.trim();
    const cred = credSelect.value;
    const emp = empInput.value.trim();
    status.className = "cert-form-status";
    if (!name) { status.textContent = "Enter your full name."; status.classList.add("err"); return; }
    if (!cred) { status.textContent = "Select your credential level."; status.classList.add("err"); return; }
    if (!emp)  { status.textContent = "Enter your employee number."; status.classList.add("err"); return; }
    const r = Store.state.examResults || { score: FINAL_EXAM.passScore, total: FINAL_EXAM.questions.length };
    const issuedAt = Date.now();
    const cert = {
      name, credential: cred, employeeNo: emp,
      score: r.score, total: r.total, issuedAt,
      certId: makeCertId(name, emp, issuedAt)
    };
    Store.setCertificate(cert);
    logCertification(cert);
    Nav.go("certificate");
  }

  const card = el("div", { class: "card cert-form" },
    el("p", { class: "section-kicker" }, "Almost there"),
    el("h1", { class: "section-title", style: "color: var(--navy); margin-top: 0.2rem;" }, "Claim Your Certificate"),
    el("p", { style: "color: var(--muted); margin-top: 0;" },
      "Your name and credential will appear on the certificate exactly as entered — please double-check spelling."),
    el("label", { class: "cert-label", for: "cert-name" }, "Full name"),
    nameInput,
    el("label", { class: "cert-label", for: "cert-cred" }, "Credential level"),
    credSelect,
    el("label", { class: "cert-label", for: "cert-emp" }, "Employee number"),
    empInput,
    status,
    el("div", { class: "button-row" },
      el("button", { class: "btn btn-ghost", type: "button", onclick: () => Nav.exitToCourse() }, "Cancel"),
      el("button", { class: "btn btn-primary", type: "button", onclick: submit }, "Generate Certificate →")
    )
  );
  mount(card);
}

// ---------- CERTIFICATE ----------
function renderCertificate() {
  const c = Store.state.certificate;
  if (!c) { Nav.go(Store.isExamPassed() ? "certform" : "course"); return; }

  const issued = new Date(c.issuedAt);
  const dateStr = issued.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const pct = Math.round(c.score / c.total * 100);

  const cert = el("div", { class: "certificate", id: "certificate" },
    el("div", { class: "cert-inner" },
      el("div", { class: "cert-seal" }, el("span", { class: "cert-seal-text" }, "VTA")),
      el("p", { class: "cert-org" }, "Ventilator Training Academy"),
      el("p", { class: "cert-org-sub" }, "AEMT & Paramedic Edition"),
      el("p", { class: "cert-heading" }, "Certificate of Completion"),
      el("p", { class: "cert-presented" }, "This is to certify that"),
      el("p", { class: "cert-name" }, c.name),
      el("p", { class: "cert-cred" }, c.credential + "  ·  Employee #" + c.employeeNo),
      el("p", { class: "cert-statement" },
        "has successfully completed all nine modules of the Ventilator Training Academy and passed the Final Certification Exam covering ventilator physiology, recognition of respiratory failure, lung-protective ventilation, and transport management of the mechanically ventilated patient."),
      el("p", { class: "cert-score" }, `Final Exam Score — ${c.score} / ${c.total} (${pct}%)`),
      el("div", { class: "cert-foot" },
        el("div", { class: "cert-sig" },
          el("span", { class: "cert-sig-line" }),
          el("span", { class: "cert-sig-name" }, "Ameet Deshmukh, MD"),
          el("span", { class: "cert-sig-role" }, "Medical Director · AMR Kansas City")
        ),
        el("div", { class: "cert-sig" },
          el("span", { class: "cert-sig-line" }),
          el("span", { class: "cert-sig-name" }, dateStr),
          el("span", { class: "cert-sig-role" }, "Date of Issue")
        )
      ),
      el("p", { class: "cert-id" }, "Certificate ID — " + c.certId)
    )
  );

  const buttons = el("div", { class: "button-row no-print", style: "justify-content: center;" },
    el("button", { class: "btn btn-ghost", type: "button", onclick: () => Nav.exitToCourse() }, "← Course Hub"),
    el("button", { class: "btn btn-primary", type: "button", onclick: () => window.print() }, "🖨 Print / Save as PDF")
  );

  mount(el("div", { class: "cert-wrap" }, cert, buttons));
}

// ---------- 5. ROUTER ----------
function render() {
  updateProgressPill();
  renderNav();
  if (Nav.view === "course")        renderCourseHub();
  else if (Nav.view === "module")   renderModuleHome();
  else if (Nav.view === "lessons")  renderLessons();
  else if (Nav.view === "quiz")     renderQuiz();
  else if (Nav.view === "match")    renderMatch();
  else if (Nav.view === "scenario") renderScenario();
  else if (Nav.view === "summary")  renderSummary();
  else if (Nav.view === "exam")     renderExam();
  else if (Nav.view === "certform") renderCertForm();
  else if (Nav.view === "certificate") renderCertificate();
}

// ---------- 6. BOOT ----------
function boot() {
  Store.load();
  if (ADMIN) {
    document.body.classList.add("is-admin");
    const badge = document.createElement("div");
    badge.className = "admin-badge";
    badge.textContent = "ADMIN · all modules unlocked · tap to exit";
    badge.title = "Tap to turn off admin mode";
    badge.addEventListener("click", disableAdmin);
    document.body.appendChild(badge);
  }
  // Password-gated admin toggle (footer button) — persists on this device.
  const adminBtn = document.getElementById("adminButton");
  if (adminBtn) {
    adminBtn.textContent = ADMIN ? "Admin ✓" : "Admin";
    adminBtn.addEventListener("click", () => {
      if (ADMIN) { disableAdmin(); return; }
      const pw = prompt("Enter admin password to unlock all modules:");
      if (pw == null) return;
      if (pw === ADMIN_PASSWORD) {
        try { localStorage.setItem("vta_admin", "1"); } catch (e) {}
        location.reload();
      } else {
        alert("Incorrect password.");
      }
    });
  }
  document.getElementById("resetButton").addEventListener("click", () => {
    if (Nav.moduleId != null) {
      if (confirm(`Reset progress for Module ${Nav.moduleId}? This will clear that module's scores and lesson reads. Other modules are unaffected.`)) {
        Store.resetModule(Nav.moduleId);
        QuizState.reset();
        MatchState.reset();
        ScenarioState.reset();
        Nav.go("module");
      }
    } else {
      if (confirm("Reset ALL course progress? This clears every module, your exam, and your certificate.")) {
        Store.resetAll();
        QuizState.reset();
        MatchState.reset();
        ScenarioState.reset();
        ExamState.reset();
        Nav.go("course");
      }
    }
  });
  Nav.go("course");
}

document.addEventListener("DOMContentLoaded", boot);
