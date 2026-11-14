# 10 — Results and stats

Status: ready-for-agent
Type: task
Blocked by: 01, 03, 05, 06, 07, 08

## Context

End-of-session feedback plus the long view. Both views are specified in [spec.md](../spec.md#screens); the stats vocabulary ("accuracy", "accent-error rate") is deliberately narrow.

## Scope

- **Results** (end of session, including early end), shaped by the session's mode: score out of items served, accent-only count (conjugation only), per-tense breakdown (conjugation only), and the missed verbs — each with its infinitive, correct form or correct gloss, and tense where relevant.
- **Stats** (from Builder): accuracy per tense across all history, accent-error rate, vocabulary accuracy, three most-missed verbs with counts. No charts, no streaks, no badges.
- Empty states: a first-time Stats view says so instead of rendering zeroes everywhere.
- Aggregation lives in a pure selector module (`src/domain/aggregate.ts`) so it is testable without rendering.

## Done when

- Results derive purely from the completed queue + store writes; replaying the same fixture yields the same numbers.
- One test covers a session containing correct, accent-only, wrong and an early end.
