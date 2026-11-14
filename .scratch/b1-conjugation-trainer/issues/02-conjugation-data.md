# 02 — Conjugation data generator

Status: done
Type: task
Blocked by: 01

## Progress

Resumable checkpoint list — complete. Commits `4988bd2` (generator + artifact), `0837be3` (fixture tests), `c9b0aca` (source decision and spec shape), plus the review follow-up.

- [x] Decide the permissive verb-frequency source (MIT `fuzzy-logic/2000-verbos`, deduplicated; see ADR-0003)
- [x] Confirm `conjuego` produces all simple tenses, both imperfect-subjunctive endings, and reflexive pronouns
- [x] Confirm gloss coverage from `conjugator` TSVs; fall back to the MIT list's glosses where absent
- [x] Vendor the ranked top-500 list into `scripts/data/`
- [x] `scripts/build-verbs.ts` + `npm run data`
- [x] Commit the generated `src/data/verbs.json` and check gzip size < 110 KB
- [x] CI fixture assertions against the committed artifact
- [x] Hand-review top-100 glosses and add overrides
- [x] Final review + commit

## Context

The app is only as good as its tables. Rationale for the sources: [ADR-0001](../../../docs/adr/0001-permissive-conjugation-data.md). Artifact shape and the build assertions are in [spec.md](../spec.md#data).

## Scope

- `scripts/build-verbs.ts`: pick a permissive engine (`conjuego`, ISC, preferred; fall back to `@jirimracek/conjugate-esp`, MIT, if coverage gaps appear), generate simple paradigms for the top 500 verbs, tier 1 = top 100.
- Join English glosses from `conjugator`'s Apache-2.0 TSVs; one gloss string per verb, multiple senses comma-joined.
- Emit every cell as an **array** of accepted forms; imperfect subjunctive must carry both `-ra` and `-se`.
- Emit the `haber` table so perfect tenses can be composed at runtime. Do not store compound tenses.
- Person availability per tense: five slots for both imperatives, six elsewhere; `3sg`/`3pl` displayed as *usted*/*ustedes* under imperative.
- Commit the generated `src/data/verbs.json` plus a `generatedAt` stamp; add a `npm run data` script to regenerate.
- Fixture assertions from the spec, run in CI against the committed artifact.

## Done when

- Artifact is under ~110 KB gzip for 500 verbs (simple tenses only) and every assertion passes.
- Spot-check: `ser`, `ir`, `tener`, `decir`, `hablar`, `llamarse` are correct in all 12 simple tenses, including imperatives and both subjunctive endings.
- Hand-review the top 100 glosses for readability; fix awkward joins in a small override file rather than by editing the artifact.

## Comments

- Implemented with `conjuego` (ISC) for forms and `conjugator` (Apache-2.0) for glosses, falling back to the MIT frequency list's gloss where `conjugator` has no entry (178 of 500). The verb order is vendored in `scripts/data/top-verbs.tsv` from `fuzzy-logic/2000-verbos`; rationale in [ADR-0003](../../../docs/adr/0003-verb-frequency-list.md). `llamarse` is appended as a curated fixture, so the artifact has 501 verbs (100 tier 1).
- The artifact stores 10 simple tenses per verb (5 indicative, 3 subjunctive including archaic future, both imperatives), each cell an array of accepted forms; the imperfect subjunctive merges `-ra` and `-se`. Compound tenses are not stored. `nonFinite` carries gerund and participle for runtime composition, and `haber` is emitted without impersonal `hay`.
- Shape note: each tense is a positional array in `personOrder` rather than a person-keyed object. This keeps the shipped artifact at 99.9 KB gzip (budget 110 KB); the person-keyed form was 113 KB. `spec.md#data` was updated to describe the actual shape.
- Regeneration: `npm run data` (Node 24 type stripping). Gloss overrides live in `scripts/data/gloss-overrides.tsv`. Fixture assertions in `src/data/verbs.test.ts` run in the existing CI `npm run test` step.
