import { describe, expect, it } from 'vitest'
import {
  buildFormIndex,
  matchVerbs,
  parseOverrideTsv,
  parsePairLine,
  parseSentenceTsv,
  selectSentences,
  serializeSentenceTsv,
  type IndexableVerb,
  type TatoebaPair,
} from './sentences.ts'

function verb(infinitive: string, forms: Record<string, string[][]>, gerundio: string[] = []): IndexableVerb {
  return { infinitive, forms, nonFinite: { gerundio, participio: [] } }
}

function pair(id: number, es: string, en = 'translation'): TatoebaPair {
  return { id, es, en, author: 'author' }
}

const attribution = (englishId: number, spanishId: number) =>
  `CC-BY 2.0 (France) Attribution: tatoeba.org #${englishId} (englishAuthor) & #${spanishId} (spanishAuthor)`

describe('parsePairLine', () => {
  it('takes the Spanish sentence id and author from the second attribution link', () => {
    expect(parsePairLine(`Go.\tVe.\t${attribution(2877272, 4986655)}`)).toEqual({
      en: 'Go.',
      es: 'Ve.',
      id: 4986655,
      author: 'spanishAuthor',
    })
  })

  it('rejects a line without both aligned attribution links', () => {
    expect(parsePairLine('Go.\tVe.\tCC-BY 2.0 (France)')).toBeNull()
    expect(parsePairLine(`Go.\tVe.\tCC-BY 2.0 (France) Attribution: tatoeba.org #4986655 (author)`)).toBeNull()
  })

  it('rejects a line with an empty side or missing columns', () => {
    expect(parsePairLine(`\tVe.\t${attribution(1, 2)}`)).toBeNull()
    expect(parsePairLine(`Go.\t\t${attribution(1, 2)}`)).toBeNull()
    expect(parsePairLine('Go.')).toBeNull()
  })
})

describe('sentence TSV', () => {
  const text = [
    '# Columns: infinitive, id, author, es, en',
    `hablar\t4986655\tcueyayotl\tHablo mucho.\tI speak a lot.`,
    `ir\t42\tCK\tVoy a casa.\tI am going home.`,
    '',
  ].join('\n')

  it('round-trips the selected sentences in verb order', () => {
    const rows = parseSentenceTsv(text)
    expect(rows.get('hablar')).toEqual({ id: 4986655, author: 'cueyayotl', es: 'Hablo mucho.', en: 'I speak a lot.' })
    expect(serializeSentenceTsv(rows, ['ir', 'hablar', 'ser'])).toContain(
      'ir\t42\tCK\tVoy a casa.\tI am going home.\nhablar\t4986655\tcueyayotl\tHablo mucho.\tI speak a lot.',
    )
  })

  it('fails loudly on malformed rows, duplicates and bad ids', () => {
    expect(() => parseSentenceTsv('hablar\tno-number\tauthor\tes\ten')).toThrow()
    expect(() => parseSentenceTsv('hablar\t1\tauthor\tes')).toThrow()
    expect(() => parseSentenceTsv('hablar\t1\tauthor\tes\ten\nhablar\t2\tauthor\tes2\ten2')).toThrow()
    expect(() => parseSentenceTsv('hablar\t0\tauthor\tes\ten')).toThrow()
  })
})

describe('sentence overrides', () => {
  it('maps a verb to a forced Tatoeba id', () => {
    const overrides = parseOverrideTsv('# comment\npartir\t1229317\nayudar\t1493195\n')
    expect([...overrides]).toEqual([
      ['partir', 1229317],
      ['ayudar', 1493195],
    ])
  })

  it('rejects malformed and duplicate overrides', () => {
    expect(() => parseOverrideTsv('partir\tnope')).toThrow()
    expect(() => parseOverrideTsv('partir\t1\textra')).toThrow()
    expect(() => parseOverrideTsv('partir\t1\npartir\t2')).toThrow()
  })
})

