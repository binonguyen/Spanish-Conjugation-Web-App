# 09 — Vocabulary check item

Status: ready-for-agent
Type: task
Blocked by: 01, 02, 05, 07, 08

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
