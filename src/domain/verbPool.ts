import { verbArtifact, type Verb } from '../data/verbs'
import type { VerbTier } from './session'
import { canonicalVerb, normalizeInfinitive } from './verbs'

/** How many suggestions the hand-add search offers at once. */
export const SEARCH_LIMIT = 8

/** The session's pool for a tier: the top 100 for tier 1, everything for tier 2 and up. */
export function verbsForTier(tier: VerbTier): Verb[] {
  if (tier === 'all') return [...verbArtifact.verbs]
  return verbArtifact.verbs.filter((verb) => verb.tier === 1 || verb.tier === tier)
}

/**
 * The artifact's verbs whose own tier is exactly this one. `verbsForTier` is the
 * cumulative session pool; this is the band a vocabulary distractor must match.
 */
export function verbsInTier(tier: 1 | 2): Verb[] {
  return verbArtifact.verbs.filter((verb) => verb.tier === tier)
}

/**
 * The session's verb pool: a frequency tier plus hand-added verbs. A hand-added verb
 * already inside the tier is not counted twice; a name the artifact cannot resolve is
 * skipped, because a verb without forms cannot be drilled.
 */
export function poolVerbs(tier: VerbTier, customVerbs: readonly string[]): Verb[] {
  const pool = verbsForTier(tier)
  const seen = new Set(pool.map((verb) => verb.infinitive))

  for (const infinitive of customVerbs) {
    const verb = canonicalVerb(infinitive)
    if (verb && !seen.has(verb.infinitive)) {
      pool.push(verb)
      seen.add(verb.infinitive)
    }
  }

  return pool
}

export function poolSize(tier: VerbTier, customVerbs: readonly string[] = []): number {
  return poolVerbs(tier, customVerbs).length
}

/**
 * Prefix search over every verb in the artifact, so a top-500 verb can be added while
 * the pool is the top 100. Verbs already in the hand-added list are left out.
 */
export function searchVerbs(query: string, exclude: readonly string[] = []): Verb[] {
  const prefix = normalizeInfinitive(query)
  if (!prefix) return []

  const excluded = new Set(exclude.map(normalizeInfinitive))
  return verbArtifact.verbs
    .filter((verb) => verb.infinitive.startsWith(prefix) && !excluded.has(verb.infinitive))
    .slice(0, SEARCH_LIMIT)
}
