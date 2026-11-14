# 06 — Session builder screen

Status: ready-for-agent
Type: task
Blocked by: 01, 02, 05

## Context

Home screen. Everything a session is made of is chosen here: [spec.md](../spec.md#session).

## Scope

- Mode switch at the top, two options only: **Conjugation** and **Vocabulary**. It changes the controls below it; nothing about a session is mixed.
- Conjugation mode: three mood groups — Indicativo (9), Subjuntivo (4), Imperativo (2). Archaic three appear only when the setting is on, visually separated.
- Tense labels in Spanish with a small English gloss, e.g. `Pretérito indefinido` / *simple past*.
- Verb tier selector (top 100 / top 500 / all), default top 500 — used by both modes.
- Search-to-add: type an infinitive, add it to `customVerbs`; show a "your verbs" list with remove.
- Session length stepper, 5–50, default 20.
- Start is disabled with a reason when conjugation mode has no tense selected; a one-line summary of what will be drilled ("20 items · 3 tenses · 487 verbs", or "20 items · vocabulary · 487 verbs").
- Selection is session-only: reloading returns to the defaults (presente, pretérito indefinido, pretérito imperfecto, futuro simple).

## Done when

- Choosing tenses, a tier and a length produces a session config object, verified by a unit test on the builder's reducer rather than the DOM.
- A first-time visitor can start a session without touching settings.
