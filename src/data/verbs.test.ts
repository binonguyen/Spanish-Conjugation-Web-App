import { describe, expect, it } from 'vitest'
import artifact from './verbs.json'

interface Verb {
  infinitive: string
  reflexive: boolean
  gloss: string
  tier: 1 | 2
  forms: Record<string, string[][]>
  nonFinite: { gerundio: string[]; participio: string[] }
}

interface Artifact {
  generatedAt: string
  personOrder: { personal: string[]; imperative: string[] }
  tenses: string[]
  sources: { name: string; license: string; url: string; use: string }[]
  verbs: Verb[]
  haber: Record<string, string[][]>
}

const data = artifact as Artifact
const { personal, imperative } = data.personOrder

const COMPOUND_TENSES = [
  'preterito_perfecto',
  'pluscuamperfecto',
  'futuro_perfecto',
  'condicional_perfecto',
  'preterito_anterior',
  'perfecto_subjuntivo',
  'pluscuamperfecto_subjuntivo',
  'futuro_perfecto_subjuntivo',
]

function verb(infinitive: string): Verb {
  const found = data.verbs.find((entry) => entry.infinitive === infinitive)
  if (!found) throw new Error(`missing verb: ${infinitive}`)
  return found
}

function accepted(v: Verb, tense: string, person: string): string[] {
  const people = tense.startsWith('imperativo_') ? imperative : personal
  const cells = v.forms[tense]
  const index = people.indexOf(person)
  if (!cells || index < 0) throw new Error(`bad lookup: ${v.infinitive} ${tense} ${person}`)
  return cells[index] ?? []
}

