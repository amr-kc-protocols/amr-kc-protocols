# Chapter authoring sources

Each chapter of the AEMT series is generated from the sources in this
directory and written to `aemt/<chapter>.json`, which is what the app loads.

```bash
node aemt/src/ch05/build.mjs
```

The build is also the gate. It refuses to write a chapter that breaks the
build framework's own rules, so a block cannot drift out of spec quietly:

- **v1.0 §4.2** — 3–5 content screens per block, none over 120 words; a cold
  open of 40–60 words ending on a decision point; a quiz of 5–7 items with at
  least two non-multiple-choice types; 400–700 words of content per block.
- **v1.0 §5.2** — every option carries a rationale, every item carries a
  `source_ref`, stems stay under 60 words, no "all of the above", and the bank
  holds roughly 70% application/analysis items.
- **v1.1 §2.4** — every objective names what it `enables` and carries a `tier`.

Term cards get one more check: a whole term's parts must spell the term, or
`build` and `decompose` cannot grade it.

## Sourcing

Every item traces to a public-domain or freely distributable source listed in
v1.0 §11.1. The Jones & Bartlett text is a sequencing reference only — its
prose, figures and items are not used, and nothing may cite it.

Figures are original schematics drawn for this module, and each records its
licence in `stimulus.asset_license` so it is visible where the figure is used.
