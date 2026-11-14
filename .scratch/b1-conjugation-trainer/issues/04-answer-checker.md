# 04 — Answer checker

Status: done
Type: task
Blocked by: 01

## Context

The highest-risk pure logic in the app. Rules: [spec.md](../spec.md#answer-checking). Verdict vocabulary: [`GLOSSARY.md`](../../../GLOSSARY.md).

## Scope

- `src/domain/check.ts`: `checkAnswer(input, accepted[]) → 'correct' | 'accent-only' | 'wrong'`.
- Normalize: NFC, trim, collapse whitespace, lowercase, strip surrounding `¡!¿?` and trailing `.`.
- `accent-only` strips acute accents and diaeresis only; `ñ` is never stripped (`ano` ≠ `año`).
- No edit-distance tolerance.
- Accepted-form arrays come from the data; the checker holds no per-verb knowledge.
- Table-driven tests, at minimum: `hablé`/`hable` (accent-only), `hablé`/`hablo` (wrong), `ano`/`año` (wrong), `hablara`/`hablase` (both correct), `me llamo`/`llamo` (wrong — pronoun required), `llámate` (correct, attached), ` ¡Háblame! ` vs `háblame` (correct after normalization), uppercase input (correct).

## Done when

- All cases pass and the module has no React imports (pure function, importable by tests and by a future CLI).

## Progress

- [x] Table-driven tests for the verdict cases in `src/domain/check.test.ts`.
- [x] `src/domain/check.ts`: normalization and exact-match verdict.
- [x] Accent/diaeresis folding that leaves `ñ` alone.
- [x] Typecheck and focused test pass.
- [x] Full test suite, review, ticket closed.

## Comments

- Implemented `src/domain/check.ts`: a pure `checkAnswer(input, accepted[])` returning `correct` / `accent-only` / `wrong`, with `Verdict` exported. Normalization is NFC, trim, collapse whitespace, lowercase, strip surrounding `¡!¿?` and a trailing `.`; only leading `¡!¿?` are forgiven, a leading `.` is not. Accent folding covers the acute vowels and `ü` only, so `ano` stays distinct from `año`.
- `src/domain/check.test.ts` is table-driven, 24 cases: the ticket's minimum set (accent-only, `ano`/`año`, `-ra`/`-se`, required pronoun, attached clitic, punctuation, uppercase) plus decomposed NFC input, trailing period, collapsed whitespace, empty input and exact-match precedence. Helpers stay module-private; the module imports nothing, so a CLI can use it.
- Review fixes: removed the duplicated accent character list (the fold pattern is derived from its map), made the helpers private rather than speculative exports, and kept punctuation stripping literal to the spec (leading `.` is now `wrong`).
