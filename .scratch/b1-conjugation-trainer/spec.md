# Spec — B1 conjugation trainer

A single-learner static web app for drilling Spanish verb conjugation in the tenses you choose, with English glosses carried alongside so vocabulary grows with the drills. Local-only; no accounts, no backend.

Vocabulary used below is defined in [`GLOSSARY.md`](../../GLOSSARY.md). Data licensing rationale: [ADR-0001](../adr/0001-permissive-conjugation-data.md). Local-only/static shape: [ADR-0002](../adr/0002-local-only-static-app.md).

## Goal

At B1 you can already read a conjugation table and still produce the wrong form under pressure. The app trains **production of one form**, on demand, in a tense you pick, across verbs you actually need. The translation is always on screen so every drill is also a small vocabulary encounter, and a separate [vocabulary check](#vocabulary-check) makes recognition measurable.

## Scope

**In v1**

- 15 tenses selectable per session, grouped by mood; three archaic/formal ones behind a setting.
- Typed answers with an on-screen accent bar; verdicts `correct` / `accent-only` / `wrong`.
- Two session modes sharing one drill shell: [conjugation drill](#conjugation-drill) and [vocabulary check](#vocabulary-check). Never mixed within a session.
- Verb pool: bundled top-500 frequency tiers + search-to-add, persisted locally.
- Error-weighted item draw, interleaved across tenses.
- Local progress at verb × tense × person, exportable/importable as versioned JSON.
- Compact stats view.
- Installable PWA (manifest + offline cache).

**Out of v1, deliberately**

- Spaced repetition scheduling (revisit only after real drilling says the weighting feels wrong).
- Reference/browse screen for full paradigms (wrong-answer reveal covers the in-moment need). Planned later.
- English → Spanish vocabulary production (ambiguous: `to be` → `ser`/`estar`).
- Gapped sentence exercises; accounts; sync; native app. Each is a clean later step, not a v1 cut.

## Data

Generated at **build time** into a committed `src/data/verbs.json`; the app never fetches at runtime.

**Sources** — forms from `conjuego` (ISC) or `@jirimracek/conjugate-esp` (MIT); English glosses joined from `conjugator`'s Apache-2.0 TSVs; one example sentence per verb from Tatoeba (CC BY 2.0 FR), with attribution metadata baked into the artifact. Verb list: top 500 by frequency, tiered (1 = top 100, 2 = top 500).

**Stored tenses are simple paradigms only.** Perfect tenses are composed at runtime from `haber` + participle, which keeps the artifact around 95 KB gzip for 1000 verbs instead of 210 KB, and removes a class of data bugs.

```jsonc
{
  "generatedAt": "2026-11-14T00:00:00Z",
  "verbs": [
    {
      "infinitive": "hablar",
      "reflexive": false,
      "gloss": "to speak, to talk",
      "tier": 1,
      "sentence": { "es": "…", "en": "…", "source": "tatoeba", "id": 12345, "author": "…" },
      "forms": {
        "presente": { "yo": ["hablo"], "tu": ["hablas"], "3sg": ["habla"],
                      "nosotros": ["hablamos"], "vosotros": ["habláis"], "3pl": ["hablan"] },
        "imperfecto_subjuntivo": { "yo": ["hablara", "hablase"], "…": [] },
        "imperativo_afirmativo": { "tu": ["habla"], "3sg": ["hable"],
                                   "nosotros": ["hablemos"], "vosotros": ["hablad"], "3pl": ["hablen"] }
      }
    }
  ],
  "haber": { "presente": { "yo": ["he"], "…": [] } }
}
```

Every cell is an **array of accepted forms**, so `-ra`/`-se` and clitic variants are data, not checker rules.

**Person availability is per tense.** Indicative and subjunctive have six; both imperatives have five (no `yo`), with `3sg`/`3pl` labelled *usted* / *ustedes* for display. With the vosotros setting off, drop that slot everywhere.

**Tense ids** (stable, ASCII): `presente`, `preterito_imperfecto`, `preterito_indefinido`, `futuro_simple`, `condicional_simple`, `preterito_perfecto`, `pluscuamperfecto`, `futuro_perfecto`, `condicional_perfecto`, `presente_subjuntivo`, `imperfecto_subjuntivo`, `perfecto_subjuntivo`, `pluscuamperfecto_subjuntivo`, `imperativo_afirmativo`, `imperativo_negativo`. Archaic, off by default in the picker: `preterito_anterior`, `futuro_subjuntivo`, `futuro_perfecto_subjuntivo`.

**Build assertions (CI, not eyeballs):** `hablar`, `ir`, `ser`, `tener`, `decir`, `llamarse`; both imperfect-subjunctive endings present; every tense × available person cell non-empty; no cell contains a placeholder; every verb has a gloss; vosotros present wherever the form exists.

## Session

A session has one **mode**, fixed for its whole length — conjugation or vocabulary. Modes are never mixed: you sit down to drill forms or to drill meanings.

- **Mode**: `conjugation` (default) or `vocabulary`. Switching mode swaps the builder's controls: tense selection is irrelevant to a vocabulary session, which draws on the verb pool alone.
- **Selection** (conjugation mode only): tenses checked in the builder, grouped by mood (Indicativo / Subjuntivo / Imperativo), session-only. Defaults: `presente`, `preterito_indefinido`, `preterito_imperfecto`, `futuro_simple`.
- **Verb pool**: tier (top 100 / top 500 / all) plus hand-added verbs. Default: top 500.
- **Length**: 20 items, adjustable 5–50.
- **Draw**: weighted across the mode's unit — `(verb, tense, person)` triples in conjugation mode, verbs in vocabulary mode.
  - `weight = (attempts === 0 ? 4 : 1) * (1 + 3 * wrongRatio)`, sampled without replacement.
  - Interleaved across tenses; no verb repeated within 3 items.
  - Seeded RNG so the queue is testable.
- Endable early; a session always ends in results.

### Conjugation drill

Prompt: infinitive · tense (Spanish name + English gloss) · person, with the English gloss of the verb always visible. You type the form and submit with Enter.

Reveal (manual advance, Enter again): the correct form large; your answer struck through if wrong; the Tatoeba sentence + translation; the full paradigm behind a *show table* expander with your row highlighted. An *I don't know* button reveals and counts as wrong.

### Vocabulary check

Spanish infinitive → pick one of four English glosses, distractors drawn from the same tier. This is the whole of a vocabulary-mode session, never an item inside a conjugation session. Progress is keyed under the reserved tense id `vocab`.

The reveal is the correct gloss plus the example sentence — **no paradigm table**. Vocabulary mode asks what a verb means; forms belong to the other mode.

## Answer checking

1. Normalize both sides: Unicode NFC, trim, collapse whitespace, lowercase, strip surrounding `¡!¿?` and trailing `.`.
2. Exact match against the cell's accepted forms → `correct`.
3. Match after stripping acute accents and the diaeresis only (`á` → `a`, `ü` → `u`; never the tilde of `ñ`) → `accent-only`.
4. Otherwise `wrong`.

Consequences: `hable` for `hablé` is accent-only (safe — the tense is given, so only one form is valid); `ano` for `año` is wrong; no general typo tolerance, because one letter is indistinguishable from a real confusion and the accent verdict already covers the common slip. Reflexive verbs require the pronoun (`me llamo`); imperative affirmative requires it attached (`llámate`).

`accent-only` scores as correct for the session, increments a separate accent counter, and re-weights the item as a miss.

## Persistence

IndexedDB (not localStorage: synchronous, more readily evicted in Android WebViews). Stores: `progress`, `settings`, `customVerbs`.

```jsonc
{ "app": "conjugation-trainer", "version": 1, "exportedAt": "…",
  "settings": { "vosotros": false, "sessionLength": 20, "verbTier": 2, "mode": "conjugation", "defaultTenses": ["presente", "preterito_indefinido", "preterito_imperfecto", "futuro_simple"] },
  "customVerbs": ["aparcar"],
  "progress": { "hablar|preterito_indefinido|yo": { "attempts": 12, "wrong": 1, "accent": 2 } } }
```

Import replaces (with confirmation), never merges — merging silently corrupts counts.

## Screens

Four states in one page component, no router (avoids GitHub Pages SPA 404 handling): **Builder → Drill → Results**, plus **Stats** and a **Settings** sheet.

- **Builder**: mode switch first, then the controls mode needs — tense checkboxes by mood (conjugation only), verb tier, search-to-add, length, start.
- **Drill**: prompt, accent bar (`á é í ó ú ü ñ` — tap or dead-key), verdict, reveal, progress `n/20`, end-early.
- **Results**: score, accent-only count, per-tense breakdown for the session (conjugation mode), verbs missed.
- **Stats**: accuracy per tense across all history, accent-error rate, vocabulary accuracy, three most-missed verbs.
- **Settings**: vosotros (default off), archaic tenses, default mode, default length, default selection, export/import, reset.

UI chrome in English; grammatical terms in Spanish with a small English gloss (`Pretérito indefinido (simple past)`).

## Platform

React + Vite + TypeScript (`strict`), npm, deployed to GitHub Pages via Actions on `main`. Static, offline-capable PWA (`vite-plugin-pwa`), installable from the browser. Android later via Capacitor wrapping the same build — see [ADR-0002](../adr/0002-local-only-static-app.md).

CI on every push: `tsc --noEmit`, `vitest run`, `vite build`.

Tests worth having: table-driven checker cases, data-fixture assertions, seeded draw determinism. No component tests in v1.

## Known risks

- **Gloss join quality**: `conjugator` glosses are per-verb and sometimes join several senses; some will read awkwardly. Review the top 100 by hand.
- **Verb list intersection**: joining a frequency list against a conjugator's verb list will drop a few common verbs, including some irregular ones; assert coverage for a top-100 must-have set.
- **Tatoeba sense mismatch**: the example sentence may use a different sense of the verb than the gloss. Acceptable for v1; the sentence is colour, not assessment.
- **Weighting over-fits**: with 20 items per session, error weighting can feel like punishment; watch for it after a week of real use.
