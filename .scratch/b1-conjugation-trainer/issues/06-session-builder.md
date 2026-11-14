# 06 — Session builder screen

Status: done
Type: task
Blocked by: 01, 02, 05

## Progress

- [x] Tense catalogue grouped by mood with Spanish labels and English glosses, archaic behind the setting
- [x] Builder reducer producing the session config, with pool counting and summary/disabled reason
- [x] Builder screen wired to settings, custom verbs and the local store
- [x] App boot: load settings and custom verbs once, hand a started config to the drill
- [x] Unit tests for the reducer and catalogue; typecheck, full suite, build
- [x] Review, ticket closed, commit

## Context

Home screen. Everything a session is made of is chosen here: [spec.md](../spec.md#session).

## Scope

- Mode switch at the top, two options only: **Conjugation** and **Vocabulary**. It changes the controls below it; nothing about a session is mixed.
- Conjugation mode: three mood groups — Indicativo (9), Subjuntivo (4), Imperativo (2). Archaic three appear only when the setting is on, visually separated.
- Tense labels in Spanish with a small English gloss, e.g. `Pretérito indefinido` / *simple past*.
- Verb tier selector (top 100 / top 500 / all), default top 500 — used by both modes.
- Search-to-add: type an infinitive, add it to `customVerbs`; show a "your verbs" list with remove.
- Session length stepper, 5–50, default 20.
- Start is disabled with a reason when conjugation mode has no tense selected; a one-line summary of what will be drilled ("20 items · 3 tenses · 487 verbs", or "20 items · vocabulary · 487 verbs").
- Selection is session-only: reloading returns to the defaults (presente, pretérito indefinido, pretérito imperfecto, futuro simple).

## Done when

- Choosing tenses, a tier and a length produces a session config object, verified by a unit test on the builder's reducer rather than the DOM.
- A first-time visitor can start a session without touching settings.

## Comments

- `src/domain/tenses.ts` now owns the catalogue: 15 selectable tenses in three mood groups plus the three archaic/formal ones behind the setting, each with a stable `TenseId`, Spanish label and English gloss. `tenseGroups(archaicTenses)` drives the builder's Indicativo (9) / Subjuntivo (4) / Imperativo (2) sections; archaic tenses render in a separated sub-block.
- `src/domain/builder.ts` is the pure reducer and config seam. `createBuilderState(settings, customVerbs)` starts from the saved defaults, `builderReducer` handles mode, tense toggles, tier, length and hand-added verbs, and `toSessionConfig` emits `{ mode, tenses, verbTier, length, customVerbs }`. Vocabulary mode keeps the tense selection in state for a switch back but emits `tenses: []`, so a session never mixes modes. Length is clamped to 5–50; the stepper moves by one.
- `sessionSummary(config)` derives the pool count from the config (`20 items · 4 tenses · 501 verbs`, or `20 items · vocabulary · 501 verbs`), and `startBlockedReason` returns the Start guard text when conjugation has no tense. Hand-added verbs outside the tier are added once; names already in the tier are not double-counted.
- `src/domain/verbPool.ts` owns tier filtering, pool counting and prefix search over the artifact. `src/domain/verbs.ts` (moved from `src/store/customVerbs.ts`) keeps infinitive normalisation and artifact resolution in the domain, so the builder and the store share one resolver.
- `src/app/useLocalStore.ts` opens the one IndexedDB store and loads settings and custom verbs before the Builder mounts; an unavailable database falls back to spec defaults with the store's message, but adding/removing verbs reports that failure instead of pretending to save. `Trainer` in `App.tsx` holds the builder reducer for the app's lifetime, so tab changes keep the current selection while a reload returns to the saved defaults. Start hands the config to the Drill placeholder, where issue 08 will take over.
- Tests in `src/domain/builder.test.ts` cover the 9/4/2 group counts, the three archaic ids, catalogue/artifact id agreement, the default config, tense/tier/length choices, vocabulary-mode separation, length clamping and every 5–50 value, unknown or hidden tense rejection, archaic pruning, custom-verb canonicalisation and pool counting, Start reasons, summary text and prefix search. Typecheck, all 97 tests and `vite build` pass.
- Review follow-ups: the length stepper now reaches every value (not only multiples of five), the reducer mirrors `archaicTenses` and refuses hidden archaic tenses, `TenseId`/`isVerbTier` replace loose strings, `sessionSummary` derives the pool count instead of taking a parallel number, the screen no longer keeps an unpersisted in-memory verb list when IndexedDB is down, and the app's screen map keeps one place per screen.
