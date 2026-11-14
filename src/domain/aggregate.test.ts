import { describe, expect, it } from 'vitest'
import { canonicalVerb } from './verbs'
import type { ConjugationItem, VocabularyItem } from './draw'
import { drillReducer, type DrillState } from './drill'
import type { Person } from './session'
import type { TenseId } from './tenses'
import { aggregateStats, summarizeSession } from './aggregate'
import { makeProgressKey, makeVocabKey, type ProgressMap } from '../store/types'

function item(infinitive: string, tense: TenseId, person: Person): ConjugationItem {
  const verb = canonicalVerb(infinitive)
  if (!verb) throw new Error(`missing fixture verb ${infinitive}`)

  return {
    mode: 'conjugation',
    verb,
    tense,
    person,
    key: makeProgressKey(infinitive, tense, person),
  }
}

function vocabItem(infinitive: string): VocabularyItem {
  const verb = canonicalVerb(infinitive)
  if (!verb) throw new Error(`missing fixture verb ${infinitive}`)

  return {
    mode: 'vocabulary',
    verb,
    key: makeVocabKey(infinitive),
    options: [{ infinitive, gloss: verb.gloss, correct: true }],
  }
}

function answer(state: DrillState, value: string): DrillState {
  const typed = drillReducer(state, { type: 'input', value }) as DrillState
  return drillReducer(typed, { type: 'submit' }) as DrillState
}

function advance(state: DrillState): DrillState {
  return drillReducer(state, { type: 'advance' }) as DrillState
}

const fourItems = [
  item('hablar', 'presente', 'yo'),
  item('hablar', 'preterito_indefinido', 'yo'),
  item('hablar', 'presente', 'tu'),
  item('hablar', 'futuro_simple', 'yo'),
]

function earlyEndedSession(): DrillState {
  let state = drillReducer(null, { type: 'start', items: fourItems }) as DrillState

  state = advance(answer(state, 'hablo')) // presente yo: correct
  state = advance(answer(state, 'hable')) // pretérito yo is hablé: accent-only
  state = answer(state, 'habla') // presente tú is hablas: wrong, still revealed

  return drillReducer(state, { type: 'end' }) as DrillState
}

describe('session summary', () => {
  it('scores a session with correct, accent-only, wrong and an early end from the answers alone', () => {
    const summary = summarizeSession(earlyEndedSession())

    expect(summary.mode).toBe('conjugation')
    expect(summary.main).toEqual({
      total: 4,
      answered: 3,
      score: 2,
      exact: 1,
      accentOnly: 1,
      wrong: 1,
    })
    expect(summary.endedEarly).toBe(true)
    // The two misses queued a review round the explicit end skipped.
    expect(summary.review).toEqual({
      total: 2,
      answered: 0,
      score: 0,
      exact: 0,
      accentOnly: 0,
      wrong: 0,
    })
    expect(summary.missed).toEqual([
      {
        key: 'hablar|preterito_indefinido|yo',
        mode: 'conjugation',
        infinitive: 'hablar',
        gloss: 'to speak, talk',
        answer: 'hablé',
        tense: 'preterito_indefinido',
        tenseLabel: 'Pretérito indefinido',
        person: 'yo',
        personLabel: 'yo',
        verdict: 'accent-only',
        correctedInReview: false,
      },
      {
        key: 'hablar|presente|tu',
        mode: 'conjugation',
        infinitive: 'hablar',
        gloss: 'to speak, talk',
        answer: 'hablas',
        tense: 'presente',
        tenseLabel: 'Presente',
        person: 'tu',
        personLabel: 'tú',
        verdict: 'wrong',
        correctedInReview: false,
      },
    ])
  })

  it('groups the main round by tense and leaves the review round out of the first-try score', () => {
    const summary = summarizeSession(earlyEndedSession())

    expect(summary.byTense).toEqual([
      {
        tense: 'presente',
        label: 'Presente',
        gloss: 'present',
        total: 2,
        answered: 2,
        score: 1,
        accentOnly: 0,
        wrong: 1,
      },
      {
        tense: 'preterito_indefinido',
        label: 'Pretérito indefinido',
        gloss: 'simple past',
        total: 1,
        answered: 1,
        score: 1,
        accentOnly: 1,
        wrong: 0,
      },
      {
        tense: 'futuro_simple',
        label: 'Futuro simple',
        gloss: 'simple future',
        total: 1,
        answered: 0,
        score: 0,
        accentOnly: 0,
        wrong: 0,
      },
    ])
  })

  it('reports the review round separately so a repeated item cannot inflate the score', () => {
    let state = drillReducer(null, {
      type: 'start',
      items: [
        item('hablar', 'presente', 'yo'),
        item('hablar', 'preterito_indefinido', 'yo'),
        item('hablar', 'presente', 'tu'),
      ],
    }) as DrillState

    state = advance(answer(state, 'habla')) // wrong
    state = advance(answer(state, 'hable')) // accent-only
    state = advance(answer(state, 'hablas')) // correct, into review
    state = advance(answer(state, 'hablo')) // review: corrected
    state = answer(state, 'habla') // review: still wrong, then finished on advance
    state = advance(state)

    const summary = summarizeSession(state)

    expect(summary.main).toEqual({
      total: 3,
      answered: 3,
      score: 2,
      exact: 1,
      accentOnly: 1,
      wrong: 1,
    })
    expect(summary.review).toEqual({
      total: 2,
      answered: 2,
      score: 1,
      exact: 1,
      accentOnly: 0,
      wrong: 1,
    })
    expect(summary.endedEarly).toBe(false)
    expect(summary.missed.map((miss) => [miss.key, miss.correctedInReview])).toEqual([
      ['hablar|presente|yo', true],
      ['hablar|preterito_indefinido|yo', false],
    ])
  })

  it('yields the same numbers when the same fixture is summarized twice', () => {
    const first = summarizeSession(earlyEndedSession())
    const second = summarizeSession(earlyEndedSession())

    expect(second).toEqual(first)
  })

  it('uses the correct gloss and no tense for a vocabulary miss', () => {
    const verb = vocabItem('hablar')
    const summary = summarizeSession({
      items: [verb],
      reviewItems: [],
      answers: [{ key: verb.key, verdict: 'wrong', input: '' }],
    })

    expect(summary.mode).toBe('vocabulary')
    expect(summary.byTense).toEqual([])
    expect(summary.missed).toEqual([
      {
        key: 'hablar|vocab|',
        mode: 'vocabulary',
        infinitive: 'hablar',
        gloss: 'to speak, talk',
        answer: 'to speak, talk',
        verdict: 'wrong',
        correctedInReview: false,
      },
    ])
  })
})

