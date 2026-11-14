# 11 — Settings sheet

Status: done
Type: task
Blocked by: 01, 03, 05, 06

## Progress

- [x] Settings reducer for vosotros, archaic, default length and default selection, with tests
- [x] Builder actions that apply live settings and rebuild after import/reset, with tests
- [x] Settings sheet reached from the Builder header: toggles, defaults, export/import/reset, About
- [x] App persists settings and refreshes settings plus custom verbs after import/reset
- [x] Typecheck, focused tests, full suite, build
- [x] Review, ticket closed, commit

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

## Comments

- `src/app/settings.ts` is the pure settings seam: `toggle-vosotros`, `toggle-archaic`, `set-default-mode`, `set-session-length` and `toggle-default-tense`. Length reuses `clampSessionLength` in `src/domain/session.ts`, and catalogue ordering reuses `orderTenses` in `src/domain/tenses.ts`, so the builder and the saved defaults cannot drift. Hidden archaic tenses stay in `defaultTenses` when the setting turns off, so turning it back on restores the previous default; `createBuilderState` still filters them out while hidden.
- `src/domain/builder.ts` gained `apply-settings` (narrowed to the two fields that shape the next session, `vosotros` and `archaicTenses`, mirrored immediately) and `rebuild` (re-seeds every field from store settings and custom verbs after an import or reset). Toggling vosotros only writes `settings`; progress keys, including existing `vosotros` rows, are untouched.
- `src/components/SettingsSheet.tsx` is a native modal `<dialog>` opened from the Builder header, so there is no route and the Builder stays mounted. It covers the two drill toggles, the next-start defaults (mode, length, tense selection), export, import with a second "Replace everything" confirmation, reset behind the typed word `reset`, and the existing `AboutPanel` attribution. Shared `TenseCheckbox` and `LengthStepper` components keep the Builder and the sheet on one control each. Preference controls are disabled while an import or reset is in flight.
- `src/App.tsx` holds the loaded settings, saves each change to the store, marks the object saved only after a successful write (a failed write is reported in the Builder footer and the sheet, and retried by the next change), and refreshes settings plus hand-added verbs after import/reset. Export/import/reset reuse the store's typed results, so nothing new throws into the UI.
- Tests: six reducer cases in `src/app/settings.test.ts` and three builder cases covering live settings, archaic pruning of the session selection, and rebuild. After rebasing onto main with issues 09 and 10, the full suite is 182 tests; `npm run typecheck` and `vite build` pass.
- Review fixes: added the spec's default mode, stopped the archaic toggle from deleting saved defaults, disabled preference controls during import/reset, applied saves only on success, removed the unused `replace` action, reused the length clamp and tense-order helpers, and extracted the shared tense checkbox and stepper. The glossary's Selection entry now names the default selection.
- Verified in the browser: archaic toggling adds the three tenses to the Builder immediately, a default-tense change survives a reload, export downloads the versioned JSON, reset restores every default, and About is reachable in the sheet.
