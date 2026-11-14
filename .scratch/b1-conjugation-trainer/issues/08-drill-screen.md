# 08 — Drill screen

Status: ready-for-agent
Type: task
Blocked by: 01, 04, 05, 07

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
