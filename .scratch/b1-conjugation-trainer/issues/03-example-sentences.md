# 03 — Example sentences and attribution

Status: ready-for-agent
Type: task
Blocked by: 01, 02

## Context

Sentence appears only on the reveal, never on the prompt (see [spec.md](../spec.md#conjugation-drill)). Data comes from Tatoeba, CC BY 2.0 FR, which obliges visible attribution.

## Scope

- Join one Spanish sentence + English translation per verb from Tatoeba's aligned pairs (the `manythings.org` derived `spa-eng` export is the pragmatic bulk source; switch to `downloads.tatoeba.org` bulk files if the derived set is stale).
- Store `{ es, en, id, author }` on each verb; keep the sentence short (≤ 90 chars) and containing an inflected form of the verb.
- Fall back gracefully: verbs with no suitable sentence simply have none, and the reveal hides the block.
- Attribution: a "About / data sources" panel reachable from Settings and the Results footer, naming Tatoeba, the conjugation engine and the gloss source with links.
- A build assertion that every sentence has an `id` so attribution is never lost.

## Done when

- ≥ 90% of the top 500 verbs have a sentence, none is ungrammatical at a glance in the top 100, and the attribution panel is reachable in two clicks from anywhere.