describe('form matching', () => {
  const hablar = verb('hablar', {
    presente: [['hablo'], ['hablas'], ['habla'], ['hablamos'], ['habláis'], ['hablan']],
    preterito_indefinido: [['hablé'], ['hablaste'], ['habló'], ['hablamos'], ['hablasteis'], ['hablaron']],
  })
  const llamarse = verb('llamarse', {
    presente: [['me llamo'], ['te llamas'], ['se llama'], ['nos llamamos'], ['os llamáis'], ['se llaman']],
  })
  const index = buildFormIndex([hablar, llamarse])

  it('matches single-word and reflexive multi-word forms regardless of case and punctuation', () => {
    expect(matchVerbs('Ayer HABLÉ con ella.', index)).toEqual(new Set(['hablar']))
    expect(matchVerbs('¡Me llamo Ana!', index)).toEqual(new Set(['llamarse']))
  })

  it('does not match a form inside a longer word', () => {
    expect(matchVerbs('Es un gran hablador.', index)).toEqual(new Set())
  })

  it('matches non-finite forms', () => {
    const speaking = buildFormIndex([verb('hablar', {}, ['hablando'])])
    expect(matchVerbs('Estoy hablando contigo.', speaking)).toEqual(new Set(['hablar']))
  })
})

describe('selectSentences', () => {
  const hablar = verb('hablar', {
    presente: [['hablo'], ['hablas'], ['habla'], ['hablamos'], ['hablan']],
    preterito_indefinido: [['hablé'], ['hablaste'], ['habló'], ['hablamos'], ['hablaron']],
  })
  const llamar = verb('llamar', { presente: [['llamo'], ['llamas'], ['llama'], ['llamamos'], ['llaman']] })
  const speak = 'Ayer hablé con mi hermana sobre el viaje.'

  it('keeps one sentence per verb, preferring length inside the comfortable band', () => {
    const chosen = selectSentences(
      [
        pair(1, 'Sí.'),
        pair(2, 'Hablo.'),
        pair(3, speak),
        pair(4, 'Siempre hablo con mi madre cuando vuelvo a casa por la noche después del trabajo.'),
      ],
      [hablar],
    )
    expect(chosen.get('hablar')).toEqual(pair(3, speak))
  })

  it('rejects long, empty-English and attribution-less pairs', () => {
    const tooLong = 'Hablo ' + 'con mucha gente '.repeat(6)
    const chosen = selectSentences(
      [pair(1, tooLong), { ...pair(2, 'Hablo mucho.'), en: '' }, pair(3, 'Hablo poco.')],
      [hablar],
    )
    expect(chosen.get('hablar')?.id).toBe(3)
  })

  it('prefers a form that only matches the verb over one shared with another verb', () => {
    const chosen = selectSentences(
      [pair(1, 'Hablo y llamo a mi madre.'), pair(2, 'Hablas mucho con ella.'), pair(3, 'Llamo a mi madre todos los días.')],
      [hablar, llamar],
    )
    expect(chosen.get('hablar')?.id).toBe(2)
    expect(chosen.get('llamar')?.id).toBe(3)
  })

  it('does not give the same sentence to two verbs when an alternative exists', () => {
    const shared = 'Hablo y llamo cuando quiero.'
    const chosen = selectSentences(
      [
        pair(1, shared),
        pair(2, 'Siempre hablo con mi madre cuando vuelvo a casa por la noche después del trabajo.'),
        pair(3, 'Siempre llamo a mi madre cuando vuelvo a casa por la noche después del trabajo.'),
      ],
      [hablar, llamar],
    )
    expect(chosen.get('hablar')?.id).toBe(1)
    expect(chosen.get('llamar')?.id).toBe(3)
  })

  it('omits verbs with no suitable sentence and is deterministic', () => {
    const first = selectSentences([pair(2, 'Hablo poco.'), pair(1, 'Hablo mucho.')], [hablar, llamar])
    const second = selectSentences([pair(1, 'Hablo mucho.'), pair(2, 'Hablo poco.')], [hablar, llamar])
    expect(first.get('hablar')?.id).toBe(1)
    expect(first.has('llamar')).toBe(false)
    expect(second).toEqual(first)
  })
})