describe('conjugation data artifact', () => {
  it('carries a generation stamp and its sources', () => {
    expect(Date.parse(data.generatedAt)).not.toBeNaN()
    expect(data.sources.map((source) => source.name).join(' ')).toMatch(/conjuego/)
    for (const source of data.sources) {
      expect(source.license).not.toBe('')
      expect(source.url).toMatch(/^https:\/\//)
    }
  })

  it('has 501 unique verbs in frequency order, with 100 in tier 1', () => {
    expect(data.verbs).toHaveLength(501)
    expect(new Set(data.verbs.map((entry) => entry.infinitive)).size).toBe(data.verbs.length)
    expect(data.verbs.filter((entry) => entry.tier === 1)).toHaveLength(100)
    expect(data.verbs.slice(0, 100).every((entry) => entry.tier === 1)).toBe(true)
    expect(data.verbs.slice(100).every((entry) => entry.tier === 2)).toBe(true)
    expect(data.verbs[0]?.infinitive).toBe('ser')
  })

  it('marks an infinitive ending in -se as reflexive', () => {
    for (const entry of data.verbs) {
      expect(entry.reflexive).toBe(entry.infinitive.endsWith('se'))
    }
  })

  it('never stores a compound tense', () => {
    for (const tense of COMPOUND_TENSES) {
      expect(data.tenses).not.toContain(tense)
      expect(verb('hablar').forms).not.toHaveProperty(tense)
    }
  })

  it('has a non-empty accepted-form array for every tense and available person', () => {
    for (const entry of data.verbs) {
      for (const tense of data.tenses) {
        const people = tense.startsWith('imperativo_') ? imperative : personal
        const cells = entry.forms[tense]
        expect(cells, `${entry.infinitive}/${tense}`).toHaveLength(people.length)
        for (const cell of cells ?? []) {
          expect(cell.length).toBeGreaterThan(0)
          for (const form of cell) {
            expect(form.trim()).not.toBe('')
            expect(form).not.toMatch(/\?|undefined|null/i)
          }
        }
      }
    }
  })

  it('drops the yo slot from both imperatives and keeps five people', () => {
    expect(imperative).toEqual(['tu', '3sg', 'nosotros', 'vosotros', '3pl'])
    for (const entry of data.verbs) {
      expect(entry.forms.imperativo_afirmativo).toHaveLength(5)
      expect(entry.forms.imperativo_negativo).toHaveLength(5)
    }
  })

  it('carries both -ra and -se imperfect-subjunctive endings for every verb', () => {
    for (const entry of data.verbs) {
      for (const person of personal) {
        const forms = accepted(entry, 'imperfecto_subjuntivo', person)
        expect(forms.length, `${entry.infinitive}/${person}`).toBeGreaterThanOrEqual(2)
        expect(forms.some((form) => form.includes('ra'))).toBe(true)
        expect(forms.some((form) => form.includes('se'))).toBe(true)
      }
    }
  })

  it('has vosotros forms for every verb', () => {
    for (const entry of data.verbs) {
      for (const tense of data.tenses.filter((tense) => tense !== 'imperativo_afirmativo')) {
        expect(accepted(entry, tense, 'vosotros').length, `${entry.infinitive}/${tense}`).toBeGreaterThan(0)
      }
      expect(accepted(entry, 'imperativo_afirmativo', 'vosotros').length).toBeGreaterThan(0)
    }
  })

  it('gives every verb an English gloss', () => {
    for (const entry of data.verbs) {
      expect(entry.gloss.trim()).not.toBe('')
      expect(entry.gloss).not.toMatch(/\?|undefined/i)
    }
  })

  it('spot-checks the paradigms the ticket names', () => {
    const cases: [string, string, string, string[]][] = [
      ['hablar', 'presente', 'yo', ['hablo']],
      ['hablar', 'preterito_indefinido', 'yo', ['hablé']],
      ['hablar', 'imperativo_afirmativo', 'tu', ['habla']],
      ['hablar', 'imperfecto_subjuntivo', 'yo', ['hablara', 'hablase']],
      ['hablar', 'futuro_subjuntivo', 'yo', ['hablare']],
      ['ir', 'presente', 'yo', ['voy']],
      ['ir', 'preterito_indefinido', 'yo', ['fui']],
      ['ir', 'imperativo_afirmativo', 'tu', ['ve']],
      ['ser', 'presente', 'yo', ['soy']],
      ['ser', 'imperfecto_subjuntivo', 'yo', ['fuera', 'fuese']],
      ['ser', 'imperativo_afirmativo', 'tu', ['sé']],
      ['tener', 'presente', 'yo', ['tengo']],
      ['tener', 'preterito_indefinido', 'yo', ['tuve']],
      ['tener', 'futuro_simple', 'yo', ['tendré']],
      ['decir', 'presente', 'yo', ['digo']],
      ['decir', 'preterito_indefinido', 'yo', ['dije']],
      ['decir', 'imperativo_afirmativo', 'tu', ['di']],
      ['llamarse', 'presente', 'yo', ['me llamo']],
      ['llamarse', 'imperativo_afirmativo', 'tu', ['llámate']],
      ['llamarse', 'imperativo_negativo', 'tu', ['te llames']],
      ['llamarse', 'imperfecto_subjuntivo', 'yo', ['me llamara', 'me llamase']],
    ]
    for (const [infinitive, tense, person, expected] of cases) {
      expect(accepted(verb(infinitive), tense, person), `${infinitive} ${tense} ${person}`).toEqual(expected)
    }
  })

  it('stores the irregular non-finite forms needed for compound tenses', () => {
    expect(verb('decir').nonFinite.participio).toEqual(['dicho'])
    expect(verb('ir').nonFinite.gerundio).toEqual(['yendo'])
    expect(verb('tener').nonFinite.participio).toEqual(['tenido'])
    expect(verb('hablar').nonFinite).toEqual({ gerundio: ['hablando'], participio: ['hablado'] })
  })

  it('emits a personal haber table with no impersonal hay', () => {
    expect(data.haber.presente?.[personal.indexOf('yo')]).toEqual(['he'])
    expect(data.haber.presente?.[personal.indexOf('3sg')]).toEqual(['ha'])
    expect(data.haber.presente?.[personal.indexOf('nosotros')]).toEqual(['hemos'])
    expect(data.haber.imperfecto_subjuntivo?.[0]).toEqual(['hubiera', 'hubiese'])
    expect(data.haber).not.toHaveProperty('imperativo_afirmativo')
  })

  it('ships under the 110 KB gzip budget', async () => {
    const stream = new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream('gzip'))
    const gzip = (await new Response(stream).arrayBuffer()).byteLength
    expect(gzip).toBeLessThan(110 * 1024)
  })
})
