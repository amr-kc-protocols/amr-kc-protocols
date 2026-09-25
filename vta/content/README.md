# Classroom content

Versioned content for the classroom companion, vendored verbatim from the
coder handoff package prepared 25 September 2026.

| File | What it is |
| --- | --- |
| `classroom-map.json` | All 273 slide positions and durations, the nine modules and their 56 lesson IDs, and every activity, calculation override and follow-up. |
| `classroom-questions.json` | The 90 module questions and 25 final questions as the deck projects them — stems, ordered A–D choices, slide numbers. **No correct-answer fields.** |
| `content-manifest.json` | Byte counts and SHA-256 of the two files above, plus the course version and deck hash, so drift is detectable. |

Both files are read by [`../classroom-content.js`](../classroom-content.js),
which refuses to run them as a pair unless their `courseVersion` and deck
hash agree. Mixing a new question file with an old map is what puts a learner
on the wrong question in the middle of a class, so it fails loudly at load
rather than quietly at slide 103.

## Course version and the deck

    courseVersion  vta-classroom-2026-09-25-r1
    deck           Ventilator_Training_Academy_Interactive_8_Hour_Class.pptx
    deck SHA-256   9a66e7daaabc1459032b9ad181828d6539de340f72e6b6dbd47625326fc220b4

The slide numbers here are positions in *that* deck. The PowerPoint is not
modified by this app and does not need to be: no hyperlinks, slide numbers,
speaker notes or add-in are changed. If the deck is edited, its hash changes
and this content has to be regenerated — the hash is the check that the two
are still describing the same class.

Slide numbers are one-based, matching what PowerPoint shows the instructor.

## What is deliberately not here

`instructor-reference.json` — the correct answers, rationales, case decisions,
calculation solutions and extracted slide notes — is **not** vendored. It is
not needed until the teaching workspace exists, and this directory is served
publicly, so publishing the answer key before anything uses it would give it
away for no benefit. It arrives with that workspace.

That is a matter of not publishing it early, not a security control. Any
answer data delivered to a browser is inspectable by whoever is holding the
browser. Genuinely confidential or proctored assessment needs server-held
keys and authorized grading; hiding a button does not provide it.

## Regenerating

These files are generated from the PowerPoint, not edited by hand. A
correction belongs upstream in the generator, with the course version bumped,
because attempts are stored against the question IDs and course version they
were answered under — editing a question in place would re-score work that
was done against different wording.
