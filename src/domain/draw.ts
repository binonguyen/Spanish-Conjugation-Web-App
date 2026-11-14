import type { Verb } from '../data/verbs'
import { makeProgressKey, makeVocabKey, type ProgressRecord } from '../store/types'
import { personsForTense, type Person, type SessionConfig } from './session'
import type { TenseId } from './tenses'
import { poolVerbs } from './verbPool'

/** A source of numbers in `[0, 1)`; the draw takes one so a session's queue is testable. */
export type Rng = () => number

/**
 * Mulberry32: a small seeded generator. The same seed always replays the same session.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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
}

/** One thing a session asks; the two shapes are never mixed within a session. */
export type Item = ConjugationItem | VocabularyItem

/** Index of the item drawn in proportion to its weight. */
function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, rng: Rng): number {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  let target = rng() * total

  for (let index = 0; index < items.length; index += 1) {
    target -= weight(items[index]!)
    if (target < 0) return index
  }

  return items.length - 1
}

function drawVocabulary(
  config: SessionConfig,
  progress: ProgressLookup,
  rng: Rng,
): VocabularyItem[] {
  const remaining = poolVerbs(config.verbTier, config.customVerbs)
  const items: VocabularyItem[] = []
  const count = Math.min(config.length, remaining.length)

  while (items.length < count) {
    const index = pickWeighted(
      remaining,
      (verb) => unitWeight(progress[makeVocabKey(verb.infinitive)]),
      rng,
    )
    const verb = remaining[index]!
    remaining.splice(index, 1)
    items.push({ mode: 'vocabulary', verb, key: makeVocabKey(verb.infinitive) })
  }

  return items
}

/** One drawable conjugation item before it becomes part of the queue. */
interface Unit {
  verb: Verb
  tense: TenseId
  person: Person
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    const current = items[index]!
    items[index] = items[swap]!
    items[swap] = current
  }

  return items
}

/**
 * Pick one unit from a tense, avoiding the verbs of the last three items. A pool too
 * small to clear that gap falls back to a shorter window rather than stalling.
 */
function takeUnit(
  units: readonly Unit[],
  recentVerbs: readonly string[],
  progress: ProgressLookup,
  rng: Rng,
): Unit | undefined {
  for (let window = 3; window >= 0; window -= 1) {
    const blocked = new Set(recentVerbs.slice(recentVerbs.length - window))
    const allowed = units.filter((unit) => !blocked.has(unit.verb.infinitive))
    if (allowed.length === 0) continue

    const index = pickWeighted(
      allowed,
      (unit) =>
        unitWeight(progress[makeProgressKey(unit.verb.infinitive, unit.tense, unit.person)]),
      rng,
    )
    return allowed[index]
  }

  return undefined
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
    }
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
