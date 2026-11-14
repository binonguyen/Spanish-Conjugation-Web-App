# 04 — Answer checker

Status: ready-for-agent
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