describe('history stats', () => {
  const progress = {
    'hablar|presente|yo': { attempts: 10, wrong: 2, accent: 1 },
    'hablar|preterito_indefinido|yo': { attempts: 2, wrong: 0, accent: 1 },
    'ir|presente|3sg': { attempts: 4, wrong: 0, accent: 0 },
    'hablar|vocab|': { attempts: 5, wrong: 1, accent: 0 },
  }

  it('reports accuracy per tense, the accent rate and vocabulary accuracy apart', () => {
    const stats = aggregateStats(progress)

    expect(stats.attempts).toBe(16)
    expect(stats.wrong).toBe(2)
    expect(stats.accent).toBe(2)
    expect(stats.accuracy).toBeCloseTo(14 / 16)
    expect(stats.accentRate).toBeCloseTo(2 / 16)
    expect(stats.vocabulary).toEqual({ attempts: 5, wrong: 1, accuracy: 0.8 })
    expect(stats.byTense).toEqual([
      {
        tense: 'presente',
        label: 'Presente',
        gloss: 'present',
        attempts: 14,
        wrong: 2,
        accent: 1,
        accuracy: 12 / 14,
        accentRate: 1 / 14,
      },
      {
        tense: 'preterito_indefinido',
        label: 'Pretérito indefinido',
        gloss: 'simple past',
        attempts: 2,
        wrong: 0,
        accent: 1,
        accuracy: 1,
        accentRate: 0.5,
      },
    ])
  })

  it('lists the three most-missed verbs, breaking ties by attempts then name', () => {
    const stats = aggregateStats({
      'hablar|presente|yo': { attempts: 10, wrong: 3, accent: 0 },
      'ir|presente|yo': { attempts: 6, wrong: 2, accent: 1 },
      'ser|presente|yo': { attempts: 1, wrong: 1, accent: 0 },
      'tener|presente|yo': { attempts: 4, wrong: 0, accent: 0 },
      'decir|presente|yo': { attempts: 1, wrong: 1, accent: 0 },
    })

    expect(stats.mostMissed).toEqual([
      { infinitive: 'hablar', attempts: 10, misses: 3 },
      { infinitive: 'ir', attempts: 6, misses: 3 },
      { infinitive: 'decir', attempts: 1, misses: 1 },
    ])
  })

  it('counts a vocabulary miss as a miss of that verb', () => {
    const stats = aggregateStats({
      'hablar|vocab|': { attempts: 4, wrong: 1, accent: 0 },
    })

    expect(stats.mostMissed).toEqual([{ infinitive: 'hablar', attempts: 4, misses: 1 }])
    expect(stats.hasConjugation).toBe(false)
    expect(stats.hasVocabulary).toBe(true)
    expect(stats.byTense).toEqual([])
  })

  it('says there is no history yet instead of rendering zeroes', () => {
    const emptyMaps: ProgressMap[] = [
      {},
      { 'hablar|presente|yo': { attempts: 0, wrong: 0, accent: 0 } },
    ]

    for (const empty of emptyMaps) {
      const stats = aggregateStats(empty)

      expect(stats.hasHistory).toBe(false)
      expect(stats.hasConjugation).toBe(false)
      expect(stats.hasVocabulary).toBe(false)
      expect(stats.byTense).toEqual([])
      expect(stats.mostMissed).toEqual([])
    }
  })

  it('ignores a key whose tense the app no longer knows', () => {
    const stats = aggregateStats({
      'hablar|tesis_antigua|yo': { attempts: 3, wrong: 1, accent: 0 },
      'hablar|presente|yo': { attempts: 2, wrong: 0, accent: 0 },
    })

    expect(stats.attempts).toBe(2)
    expect(stats.byTense.map((tense) => tense.tense)).toEqual(['presente'])
    expect(stats.mostMissed).toEqual([])
  })
})
