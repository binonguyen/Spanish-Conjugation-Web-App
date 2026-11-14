import { describe, expect, it } from 'vitest'
import { TENSES } from './tenses'
import { personsForTense, personLabel, subjectPronoun } from './session'
import { acceptedForms, paradigm } from './forms'
import { canonicalVerb } from './verbs'
import type { Verb } from '../data/verbs'

function verb(infinitive: string): Verb {
  const found = canonicalVerb(infinitive)
  if (!found) throw new Error(`missing fixture verb ${infinitive}`)
  return found
}

const hablar = verb('hablar')
const ir = verb('ir')
const llamarse = verb('llamarse')

describe('accepted forms', () => {
  it('reads a simple tense cell from the artifact', () => {
    expect(acceptedForms(hablar, 'presente', 'yo')).toEqual(['hablo'])
    expect(acceptedForms(hablar, 'presente', 'vosotros')).toEqual(['habláis'])
  })

  it('keeps every accepted variant of a cell', () => {
    expect(acceptedForms(hablar, 'imperfecto_subjuntivo', 'yo')).toEqual(['hablara', 'hablase'])
    expect(acceptedForms(ir, 'imperativo_afirmativo', 'nosotros')).toEqual(['vamos', 'vayamos'])
  })

  it('has no form where an imperative has no person', () => {
    expect(acceptedForms(hablar, 'imperativo_afirmativo', '3sg')).toEqual(['hable'])
    expect(acceptedForms(hablar, 'imperativo_afirmativo', 'yo')).toEqual([])
  })

  it('composes a perfect tense from haber and the participle', () => {
    expect(acceptedForms(hablar, 'preterito_perfecto', 'tu')).toEqual(['has hablado'])
    expect(acceptedForms(hablar, 'futuro_perfecto', 'nosotros')).toEqual(['habremos hablado'])
  })

  it('composes every haber variant of an imperfect subjunctive perfect', () => {
    expect(acceptedForms(hablar, 'pluscuamperfecto_subjuntivo', 'yo')).toEqual([
      'hubiera hablado',
      'hubiese hablado',
    ])
  })

  it('puts the reflexive pronoun before the composed perfect', () => {
    expect(acceptedForms(llamarse, 'preterito_perfecto', 'yo')).toEqual(['me he llamado'])
    expect(acceptedForms(llamarse, 'preterito_perfecto', '3sg')).toEqual(['se ha llamado'])
    expect(acceptedForms(llamarse, 'preterito_perfecto', 'vosotros')).toEqual(['os habéis llamado'])
  })

  it('has a form for every catalogue tense and offered person', () => {
    for (const verb of [hablar, llamarse]) {
      for (const tense of TENSES) {
        for (const person of personsForTense(tense.id, true)) {
          expect(
            acceptedForms(verb, tense.id, person).length,
            `${verb.infinitive} ${tense.id} ${person}`,
          ).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('paradigm', () => {
  it('lists the tense rows in the artifact order with the session vosotros setting', () => {
    expect(paradigm(hablar, 'presente', false).map((row) => row.person)).toEqual([
      'yo',
      'tu',
      '3sg',
      'nosotros',
      '3pl',
    ])
    expect(paradigm(hablar, 'presente', true).map((row) => row.person)).toContain('vosotros')
  })

  it('carries each row label and accepted forms', () => {
    const rows = paradigm(hablar, 'imperfecto_subjuntivo', false)

    expect(rows.find((row) => row.person === 'yo')).toEqual({
      person: 'yo',
      label: 'yo',
      forms: ['hablara', 'hablase'],
    })
  })

  it('names imperative third persons usted and ustedes', () => {
    expect(personLabel('imperativo_negativo', '3sg')).toBe('usted')
    expect(personLabel('imperativo_negativo', '3pl')).toBe('ustedes')
    expect(personLabel('presente', '3sg')).toBe('él / ella / usted')
  })

  it('gives the input cue one representative subject pronoun', () => {
    expect(subjectPronoun('presente', 'yo')).toBe('yo')
    expect(subjectPronoun('presente', 'tu')).toBe('tú')
    expect(subjectPronoun('presente', '3sg')).toBe('él')
    expect(subjectPronoun('presente', '3pl')).toBe('ellos')
    // An imperative addresses someone, so its third persons stay usted/ustedes.
    expect(subjectPronoun('imperativo_afirmativo', '3sg')).toBe('usted')
    expect(subjectPronoun('imperativo_negativo', '3pl')).toBe('ustedes')
  })

  it('composes compound rows too', () => {
    const rows = paradigm(hablar, 'preterito_perfecto', false)
    const row = rows.find((candidate) => candidate.person === 'nosotros') as
      | { forms: string[] }
      | undefined

    expect(row?.forms).toEqual(['hemos hablado'])
  })
})
