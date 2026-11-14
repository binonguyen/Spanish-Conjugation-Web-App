import type { TenseId } from './tenses'

/** A session is one kind of item for its whole length; the two kinds are never mixed. */
export type Mode = 'conjugation' | 'vocabulary'

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
}
