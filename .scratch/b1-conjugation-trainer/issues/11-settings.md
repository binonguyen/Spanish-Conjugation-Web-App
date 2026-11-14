# 11 — Settings sheet

Status: ready-for-agent
Type: task
Blocked by: 01, 03, 05, 06

## Context

Every preference decided in the grilling, in one place: [spec.md](../spec.md#screens).

## Scope

- Vosotros on/off, **default off**; changing it changes the person slots immediately and leaves stored history untouched (forms already drilled for `vosotros` stay in the store, they just stop being served).
- Archaic/formal tenses on/off, default off — adding `pretérito anterior`, `futuro de subjuntivo`, `futuro perfecto de subjuntivo` to the builder.
- Default session length and default tense selection (used at next app start; a reload still resets the current session's selection).
- Export progress, import progress, reset with typed confirmation.
- "About / data sources" panel with attribution links (owned by issue 03, mounted here).
- Reached from the Builder header; no separate route.

## Done when

- Every setting survives a reload, and toggling vosotros never mutates or deletes existing progress records.
