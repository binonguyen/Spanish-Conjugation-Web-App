# 05 — Local store, export and import

Status: done
Type: task
Blocked by: 01

## Context

Only persistence in the app. [ADR-0002](../../../docs/adr/0002-local-only-static-app.md): the export file is the only bridge between devices. Schema: [spec.md](../spec.md#persistence).

## Scope

- IndexedDB behind a small typed module (`src/store/`), no ORM, no idb wrapper unless it earns its place.
- Key format for progress: `verb|tense|person` with `{ attempts, wrong, accent }`; vocabulary checks keyed under `vocab` with the verb as verb and an empty person.
- Settings store with defaults: `vosotros: false`, `sessionLength: 20`, `verbTier: 2`, `mode: 'conjugation'`, `defaultTenses: ['presente', 'preterito_indefinido', 'preterito_imperfecto', 'futuro_simple']`, archaic tenses off.
- `customVerbs`: hand-added infinitives, resolved against the artifact at load.
- Export: download a versioned JSON exactly as specified. Import: read, validate `app` + `version`, confirm, **replace** — never merge.
- Reset: wipe both stores behind a typed confirmation.
- Failure paths: corrupted file, wrong app tag, newer version, quota exceeded on write — each surfaces a message, none throws into the UI.

## Done when

- Round-trip test: seeded store → export → reset → import → identical progress.
- Importing a v2 file into a v1 app refuses with an explanation instead of half-applying.

## Progress

- [x] Test harness for IndexedDB (`fake-indexeddb`) and store factory seam.
- [x] Settings with defaults, load/save.
- [x] Progress keyed `verb|tense|person` (and `verb|vocab|`), record attempt by verdict.
- [x] Custom verbs added, removed and resolved against the artifact.
- [x] Versioned export and validated import that replaces.
- [x] Reset behind a typed confirmation.
- [x] Failure paths surfaced as results: corrupted file, wrong app, newer version, unknown verb, quota.
- [x] Round-trip and failure-path tests, typecheck, full suite.
- [x] Review, ticket closed, commit.

## Comments

- Implemented `src/store/` as a small typed module over IndexedDB, no ORM or wrapper. `db.ts` opens the `progress`, `settings` and `customVerbs` stores; `store.ts` exposes a `createStore({ name? })` factory whose writes return `StoreResult<T>` instead of throwing. `types.ts` holds the domain types, defaults and `nextProgress`, and `transfer.ts` owns export validation and the browser download.
- Settings use the ticket defaults (`vosotros: false`, `sessionLength: 20`, `verbTier: 2`, `mode: 'conjugation'`, the four default tenses, archaic tenses off). `archaicTenses` is stored and therefore exported: the ticket requires the setting, and ADR-0002 makes the export the only bridge between devices, so dropping it would silently lose it on a round trip. The rest of the export envelope is exactly the spec shape. A v1 file written before the setting existed still imports, defaulting it to `false`.
- Progress keys are `verb|tense|person`; vocabulary checks use `verb|vocab|`. `recordVerdict` increments `attempts` always, `wrong` on a wrong verdict and `accent` on accent-only. Accent-only is deliberately not folded into `wrong` (the spec's export example keeps them separate); the draw in issue 07 must count `wrong + accent` when it computes the miss ratio, so an accent-only item still re-weights.
- Hand-added verbs are normalised (NFC, trim, lowercase) and must exist in the artifact. `resolveCustomVerbs()` resolves stored names at load and skips a name the current artifact no longer carries. Import keeps such a stale name in the file's custom-list rather than dropping it, so a later artifact can resolve it again.
- Import parses and validates the whole file before writing anything: app tag, integer version, settings types and 5–50 session length, custom-verb strings, progress records with non-negative integer counts, a parsable `exportedAt`. A newer version or wrong app is refused with a specific message; malformed input is `corrupted`. Replacement is one read-write transaction over all three stores, so a refused or failed import changes nothing. The caller must pass `IMPORT_CONFIRMATION` (`'replace'`) after the UI confirmation; a wrong token returns `unconfirmed` before the file is even parsed.
- Reset requires the typed word `reset` (`RESET_CONFIRMATION`); anything else leaves all three stores untouched. Quota failures map to a "storage is full" message and other write failures to a generic one; exports map read failures to "local database is not available". `createStore` is the one operation that rejects — without a database there is no store to report against.
- Tests use `fake-indexeddb` (dev dependency) with a fresh factory per test and cover the ticket's round trip (seed → export → reset → import → identical progress/settings/verbs), the v2 refusal leaving state untouched, wrong app, five corrupted shapes including an out-of-range session length, replace-not-merge, import and reset confirmations, stale custom verbs, an older v1 file, and a simulated `QuotaExceededError` on write. 25 store tests; typecheck, the 81-test suite and `vite build` pass.
- Review fixes: one shared JSON record guard, a single infinitive normaliser, export serialisation gathered behind one `buildExport` result so the three export paths cannot drift, `MESSAGES.unavailable` no longer says "local storage" for IndexedDB, `sessionLength` is range-checked, and the unused `exportData` method was removed. Domain note for later: saved `defaultTenses` is the spec's "default selection", which sits beside the glossary's "Selection is session-only"; the per-session choice still starts from these defaults, so the glossary wording is the thing to reconcile, not the store.
