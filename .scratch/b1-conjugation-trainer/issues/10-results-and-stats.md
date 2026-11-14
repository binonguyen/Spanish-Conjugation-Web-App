# 10 — Results and stats

Status: done
Type: task
Blocked by: 01, 03, 05, 06, 07, 08

## Progress

- [x] `src/domain/aggregate.ts`: session summaries split by round, with per-tense and missed-item selectors
- [x] `src/domain/aggregate.ts`: history stats (per-tense accuracy, accent rate, vocabulary, most-missed verbs) and tests
- [x] Results screen wired to the finished drill state
- [x] Stats screen reads history from the store, with a first-visit empty state
- [x] Typecheck, full suite, build, browser pass
- [x] Review, ticket closed, commit

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

## Comments

- `src/domain/aggregate.ts` owns both selectors. `summarizeSession` splits answers positionally: the first `items.length` answers are the main round, the rest belong to the review round in `reviewItems` order. The main score's denominator is the drawn main queue, not the answers given, so an early end reads as a partial score instead of a perfect one; the per-tense table likewise counts every drawn main item and shows how many were answered. Review "corrected" counts only exactly-right answers, while accent-only still scores in the session total.
- `src/screens/ResultsScreen.tsx` renders the main score, exact/accent-only/wrong counts, an early-end note, a per-tense table with Spanish labels plus English glosses, the review outcome (full, partial or skipped) and each missed item's infinitive, correct form or gloss, tense/person and corrected badge. A session still in progress and a first visit each get their own state, and the About panel stays reachable from every state.
- `src/screens/StatsScreen.tsx` loads `getAllProgress()` on mount. A first visit says there is no history yet; with data it shows conjugation accuracy, accent-error rate, vocabulary accuracy, accuracy per tense and the three most-missed verbs. The most-missed note says it spans both modes and counts wrong plus accent-only as misses.
- `src/domain/aggregate.test.ts` has 10 cases, including the ticket's fixture with correct, accent-only, wrong and an early end; replaying that fixture yields the same summary. Stats tests pin per-tense accuracy, accent rate, vocabulary accuracy, tie ordering, vocabulary misses and the empty state.
- Verified `npm run typecheck`, `npx vitest run` (171 tests) and `npm run build`. Drove the production preview through a correct answer, an accent-only answer and a wrong answer, ended early, checked Results and Stats, checked a first-time Stats view on a fresh origin, and checked the 390 px layout.
- Review fixes: score denominator uses the drawn main queue; an accent-only review answer no longer counts as a correction; the no-review message distinguishes an early end; tense labels carry their English gloss; `RoundSummary.asked` became `answered`; the two catalogue-order builders share `orderedTenses`; the Results footer is one component; stats tallies reuse `ProgressRecord` instead of a duplicate shape; the unused `limit` parameter is gone.
