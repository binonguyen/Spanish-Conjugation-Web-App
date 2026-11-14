# Build conjugation tables from permissive data sources, not Fred Jehle's database

Conjugation data is generated at build time into a committed `verbs.json`, never fetched at runtime. The generator uses `conjuego` (ISC) or `@jirimracek/conjugate-esp` (MIT) for forms and joins English glosses from `conjugator`'s Apache-2.0 TSVs; Tatoeba's CC BY 2.0 FR pairs provide one example sentence per verb, attributed in the UI.

The obvious choice was Fred Jehle's database: 637 verbs, vosotros, and an English gloss for every tense. We rejected it because it is CC BY-NC-SA 3.0 — no ads, no paid tier, ever, and ShareAlike would propagate to the generated tables. That constraint is invisible in code and expensive to undo (every table rebuilt, every verb re-glossed), while the permissive route costs only a build script that matches verbs across two sources. Compound tenses are not stored at all: they are composed from `haber` plus a participle at runtime, which keeps the artifact at ~95 KB gzip for 1000 verbs.

## Consequences

- Any future monetisation stays available; the artifact is ours.
- The build script, not a vendor, owns correctness of the join — assert on a fixture set (`hablar`, `ir`, `tener`, `ser`) in CI, including both `-ra` and `-se` imperfect subjunctive forms, which Jehle's data would have silently omitted.
- Tatoeba attribution is a permanent UI obligation.
