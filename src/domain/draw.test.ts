import { describe, expect, it } from 'vitest'
import { verbArtifact } from '../data/verbs'
import { personsForTense, type SessionConfig } from './session'
import { makeVocabKey, type ProgressRecord } from '../store/types'
import {
  buildQueue,
  createRng,
  unitWeight,
  type ConjugationItem,
  type Item,
  type ProgressLookup,
} from './draw'
import { poolVerbs } from './verbPool'

function config(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    mode: 'conjugation',
    tenses: ['presente'],
    verbTier: 2,
    length: 20,
    customVerbs: [],
    vosotros: false,
    ...overrides,
  }
}

function record(attempts: number, wrong: number, accent = 0): ProgressRecord {
  return { attempts, wrong, accent }
}

function conjugationItems(queue: Item[]): ConjugationItem[] {
  return queue.flatMap((item) => (item.mode === 'conjugation' ? [item] : []))
}

describe('item weight', () => {
  it('gives an unseen unit four times the pull of a clean drilled one', () => {
    expect(unitWeight(undefined)).toBe(4)
    expect(unitWeight(record(8, 0))).toBe(1)
    expect(unitWeight({ attempts: 0, wrong: 0, accent: 0 })).toBe(4)
  })

  it('raises the weight with the share of misses, counting accent-only as a miss', () => {
    expect(unitWeight(record(4, 3))).toBe(3.25)
    expect(unitWeight(record(4, 0, 3))).toBe(3.25)
    expect(unitWeight(record(10, 5))).toBe(2.5)
  })

  it('ranks a wrong-heavy unit above an equally drilled clean one', () => {
    expect(unitWeight(record(4, 3))).toBeGreaterThan(unitWeight(record(4, 0)))
  })
})

describe('conjugation draw', () => {
  it('matches the artifact person order for each tense shape', () => {
    expect(personsForTense('presente', true)).toEqual(verbArtifact.personOrder.personal)
    expect(personsForTense('imperativo_negativo', true)).toEqual(verbArtifact.personOrder.imperative)
    expect(personsForTense('presente', false)).not.toContain('vosotros')
  })

  it('offers no yo for imperatives and no vosotros while the setting is off', () => {
    const queue = buildQueue(
      config({ tenses: ['imperativo_afirmativo'], length: 30 }),
      {},
      createRng(3),
    )
    const items = conjugationItems(queue)

    expect(items).toHaveLength(30)
    expect(items.every((item) => item.person !== 'yo')).toBe(true)
    expect(items.every((item) => item.person !== 'vosotros')).toBe(true)
  })

  it('adds the vosotros slot only when the setting is on', () => {
    const persons = new Set(
      conjugationItems(
        buildQueue(config({ length: 50, vosotros: true }), {}, createRng(5)),
      ).map((item) => item.person),
    )

    expect(persons.has('vosotros')).toBe(true)
    expect(persons.has('yo')).toBe(true)
  })

  it('interleaves tenses instead of serving them in blocks', () => {
    const queue = buildQueue(
      config({ tenses: ['presente', 'preterito_indefinido'], length: 20 }),
      {},
      createRng(9),
    )
    const tenses = conjugationItems(queue).map((item) => item.tense)

    expect(new Set(tenses)).toEqual(new Set(['presente', 'preterito_indefinido']))
    for (let index = 0; index + 3 <= tenses.length; index += 1) {
      expect(new Set(tenses.slice(index, index + 3)).size, `window at ${index}`).toBeGreaterThan(1)
    }
  })

  it('never repeats a verb within three positions', () => {
    const queue = conjugationItems(
      buildQueue(config({ tenses: ['presente'], length: 50 }), {}, createRng(4)),
    )

    for (let index = 0; index < queue.length; index += 1) {
      const recent = queue.slice(Math.max(0, index - 3), index).map((item) => item.verb.infinitive)
      expect(recent).not.toContain(queue[index]!.verb.infinitive)
    }
  })

  it('keys each item at verb, tense and person', () => {
    const queue = conjugationItems(buildQueue(config(), {}, createRng(2)))

    for (const item of queue) {
      expect(item.key).toBe(`${item.verb.infinitive}|${item.tense}|${item.person}`)
    }
  })
})

