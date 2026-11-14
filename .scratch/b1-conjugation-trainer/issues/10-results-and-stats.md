# 10 — Results and stats

Status: in-progress
Type: task
Blocked by: 01, 03, 05, 06, 07, 08

## Progress

- [x] `src/domain/aggregate.ts`: session summaries split by round, with per-tense and missed-item selectors
- [x] `src/domain/aggregate.ts`: history stats (per-tense accuracy, accent rate, vocabulary, most-missed verbs) and tests
- [x] Results screen wired to the finished drill state
- [x] Stats screen reads history from the store, with a first-visit empty state
- [x] Typecheck, full suite, build, browser pass
- [ ] Review, ticket closed, commit

## Context

End-of-session feedback plus the long view. Both views are specified in [spec.md](../spec.md#screens); the stats vocabulary ("accuracy", "accent-error rate") is deliberately narrow. Issue 13 adds a review round after the main queue, so Results must handle answers for the same key more than once.

## Scope

- **Results** (end of session, including early end), shaped by the session's mode: score out of the main-round items, accent-only count (conjugation only), per-tense breakdown (conjugation only), the missed verbs — each with its infinitive, correct form or correct gloss, and tense where relevant — and how many missed items were corrected in the review round. Report the main round and the review round separately, so a repeated item cannot inflate the first-try score.
- **Stats** (from Builder): accuracy per tense across all history, accent-error rate, vocabulary accuracy, three most-missed verbs with counts. No charts, no streaks, no badges.
- Empty states: a first-time Stats view says so instead of rendering zeroes everywhere.
- Aggregation lives in a pure selector module (`src/domain/aggregate.ts`) so it is testable without rendering.

## Done when

- Results derive purely from the completed queue + store writes; replaying the same fixture yields the same numbers.
- One test covers a session containing correct, accent-only, wrong and an early end.
