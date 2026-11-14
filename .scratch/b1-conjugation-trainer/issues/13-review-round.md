# 13 — Review round for missed items

Status: done
Type: task
Blocked by: 07, 08

## Progress

- [x] `DrillState` carries the review queue and an explicit review phase
- [x] A main-round `wrong` or `accent-only` verdict appends the item once, in miss order
- [x] Advancing past the main queue enters review; a review miss is not requeued again
- [x] Header shows `Review n / m`, the boundary button says *Start review*, and a banner explains the round
- [x] Tests: entry and order, clean round, review miss, explicit end, boundary helpers
- [x] Spec and glossary updated; issue 10 told to report the rounds separately
- [x] Typecheck, suite, build, review, commit

## Context

Follow-up from drill feedback: issue 07's weighting only makes a missed item likelier in a
**later** session, and a session sampled without replacement never asks the same unit twice.
The learner asked for mistakes to be repeated; the chosen shape is a review round **after**
the main queue, not a requeue that displaces unique items from the configured 20.

## Scope

- Add `reviewItems` and `inReview` to `DrillState`. The main `items` stay exactly the drawn
  queue, so the `n / 20` count and the session length keep their meaning.
- On reveal in the main round, append the item to `reviewItems` when the verdict is `wrong`
  or `accent-only`, once per key. A correct answer adds nothing.
- `advance` past the last main item enters review at index 0; past the last review item it
  finishes. `end` still finishes immediately and skips the rest.
- Review answers are ordinary `DrillAnswer`s, so `recordAnswers` writes a second
  `attempts`/`wrong`/`accent` record for the same key. A wrong answer during review changes
  counters but is not asked again.
- `DrillScreen`: header reads `Review n / m`, a banner names the round, and the advance button
  reads *Start review* when the next step crosses the boundary (otherwise *Next item* /
  *See results* as before).
- Vocabulary items are not reviewable until issue 09 defines their verdict; the current
  `verdictFor` guard means they cannot enter the queue yet.

## Done when

- A session with one miss asks that item once more after the main queue and then ends;
  a clean session ends without a review round.
- Tests cover review entry and order, a clean round, a miss during review, an explicit end,
  and the `atRoundEnd` / `startsReview` boundary helpers.
- Typecheck, the full suite and `vite build` pass.

## Comments

- `src/domain/drill.ts` owns the round transition. `reveal` appends a missed main-round item
  to `reviewItems` (deduplicated by key); `advance` moves from the last main item into
  `inReview` and finishes after the last review item. `roundLength`, `atRoundEnd` and
  `startsReview` are exported for the screen so the header and button label do not re-derive
  the transition.
- Accent-only counts as a miss for the review round, matching how issue 07 already treats it
  for weighting. Every review answer is a real store write, so the progress record sees both
  attempts.
- `src/screens/DrillScreen.tsx` shows `Review n / m` in the header, a tinted
  *Review round — N items come back once more* banner, and **Start review** on the boundary
  reveal. The correct form, sentence, table, accents and end confirmation are unchanged.
- Tests in `src/domain/drill.test.ts` cover miss order across two review items, a clean round
  ending without review, a review-round miss not being requeued, an explicit end skipping
  review, and the boundary helpers. One test deliberately makes the review order differ from
  the main index order; it caught `submit` checking `items[state.index]` instead of
  `currentItem(state)`, which would have checked a review answer against the wrong cell.
- Verified `npm run typecheck`, `npx vitest run` (151 tests) and `npm run build`; drove a
  session in the browser through a wrong answer, the review banner, and a correct review
  answer.