describe('weighted draw', () => {
  it('lets an unseen or miss-heavy verb outrank four clean ones at the same draw point', () => {
    const pool = poolVerbs(1, [])
    const target = pool[0]!
    const key = makeVocabKey(target.infinitive)
    const clean: Record<string, ProgressRecord> = Object.fromEntries(
      pool.map((verb) => [makeVocabKey(verb.infinitive), record(10, 0)]),
    )
    const unseen: ProgressLookup = { ...clean, [key]: undefined }
    const missHeavy: ProgressLookup = { ...clean, [key]: record(4, 3) }
    const firstDrawn = (progress: ProgressLookup) =>
      buildQueue(
        config({ mode: 'vocabulary', tenses: [], verbTier: 1, length: 5 }),
        progress,
        () => 0.02,
      )[0]!.verb.infinitive

    // A two-percent draw only reaches the first item once its weight is above one.
    expect(firstDrawn(clean)).not.toBe(target.infinitive)
    expect(firstDrawn(unseen)).toBe(target.infinitive)
    expect(firstDrawn(missHeavy)).toBe(target.infinitive)
  })
})

describe('seeded queue', () => {
  const progress: Record<string, ProgressRecord> = {
    'apurar|preterito_indefinido|nosotros': record(4, 3),
    'hervir|presente|nosotros': record(6, 1, 2),
    'vender|preterito_indefinido|3sg': record(10, 0),
    'apurar|vocab|': record(4, 3),
    'hervir|vocab|': record(10, 0),
    'vender|vocab|': record(3, 0, 3),
  }

  it('replays a locked conjugation queue for a fixed seed and fixture', () => {
    const queue = buildQueue(
      config({ tenses: ['presente', 'preterito_indefinido'], length: 8 }),
      progress,
      createRng(2026),
    )

    expect(queue.map((item) => item.key)).toEqual([
      'apurar|preterito_indefinido|nosotros',
      'hervir|presente|3sg',
      'aceptar|presente|3pl',
      'vender|preterito_indefinido|3sg',
      'retirar|presente|yo',
      'elegir|preterito_indefinido|yo',
      'tratar|preterito_indefinido|yo',
      'fastidiar|presente|3sg',
    ])
  })

  it('replays a locked vocabulary queue for a fixed seed and fixture', () => {
    const queue = buildQueue(
      config({ mode: 'vocabulary', tenses: [], length: 8 }),
      progress,
      createRng(2026),
    )

    expect(queue.map((item) => item.key)).toEqual([
      'desayunar|vocab|',
      'tardar|vocab|',
      'freír|vocab|',
      'molestar|vocab|',
      'aceptar|vocab|',
      'comprar|vocab|',
      'repartir|vocab|',
      'transferir|vocab|',
    ])
  })
})

describe('vocabulary draw', () => {
  it('draws a verb once per session and keys its progress under vocab', () => {
    const queue = buildQueue(
      config({ mode: 'vocabulary', tenses: [], length: 50 }),
      {},
      createRng(7),
    )

    expect(queue).toHaveLength(50)
    expect(new Set(queue.map((item) => item.verb.infinitive)).size).toBe(50)
    for (const item of queue) {
      expect(item.mode).toBe('vocabulary')
      expect(item.key).toBe(`${item.verb.infinitive}|vocab|`)
    }
  })

  it('replays the same queue for the same seed and a different one otherwise', () => {
    const first = buildQueue(config({ mode: 'vocabulary', tenses: [], length: 20 }), {}, createRng(11))
    const again = buildQueue(config({ mode: 'vocabulary', tenses: [], length: 20 }), {}, createRng(11))
    const other = buildQueue(config({ mode: 'vocabulary', tenses: [], length: 20 }), {}, createRng(12))

    expect(again.map((item) => item.key)).toEqual(first.map((item) => item.key))
    expect(other.map((item) => item.key)).not.toEqual(first.map((item) => item.key))
  })
})
