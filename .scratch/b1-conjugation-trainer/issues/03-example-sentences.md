# 03 — Example sentences and attribution

Status: done
Type: task
Blocked by: 01, 02

## Progress

Resumable checkpoint list — complete.

- [x] Sentence selection library + tests (`scripts/sentences.ts`)
- [x] Vendored `scripts/data/sentences.tsv` from the Tatoeba spa-eng export
- [x] `build-verbs.ts` joins sentences, adds the Tatoeba source, asserts id/coverage
- [x] Artifact regenerated; fixture tests for sentence shape and coverage
- [x] About / data-sources panel reachable from the Results footer
- [x] Hand-review the top-100 sentences and fix any awkward picks
- [x] Final typecheck, test, build, review, commit

## Context

Sentence appears only on the reveal, never on the prompt (see [spec.md](../spec.md#conjugation-drill)). Data comes from Tatoeba, CC BY 2.0 FR, which obliges visible attribution.

## Scope

- Join one Spanish sentence + English translation per verb from Tatoeba's aligned pairs (the `manythings.org` derived `spa-eng` export is the pragmatic bulk source; switch to `downloads.tatoeba.org` bulk files if the derived set is stale).
- Store `{ es, en, id, author }` on each verb; keep the sentence short (≤ 90 chars) and containing an inflected form of the verb.
- Fall back gracefully: verbs with no suitable sentence simply have none, and the reveal hides the block.
- Attribution: a "About / data sources" panel reachable from Settings and the Results footer, naming Tatoeba, the conjugation engine and the gloss source with links.
- A build assertion that every sentence has an `id` so attribution is never lost.

## Done when

- ≥ 90% of the top 500 verbs have a sentence, none is ungrammatical at a glance in the top 100, and the attribution panel is reachable in two clicks from anywhere.

## Comments

- Selection pipeline: `scripts/build-sentences.ts` reads the manythings.org `spa-eng` aligned export (one-off download into the gitignored `.cache/tatoeba/spa.txt`, 144,215 usable pairs), matches whole-word inflected forms from the committed conjugation tables, and ranks candidates by short-sentence fit and how many other verbs share a form. It writes one pair per verb to `scripts/data/sentences.tsv`; Tatoeba's second attribution link gives the Spanish sentence's id and author. Regeneration is offline: `npm run data:sentences` only when the sentence set changes, `npm run data` for the artifact. Overrides for awkward automatic picks (noun homographs and a mistranslation) live in `scripts/data/sentence-overrides.tsv`.
- Coverage: 498/501 verbs (497/500 top verbs, 99.4%; 100/100 tier 1). The three without a pair are `tramitar`, `atornillar`, `expandir`; they simply omit `sentence` and the reveal will hide the block. All sentences are ≤ 90 characters and contain a form of their verb; ids are unique across verbs.
- Artifact: each verb has an optional `sentence: { es, en, id, author }`; the sources list now includes Tatoeba (CC BY 2.0 FR, https://tatoeba.org). The artifact grew from 99.9 KB to 121.0 KB gzip; the budget is now 130 KB and `spec.md#data` records the new shape and size.
- Assertions: `build-verbs.ts` fails on a sentence with no positive id, no author, no English, over 90 characters, or no form of its verb, and on top-500 coverage below 90%. CI repeats the same checks against the committed artifact in `src/data/verbs.test.ts` (which also verifies the Tatoeba source row). Selection/filtering/override parsing have unit tests in `scripts/sentences.test.ts`.
- Attribution: `AboutPanel` in `src/components/AboutPanel.tsx`, mounted behind an `About / data sources` disclosure in the Results footer, lists Tatoeba, `conjuego`, `conjugator` and `fuzzy-logic/2000-verbos` with licence, use and links. Results is a header tab, so the panel is two clicks from any screen. Mounting it in the Settings sheet remains issue 11's step, as that ticket already says.
- Top-100 hand review: all 100 read as grammatical and illustrative. Four automatic picks were replaced — `partir` (“de mi parte”, a noun), `ayudar` (“tu ayuda”, a noun), `sacar` (translation drift) and `leer` (odd mid-sentence capital) — and the replacement ids are in the override file.
- Verified with `npm run typecheck`, `npx vitest run` (32 tests), `npm run build`, `npm run data`; the About panel was checked in the browser at desktop and 390 px width.
