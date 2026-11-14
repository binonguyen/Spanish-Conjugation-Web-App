import { tenseById, type TenseId } from './tenses'

/** A session is one kind of item for its whole length; the two kinds are never mixed. */
export type Mode = 'conjugation' | 'vocabulary'

/** A grammatical slot in a paradigm, as the artifact and stored progress name it. */
export const PERSONS = ['yo', 'tu', '3sg', 'nosotros', 'vosotros', '3pl'] as const

export type Person = (typeof PERSONS)[number]

/** Every tense has these slots; both imperatives drop `yo`. */
const IMPERATIVE_PERSONS: readonly Person[] = ['tu', '3sg', 'nosotros', 'vosotros', '3pl']

function usesImperativeSlots(tense: TenseId): boolean {
  return tenseById(tense)?.mood === 'imperativo'
}

/**
 * The person slots a tense offers in the tense's own order; the artifact stores
 * forms in the same order. An imperative has no `yo`.
 */
export function personSlots(tense: TenseId): readonly Person[] {
  return usesImperativeSlots(tense) ? IMPERATIVE_PERSONS : PERSONS
}

/**
 * The person slots a session drills: the tense's own order minus `vosotros` while
 * that setting is off.
 */
export function personsForTense(tense: TenseId, vosotros: boolean): Person[] {
  if (!tenseById(tense)) return []

  return personSlots(tense).filter((person) => vosotros || person !== 'vosotros')
}

const PERSON_LABELS: Record<Person, string> = {
  yo: 'yo',
  tu: 'tú',
  '3sg': 'él / ella / usted',
  nosotros: 'nosotros',
  vosotros: 'vosotros',
  '3pl': 'ellos / ellas / ustedes',
}

/** An imperative addresses someone: its third persons are the usted forms. */
const IMPERATIVE_PERSON_LABELS: Record<Person, string> = {
  ...PERSON_LABELS,
  '3sg': 'usted',
  '3pl': 'ustedes',
}

/** How a person is named in a prompt or paradigm row. */
export function personLabel(tense: TenseId, person: Person): string {
  return usesImperativeSlots(tense) ? IMPERATIVE_PERSON_LABELS[person] : PERSON_LABELS[person]
}

/**
 * One representative subject pronoun, for the cue beside the answer input. The
 * third persons share their form with the other genders, so one pronoun is enough.
 */
const SUBJECT_PRONOUNS: Record<Person, string> = {
  yo: 'yo',
  tu: 'tú',
  '3sg': 'él',
  nosotros: 'nosotros',
  vosotros: 'vosotros',
  '3pl': 'ellos',
}

/** An imperative addresses someone, so its third persons are the usted forms. */
const IMPERATIVE_SUBJECT_PRONOUNS: Record<Person, string> = {
  ...SUBJECT_PRONOUNS,
  '3sg': 'usted',
  '3pl': 'ustedes',
}

/** The short pronoun shown in front of the answer input. */
export function subjectPronoun(tense: TenseId, person: Person): string {
  return usesImperativeSlots(tense)
    ? IMPERATIVE_SUBJECT_PRONOUNS[person]
    : SUBJECT_PRONOUNS[person]
}

/** Frequency tier of the verb pool: top 100, top 500, or the whole artifact. */
export type VerbTier = 1 | 2 | 'all'

export function isVerbTier(value: unknown): value is VerbTier {
  return value === 1 || value === 2 || value === 'all'
}

export const MIN_SESSION_LENGTH = 5
export const MAX_SESSION_LENGTH = 50

/** One length rule for the builder stepper and the saved default. */
export function clampSessionLength(length: number): number {
  return Math.min(MAX_SESSION_LENGTH, Math.max(MIN_SESSION_LENGTH, Math.round(length)))
}

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
