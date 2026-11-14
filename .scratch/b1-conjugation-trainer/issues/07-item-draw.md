# 07 — Item draw and weighting

Status: in-progress
Type: task
Blocked by: 01, 02, 05

## Progress

- [x] Weight formula as a pure function, with deterministic tests
- [x] Person availability in the session config (imperatives, vosotros setting)
- [x] Weighted, interleaved conjugation queue with no verb within 3 items
- [x] Weighted vocabulary queue that never repeats a verb
- [x] Stable seeded queues asserted in tests; typecheck and full suite
- [ ] Review, ticket closed, commit

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
