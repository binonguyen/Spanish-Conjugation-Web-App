# 09 — Vocabulary check item

Status: in-progress
Type: task
Blocked by: 01, 02, 05, 07, 08

## Progress

- [x] Pure option builder: four glosses, one correct, same-tier distractors, unique glosses, word-overlap preference
- [x] Vocabulary items carry their options from the seeded draw
- [x] Drill reducer checks a chosen vocab gloss and records the `vocab` key
- [x] Vocabulary drill screen: 1–4/tap answers, verdict, gloss + sentence reveal, review advance
- [x] Remove the builder and drill placeholders, update their tests
- [x] Typecheck, suite and build
- [x] Review and address findings
- [ ] Commit

## Context

The vocabulary mode: a whole session of meaning questions, never items sprinkled into a conjugation session. Format in [spec.md](../spec.md#vocabulary-check): infinitive → English gloss, four options.

## Scope

- Spanish infinitive as the prompt, four gloss buttons, one correct.
- Distractors from the same frequency tier, no two options sharing a gloss string, avoid near-synonym pairs (`mirar`/`ver`) where possible by preferring verbs whose gloss words do not overlap.
- Answer with `1`–`4` keys or tap; immediate verdict, then Enter to advance — same reveal rhythm as the drill.
- Records under the reserved `vocab` tense id: `{ attempts, wrong, accent: 0 }` per verb.
- A wrong answer shows which verb the chosen gloss belonged to, so the distractor teaches something.
- The reveal is the correct gloss plus the example sentence when present. No paradigm table here — forms are the other mode's job.

## Done when

- A vocabulary item is indistinguishable from a drill in flow and progress accounting, and a unit test proves the correct option is present exactly once and the distractors are tier-matched.

## Comments

- Interim state left by issue 08: `startBlockedReason` in `src/domain/builder.ts` blocks vocabulary mode with "Vocabulary checks are not available yet…" (pinned in `src/domain/builder.test.ts`), and `DrillScreen` has a matching placeholder, because no vocabulary item exists yet. Remove the guard, its assertion and the placeholder when this ticket wires the vocabulary item; the drill reducer's `verdictFor` deliberately returns `undefined` for vocabulary items so they cannot be counted as wrong before then.
- Issue 09 resolves that interim state: the builder guard, its assertion and the drill placeholder are gone, and `verdictFor` checks a vocabulary item's chosen gloss instead of returning `undefined`.
- `src/domain/vocab.ts` owns the options. `buildVocabularyOptions(verb, rng)` picks three distractors from `verbsInTier(verb.tier)` (the exact tier, not the cumulative session pool), rejects a repeated gloss string, and prefers candidates whose content words are disjoint from the target and from the options already chosen; if that cannot fill three slots it falls back to a distinct gloss and finally throws, because the bundled artifact is asserted to have enough peers. Options are built after the whole vocabulary queue is drawn, so the locked seeded-queue test keeps its verb order.
- `VocabularyItem` now carries `options: VocabularyOption[]`; `vocabularyVerdict(options, selectedGloss)` returns `correct` for the target's gloss and `wrong` otherwise. A skip (`dont-know`) records the same `wrong`/empty-input answer as a conjugation drill. `recordAnswers` writes it under `makeVocabKey`, so a vocabulary check is `{ attempts, wrong, accent: 0 }` at `verb|vocab|`.
- `src/screens/VocabularyDrill.tsx` renders the prompt, four tap/1–4 gloss buttons, the immediate verdict, and a reveal with the correct gloss plus the Tatoeba sentence — no paradigm table. A wrong answer names the verb the chosen gloss belonged to. The first option takes focus, Enter never selects it by accident, Ctrl/Cmd+Enter is *I don't know*, and focus returns to the options or the advance button after the end-session confirmation is cancelled. `DrillChrome.tsx` holds the header, review banner, example sentence and advance label shared with the conjugation drill; `useEndConfirmation` owns the two-step end control.
- Tests: `vocab.test.ts` checks every artifact verb gets four options with its own gloss exactly once, every distractor in the same exact tier, unique gloss strings, and no shared content words for `mirar`/`ver` and `ser`/`estar`; `draw.test.ts` checks the queue carries those options; `drill.test.ts` checks correct, distractor and skipped vocabulary answers and the review round; `recordAnswers.test.ts` checks the `vocab` counters; `builder.test.ts` checks vocabulary is no longer blocked and pins `verbsInTier` against the cumulative pool. `npm run typecheck`, `npm run test` (173) and `npm run build` pass; the production preview was driven at a mobile viewport through a wrong answer, the reveal and the end-of-session path.
