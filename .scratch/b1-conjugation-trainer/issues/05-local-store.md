# 05 — Local store, export and import

Status: in-progress
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
- [ ] Review, ticket closed, commit.
