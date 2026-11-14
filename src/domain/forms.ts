import { verbArtifact, type Verb } from '../data/verbs'
import { personLabel, personSlots, personsForTense, type Person } from './session'
import { tenseById, type TenseId } from './tenses'

/**
 * The perfect tenses the artifact does not store, and the `haber` paradigm each is
 * composed from. Keeping them here rather than in the data saves a second copy of
 * every paradigm and removes a class of stored-form bugs.
 */
const COMPOUND_SOURCE: Partial<Record<TenseId, TenseId>> = {
  preterito_perfecto: 'presente',
  pluscuamperfecto: 'preterito_imperfecto',
  futuro_perfecto: 'futuro_simple',
  condicional_perfecto: 'condicional_simple',
  preterito_anterior: 'preterito_indefinido',
  perfecto_subjuntivo: 'presente_subjuntivo',
  pluscuamperfecto_subjuntivo: 'imperfecto_subjuntivo',
  futuro_perfecto_subjuntivo: 'futuro_subjuntivo',
}

/** The pronoun a reflexive verb carries before `haber` in a compound form. */
const REFLEXIVE_PRONOUNS: Record<Person, string> = {
  yo: 'me',
  tu: 'te',
  '3sg': 'se',
  nosotros: 'nos',
  vosotros: 'os',
  '3pl': 'se',
}

function cellAt(forms: readonly (readonly string[])[] | undefined, index: number): string[] {
  return forms?.[index] ? [...forms[index]!] : []
}

function simpleForms(verb: Verb, tense: TenseId, person: Person): string[] {
  const index = personSlots(tense).indexOf(person)
  if (index < 0) return []

  return cellAt(verb.forms[tense], index)
}

function compoundForms(verb: Verb, haberTense: TenseId, person: Person): string[] {
  const index = personSlots(haberTense).indexOf(person)
  if (index < 0) return []

  const haberForms = cellAt(verbArtifact.haber[haberTense], index)
  const participles = verb.nonFinite.participio
  if (haberForms.length === 0 || participles.length === 0) return []

  return haberForms.flatMap((haber) =>
    participles.map((participle) => {
      const composed = `${haber} ${participle}`
      return verb.reflexive ? `${REFLEXIVE_PRONOUNS[person]} ${composed}` : composed
    }),
  )
}

/**
 * Every form accepted for one cell in a drill. A simple tense is read from the
 * artifact; a perfect tense is composed from `haber` and the verb's participle,
 * with a reflexive pronoun in front when the verb needs one.
 */
export function acceptedForms(verb: Verb, tense: TenseId, person: Person): string[] {
  const haberTense = COMPOUND_SOURCE[tense]

  return haberTense
    ? compoundForms(verb, haberTense, person)
    : simpleForms(verb, tense, person)
}

/** One row of a tense's paradigm, as the reveal's table shows it. */
export interface ParadigmRow {
  person: Person
  label: string
  forms: string[]
}

/** The whole drillable paradigm of one verb in one tense, in the tense's person order. */
export function paradigm(verb: Verb, tense: TenseId, vosotros: boolean): ParadigmRow[] {
  if (!tenseById(tense)) return []

  return personsForTense(tense, vosotros).map((person) => ({
    person,
    label: personLabel(tense, person),
    forms: acceptedForms(verb, tense, person),
  }))
}
