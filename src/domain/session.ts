import { tenseById, type TenseId } from './tenses'

/** A session is one kind of item for its whole length; the two kinds are never mixed. */
export type Mode = 'conjugation' | 'vocabulary'

/** A grammatical slot in a paradigm, as the artifact and stored progress name it. */
export const PERSONS = ['yo', 'tu', '3sg', 'nosotros', 'vosotros', '3pl'] as const

export type Person = (typeof PERSONS)[number]

/** Every tense has these slots; both imperatives drop `yo`. */
const IMPERATIVE_PERSONS: readonly Person[] = ['tu', '3sg', 'nosotros', 'vosotros', '3pl']

/**
 * The person slots a tense offers: an imperative has no `yo`, and the vosotros setting
 * removes that slot everywhere.
 */
export function personsForTense(tense: TenseId, vosotros: boolean): Person[] {
  const info = tenseById(tense)
  const slots = info?.mood === 'imperativo' ? IMPERATIVE_PERSONS : PERSONS

  return slots.filter((person) => vosotros || person !== 'vosotros')
}

/** Frequency tier of the verb pool: top 100, top 500, or the whole artifact. */
export type VerbTier = 1 | 2 | 'all'

export function isVerbTier(value: unknown): value is VerbTier {
  return value === 1 || value === 2 || value === 'all'
}

export const MIN_SESSION_LENGTH = 5
export const MAX_SESSION_LENGTH = 50

/** Everything the draw needs to build one session. */
export interface SessionConfig {
  mode: Mode
  /** Selected tenses in catalogue order; empty in vocabulary mode. */
  tenses: TenseId[]
  verbTier: VerbTier
  length: number
  /** Hand-added infinitives, as the store keeps them. */
  customVerbs: string[]
  /** Whether the vosotros slot belongs in this session's drills. */
  vosotros: boolean
}
