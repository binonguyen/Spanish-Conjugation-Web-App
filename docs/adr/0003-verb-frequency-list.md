# Take the verb frequency order from an MIT list, not a CC BY-SA frequency list

The top-500 verb order is vendored from [`fuzzy-logic/2000-verbos`](https://github.com/fuzzy-logic/2000-verbos), an MIT-licensed frequency-ordered Spanish verb deck. Its `data/verbs_*.tsv` rows are sorted by frequency; we keep the first occurrence of each single-word lemma and take the first 500, then append `llamarse` as a curated entry because the fixtures and the reflexive-verb rules need it.

The obvious bulk source is the OpenSubtitles-derived [FrequencyWords](https://github.com/hermitdave/FrequencyWords) list, which is larger and more conversational, but its content is CC BY-SA 4.0. That is the same ShareAlike problem that made us reject Fred Jehle's tables in [ADR-0001](0001-permissive-conjugation-data.md): tier membership would be derived from a ShareAlike database, and the artefact is meant to stay ours. The MIT list is smaller and its corpus is undocumented, but it is verbs-only, already ordered, and permissively licensed.

English glosses still come from `conjugator`'s Apache-2.0 TSVs. That package only has entries for about 900 verbs, so for the verbs it does not know we fall back to the MIT list's own English gloss. The fallback is a gloss of last resort, not a second opinion: `conjugator` wins wherever it has an entry.

## Consequences

- The artifact carries the MIT source's ranking, warts and all. Replacing the corpus is a one-file change to `scripts/data/top-verbs.tsv`, not a code change.
- The generated tier numbers are a fact about the list, not a universal frequency claim. Tier 1 is "first 100 in this list".
- Attribution for the MIT list goes in the About / data sources panel alongside Tatoeba and the conjugation engine.
- No ShareAlike obligation reaches the conjugation tables or the app.
