# 07 — Item draw and weighting

Status: done
Type: task
Blocked by: 01, 02, 05

## Progress

- [x] Weight formula as a pure function, with deterministic tests
- [x] Person availability in the session config (imperatives, vosotros setting)
- [x] Weighted, interleaved conjugation queue with no verb within 3 items
- [x] Weighted vocabulary queue that never repeats a verb
- [x] Stable seeded queues asserted in tests; typecheck and full suite
- [x] Review, ticket closed, commit

## Context

How a session decides what to ask. Formula and constraints: [spec.md](../spec.md#session).

## Scope

- `src/domain/draw.ts`, pure: `buildQueue(config, progress, rng) → Item[]`.
- Weight the mode's unit: `(verb, tense, person)` triples in conjugation mode, verbs in vocabulary mode. Formula: `(attempts === 0 ? 4 : 1) * (1 + 3 * wrongRatio)`; unseen units surface first.
- Sample without replacement.
- Conjugation mode: interleave tenses (round-robin with jitter, not strict blocks) and never repeat a verb within 3 items. Vocabulary mode: never the same verb twice in a session.
- Respect person availability: no `yo` for imperatives; no `vosotros` when the setting is off.
- Accept an injected RNG so tests are exact, not statistical.

## Done when

- Given a hand-written progress fixture, a fixed seed produces a stable queue asserted in a test, for both modes.
- Deterministic tests prove: unseen units outrank well-drilled ones, a triple with `wrong: 3, attempts: 4` outranks an equally-drilled clean one, no verb appears twice within 3 positions, and a vocabulary-mode queue never repeats a verb.

## Comments

- `src/domain/draw.ts` owns the draw as a pure function: `buildQueue(config, progress, rng) → Item[]` plus `unitWeight(record)` and the seeded `createRng(seed)` (Mulberry32). A conjugation item carries verb, tense, person and its progress key; a vocabulary item carries the verb and a `vocab` key.
- Weight is `(attempts === 0 ? 4 : 1) * (1 + 3 * misses / attempts)`, with `misses = wrong + accent`, so accent-only verdicts re-weight an item as a miss. Unseen records (absent or `attempts: 0`) get 4.
- Conjugation mode serves one weighted item per selected tense per round, reshuffling the tense order each round with the injected RNG: interleaved with jitter, not strict blocks. No verb enters the queue while it is in the last three items; if a pool cannot clear that gap the session ends short rather than repeating a verb. Vocabulary mode samples weighted, without replacement, so a verb appears at most once.
- `SessionConfig` now carries `vosotros` (fed from the builder/settings) and `src/domain/session.ts` owns `Person` and `personsForTense`: six slots everywhere, five for imperatives, minus `vosotros` when the setting is off. A test pins that list to the artifact's `personOrder`.
- Tests in `src/domain/draw.test.ts` cover the weight formula, a queue-level proof that an unseen or miss-heavy verb outranks four clean ones at the same draw point, person availability, tense interleaving, the three-item verb gap, vocabulary uniqueness, both key shapes and two locked seeded queues (conjugation and vocabulary) over a progress fixture. Typecheck, all 112 tests and `vite build` pass.

