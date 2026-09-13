# Source decisions for chapters not yet written

Settled questions that were blocking content. Recorded here so the chapter that
uses them is built on the decision rather than on whatever was to hand.

## Pediatric vital sign ranges — Chapter 9.6

Two sources, and they do not agree. Both are recorded, because the disagreement
is itself worth teaching and the series already has a mechanism for that.

### Heart rate and respiratory rate — Fleming 2011 centiles

**Decided: the empirical centiles.** Fleming S, Thompson M, Stevens R, et al.
*Normal ranges of heart rate and respiratory rate in children from birth to 18
years of age: a systematic review of observational studies.* Lancet
2011;377:1011–18. Transcribed from the UpToDate reference graphic (78097 v11.0),
which reproduces that data; the citation of record is Fleming, not UpToDate.

Awake, healthy children at rest.

| Age | RR 1st | RR 10th–90th | RR 99th | HR 1st | HR 10th–90th | HR 99th |
| --- | --- | --- | --- | --- | --- | --- |
| 0 to 3 months | 25 | 34–57 | 66 | 107 | 123–164 | 181 |
| 3 to <6 months | 24 | 33–55 | 64 | 104 | 120–159 | 175 |
| 6 to <9 months | 23 | 31–52 | 61 | 98 | 114–152 | 168 |
| 9 to <12 months | 22 | 30–50 | 58 | 93 | 109–145 | 161 |
| 12 to <18 months | 21 | 28–46 | 53 | 88 | 103–140 | 156 |
| 18 to <24 months | 19 | 25–40 | 46 | 82 | 98–135 | 149 |
| 2 to <3 years | 18 | 22–34 | 38 | 76 | 92–128 | 142 |
| 3 to <4 years | 17 | 21–29 | 33 | 70 | 86–123 | 136 |
| 4 to <6 years | 17 | 20–27 | 29 | 65 | 81–117 | 131 |
| 6 to <8 years | 16 | 18–24 | 27 | 59 | 74–111 | 123 |
| 8 to <12 years | 14 | 16–22 | 25 | 52 | 67–103 | 115 |
| 12 to <15 years | 12 | 15–21 | 23 | 47 | 62–96 | 108 |
| 15 to 18 years | 11 | 13–19 | 22 | 43 | 58–92 | 104 |

**Why these rather than the PALS table.** Fleming pooled 69 studies — 143,346
children for heart rate, 3,881 for respiratory rate — specifically because the
reference ranges in use were not derived from measurement. It found striking
disagreement with the published ranges then in circulation, including the
resuscitation-course tables: their limits frequently fell outside the 1st and
99th centiles, and in places crossed the observed median.

**Two honest caveats to carry into the block.**

1. The respiratory-rate arm rests on 3,881 children against 143,346 for heart
   rate. The RR centiles are the weaker half of the same paper and should not be
   presented with the same confidence.
2. These are awake, healthy children at rest. A rate inside the range can still
   be abnormal for the child in front of you, and a rate outside it can be
   explained by fear, fever, pain or crying. The number is one finding.

### Blood pressure — PALS, and it is unchanged

Fleming covers heart rate and respiratory rate only. The systolic hypotension
thresholds stay with the 2025 AHA/AAP guidelines — *Part 8: Pediatric Advanced
Life Support*, Circulation, October 2025, and *Part 6: Pediatric Basic Life
Support*, Pediatrics 2025, released 22 October 2025 — where they are unchanged
from 2020:

| Age | Systolic hypotension |
| --- | --- |
| Term neonate, 0–28 days | < 60 mmHg |
| Infant, 1–12 months | < 70 mmHg |
| Child, 1–10 years | < 70 + (2 × age in years) mmHg |
| Over 10 years | < 90 mmHg |

New in 2025, and context rather than content — both need invasive arterial
monitoring, so both are outside AEMT scope: diastolic targets during CPR of
≥ 25 mmHg in infants and ≥ 30 mmHg in older children, and a post-arrest goal of
systolic and mean arterial pressure above the 10th percentile for age.

### How 9.6 teaches it — written, and shipped in chapter 9

The divergence gets the evidence-flag treatment the series already uses in 2.5
and 2.8: here is what the resuscitation card says, here is what the systematic
review measured, here is why they differ. A learner who has to recognize a sick
child needs the empirical centiles; a learner sitting a course that tests the
card needs to know the card exists and where it departs. Both, side by side,
with the caveats above stated rather than buried.

Done. Chapter 9 was written from this section: 9.6 carries the anchors, the
hypotension formula, and an `evidence_flag` that puts the course tables and
the measured centiles beside each other with both caveats in the uncertainty
panel. Tests pin the transcribed values, the attribution of each item to the
right source, and the fact that the flag reaches the screen before the
content.

## Still open

- **Kansas scope of practice and the AMR KC standing orders.** Every authored
  chapter marks these for the local overlay rather than guessing. Nothing in
  chapters 1–5 asserts a Kansas specific; a test enforces it for chapter 3.
- **Handover format.** Chapter 4.5 teaches the structure every named format
  encodes and adopts none of them. If this service picks SBAR, MIST or
  IMIST-AMBO, it belongs in the local overlay, not in the base module.

## Closed

- **Second-instructor review.** Not part of this series. Chapters are released
  when they are written and pass the build gate; nothing claims a review it has
  not had, and nothing implies one is pending.
