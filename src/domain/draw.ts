import type { Verb } from '../data/verbs'
import { makeProgressKey, makeVocabKey, type ProgressRecord } from '../store/types'
import { shuffle, type Rng } from './random'
import { personsForTense, type Person, type SessionConfig } from './session'
import type { TenseId } from './tenses'
import { buildVocabularyOptions, type VocabularyOption } from './vocab'
import { poolVerbs } from './verbPool'

/**
 * How strongly the draw favours one unit. Unseen units get a fixed four; a drilled unit
 * starts at one and gains up to three more as its share of misses rises. Accent-only
 * verdicts count as misses, so a missing accent re-weights the item too.
 */
export function unitWeight(record: ProgressRecord | undefined): number {
  if (!record || record.attempts === 0) return 4

  const misses = record.wrong + record.accent
  return 1 + 3 * (misses / record.attempts)
}

/** Progress looked up by the same keys the store writes. */
export type ProgressLookup = Readonly<Record<string, ProgressRecord | undefined>>

export interface ConjugationItem {
  mode: 'conjugation'
  verb: Verb
  tense: TenseId
  person: Person
  /** The progress key this item's verdict updates. */
  key: string
}

export interface VocabularyItem {
  mode: 'vocabulary'
  verb: Verb
  /** The progress key this item's verdict updates. */
  key: string
  /** Four glosses, one correct; fixed when the queue is drawn so a reveal is stable. */
  options: readonly VocabularyOption[]
}

/** One thing a session asks; the two shapes are never mixed within a session. */
export type Item = ConjugationItem | VocabularyItem

/** One item drawn in proportion to its weight. */
function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, rng: Rng): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  let target = rng() * total

  for (const item of items) {
    target -= weight(item)
    if (target < 0) return item
  }

  return items[items.length - 1]!
}

function drawVocabulary(
  config: SessionConfig,
  progress: ProgressLookup,
  rng: Rng,
): VocabularyItem[] {
  const remaining = poolVerbs(config.verbTier, config.customVerbs)
  const drawn: Omit<VocabularyItem, 'options'>[] = []
  const count = Math.min(config.length, remaining.length)

  while (drawn.length < count) {
    const verb = pickWeighted(
      remaining,
      (candidate) => unitWeight(progress[makeVocabKey(candidate.infinitive)]),
      rng,
    )
    remaining.splice(remaining.indexOf(verb), 1)
    drawn.push({ mode: 'vocabulary', verb, key: makeVocabKey(verb.infinitive) })
  }

  // Building options after the whole queue keeps the drawn verbs — and the locked
  // seeded-queue test — independent of how many random numbers each option set uses.
  return drawn.map((item) => ({
    ...item,
    options: buildVocabularyOptions(item.verb, rng),
  }))
}

/** One drawable conjugation item before it becomes part of the queue. */
interface Unit {
  verb: Verb
  tense: TenseId
  person: Person
}

/**
 * Pick one unit from a tense, never choosing a verb from the last three items. A pool
 * too small to clear that gap simply stops feeding this tense.
 */
function takeUnit(
  units: readonly Unit[],
  recentVerbs: readonly string[],
  progress: ProgressLookup,
  rng: Rng,
): Unit | undefined {
  const blocked = new Set(recentVerbs)
  const allowed = units.filter((unit) => !blocked.has(unit.verb.infinitive))
  if (allowed.length === 0) return undefined

  return pickWeighted(
    allowed,
    (unit) =>
      unitWeight(progress[makeProgressKey(unit.verb.infinitive, unit.tense, unit.person)]),
    rng,
  )
}

/**
 * Serve one item per selected tense per round, shuffling the tenses each round so the
 * order interleaves rather than running in blocks. Within a tense the pick is weighted.
 */
function drawConjugation(
  config: SessionConfig,
  progress: ProgressLookup,
  rng: Rng,
): ConjugationItem[] {
  const pool = poolVerbs(config.verbTier, config.customVerbs)
  const remaining = new Map<TenseId, Unit[]>()

  for (const tense of new Set(config.tenses)) {
    const persons = personsForTense(tense, config.vosotros)
    const units = pool.flatMap((verb) =>
      persons.map((person): Unit => ({ verb, tense, person })),
    )
    if (units.length > 0) remaining.set(tense, units)
  }

  const queue: ConjugationItem[] = []
  const recentVerbs: string[] = []

  while (queue.length < config.length) {
    const active = shuffle(
      [...remaining].filter(([, units]) => units.length > 0),
      rng,
    )
    if (active.length === 0) break

    let added = false
    for (const [tense, units] of active) {
      if (queue.length >= config.length) break

      const unit = takeUnit(units, recentVerbs, progress, rng)
      if (!unit) continue

      units.splice(units.indexOf(unit), 1)
      queue.push({
        mode: 'conjugation',
        verb: unit.verb,
        tense,
        person: unit.person,
        key: makeProgressKey(unit.verb.infinitive, tense, unit.person),
      })
      recentVerbs.push(unit.verb.infinitive)
      if (recentVerbs.length > 3) recentVerbs.shift()
      added = true
    }

    // Every remaining unit repeats one of the last three verbs, so the session ends here.
    if (!added) break
  }

  return queue
}

/**
 * Build one session's queue from the config and the learner's progress. The queue never
 * repeats a unit, and its order depends only on the injected generator.
 */
export function buildQueue(config: SessionConfig, progress: ProgressLookup, rng: Rng): Item[] {
  if (config.mode === 'vocabulary') return drawVocabulary(config, progress, rng)

  return drawConjugation(config, progress, rng)
}
