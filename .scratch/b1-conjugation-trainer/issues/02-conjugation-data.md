# 02 — Conjugation data generator

Status: in-progress
Type: task
Blocked by: 01

## Progress

Resumable checkpoint list — on a fresh session, read the commits after this line and continue from the first unchecked step.

- [x] Decide the permissive verb-frequency source (MIT `fuzzy-logic/2000-verbos`, deduplicated; see ADR-0003)
- [x] Confirm `conjuego` produces all simple tenses, both imperfect-subjunctive endings, and reflexive pronouns
- [x] Confirm gloss coverage from `conjugator` TSVs; fall back to the MIT list's glosses where absent
- [ ] Vendor the ranked top-500 list into `scripts/data/`
- [ ] `scripts/build-verbs.ts` + `npm run data`
- [ ] Commit the generated `src/data/verbs.json` and check gzip size < 110 KB
- [ ] CI fixture assertions against the committed artifact
- [ ] Hand-review top-100 glosses and add overrides
- [ ] Final review + commit

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
