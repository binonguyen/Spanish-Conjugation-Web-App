import { verbArtifact, type Verb } from '../data/verbs'

const VERBS_BY_INFINITIVE = new Map(verbArtifact.verbs.map((verb) => [verb.infinitive, verb]))

/** The artifact's verb for a hand-typed infinitive, or `undefined` when it is not in the list. */
export function canonicalVerb(input: string): Verb | undefined {
  return VERBS_BY_INFINITIVE.get(input.normalize('NFC').trim().toLowerCase())
}

/**
 * Resolve stored infinitives against the artifact at load. A name the current artifact
 * no longer carries is skipped rather than shown as a verb without forms.
 */
export function resolveVerbs(infinitives: readonly string[]): Verb[] {
  return infinitives.flatMap((infinitive) => {
    const verb = canonicalVerb(infinitive)
    return verb ? [verb] : []
  })
}
