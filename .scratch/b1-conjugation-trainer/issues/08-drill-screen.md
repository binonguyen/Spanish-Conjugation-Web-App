# 08 — Drill screen

Status: done
Type: task
Blocked by: 01, 04, 05, 07

## Progress

- [x] Accepted forms and the paradigm per tense and person, compound tenses composed from `haber` + participle, with tests
- [x] Accent bar insertion at the caret and the documented dead-key shortcut, as pure helpers with tests
- [x] Drill state machine: ask → submit/don't know → reveal → advance, with the verdict truth table
- [x] Drill screen: header, prompt, input, accents, aria-live verdict, reveal with sentence/table/variants, end confirmation
- [x] App wiring: queue from progress, one store write per verdict, finish to Results
- [x] 360 px and keyboard-only pass, typecheck, suite, build
- [x] Review, ticket closed, commit

## Context

The screen the app exists for. States and reveal content: [spec.md](../spec.md#conjugation-drill).

## Scope

- Prompt: infinitive · tense (Spanish + English gloss) · person, with the verb's English gloss always visible.
- Text input autofocused; Enter submits; Enter advances. Escape is never destructive.
- Accent bar (`á é í ó ú ü ñ`) that inserts at the caret; a documented dead-key shortcut for desktop.
- Verdict states, announced via `aria-live`: green `correct`; amber `accent-only` with a one-line "marca de acento" hint; red `wrong` with the correct form large and the input struck through.
- Reveal block: example sentence + translation when present; *show table* expander rendering the tense's paradigm with your row highlighted; always spell out the accepted variant when there is more than one (`hablara / hablase`).
- *I don't know* reveals and records `wrong`.
- Header: `n/20`, the tense of the current item, and an end-session action with confirmation.
- Records every verdict to the store: correct → `attempts++`; accent-only → `attempts++`, `accent++`, and treated as a miss for weighting; wrong → `attempts++`, `wrong++`.

## Done when

- A 20-item session is completable with keyboard only, no mouse, on a 360 px-wide viewport.
- Truth table test: each verdict writes exactly the expected counters.

## Comments

- `src/domain/forms.ts` owns accepted forms and the paradigm: simple cells come from the artifact, the eight perfect tenses are composed from the matching `haber` cell × the participle, a reflexive verb puts its pronoun before the composed form (`me he llamado`), and every accepted variant of a cell survives (`hablara`/`hablase`, `vamos`/`vayamos`). `session.ts` gained the tense's own slot order (`personSlots`) and display labels (`personLabel`), so imperative third persons read *usted* / *ustedes*. Tests pin simple cells, variants, imperatives without `yo`, each compound composition, reflexive composition, a non-empty cell for every catalogue tense × person, and the table's row order and labels.
- `src/domain/accents.ts` owns the accent bar (`á é í ó ú ü ñ`), caret insertion (`insertAt`), and the dead-key shortcut: `'` then a vowel → á é í ó ú, `"` then u → ü, `~` then n → ñ; a letter the mark cannot accent inserts both literally. The drill documents the shortcut on screen. A pending mark is cleared by Escape, blur, Backspace, an accent-bar insert, or any Ctrl/Meta/Alt chord, so it never swallows a browser shortcut.
- `src/domain/drill.ts` is the ask → reveal → advance state machine. Exactly one answer is recorded per item; submitting twice, advancing while still asking, or a blank submit changes nothing. *I don't know* records `wrong` with an empty input; an explicit end finishes without recording the current item. `src/app/recordAnswers.ts` writes new answers through `store.recordVerdict`, and `src/app/recordAnswers.test.ts` is the ticket's truth table against the real store: correct → `{ attempts: 1, wrong: 0, accent: 0 }`, accent-only → `{ attempts: 1, wrong: 0, accent: 1 }`, wrong → `{ attempts: 1, wrong: 1, accent: 0 }`, and a second attempt adds to an existing record.
- `src/screens/DrillScreen.tsx`: header (`n / total`, current tense, end-session confirmation), prompt (infinitive + gloss, Spanish tense + English gloss, person), autofocused input, touch accent bar, a persistent `aria-live` verdict (`Correct` / `Accent-only` + the *marca de acento* line / `Wrong`), and the reveal: correct form large, the input struck through on a wrong answer, the accepted variants spelled out, the Tatoeba sentence + translation + id/author credit (ADR-0001), and a native `<details>` paradigm table with the current row highlighted and the vosotros setting honoured. Enter submits, then advances; Ctrl/Cmd+Enter is *I don't know*; Check and Next cover touch. Escape only cancels the end confirmation or clears a pending dead key, so it is never destructive.
- `src/App.tsx`: Start loads progress, draws with a fresh seeded RNG, and holds the drill in one reducer so leaving the Drill tab does not lose the queue. One effect writes each new answer through `recordAnswers` and never rewrites the same answer. The last advance, or an explicit end, goes to Results. A failed progress read or verdict write surfaces a message in the drill header. Vocabulary mode is temporarily blocked in the builder with a clear reason, since issue 09 owns its item; the guard and its builder assertion are the one 09-shaped piece here and 09 should remove them.
- Verified `npm run typecheck`, `npx vitest run` (144 tests) and `npm run build`. Drove a real Chrome at 360×800 through the production preview: input autofocused, `'` + `a` produced `á`, a wrong answer showed the struck-through input and correct form, Enter advanced and refocused the input, the end confirmation appeared and Escape cancelled it without losing the caret, and the page had no horizontal overflow (`scrollWidth` 360).
- Review fixes: the live region stays mounted so a reveal is announced; vocabulary is blocked instead of dead-ending after Start; progress-read and verdict-write failures show a message; the truth table now runs against the real store instead of re-deriving counters; one `COMPOUND_SOURCE` lookup; the interim vocabulary guard is fed back to issue 09.
