import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DrillAnswer } from '../domain/drill'
import { createStore, makeProgressKey, makeVocabKey, type LocalStore } from '../store/store'
import { recordAnswers } from './recordAnswers'

let store: LocalStore

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  store = await createStore({ name: `conjugation-trainer-record-${Math.random()}` })
})

afterEach(() => {
  store.close()
})

describe('recording a drill', () => {
  it('writes exactly the expected counters for each verdict', async () => {
    const answers: DrillAnswer[] = [
      { key: makeProgressKey('hablar', 'presente', 'yo'), verdict: 'correct', input: 'hablo' },
      {
        key: makeProgressKey('hablar', 'preterito_indefinido', 'yo'),
        verdict: 'accent-only',
        input: 'hable',
      },
      { key: makeProgressKey('hablar', 'presente', 'tu'), verdict: 'wrong', input: 'habla' },
    ]

    expect(await recordAnswers(store, answers)).toEqual([])

    expect(await store.getAllProgress()).toEqual({
      'hablar|presente|yo': { attempts: 1, wrong: 0, accent: 0 },
      'hablar|preterito_indefinido|yo': { attempts: 1, wrong: 0, accent: 1 },
      'hablar|presente|tu': { attempts: 1, wrong: 1, accent: 0 },
    })
  })

  it('records a vocabulary check under the reserved vocab key with no accent count', async () => {
    await recordAnswers(store, [
      { key: makeVocabKey('hablar'), verdict: 'wrong', input: 'to see' },
      { key: makeVocabKey('hablar'), verdict: 'correct', input: 'to speak, talk' },
    ])

    expect(await store.getProgress(makeVocabKey('hablar'))).toEqual({
      attempts: 2,
      wrong: 1,
      accent: 0,
    })
  })

  it('adds to a record the learner already has', async () => {
    await store.recordVerdict(makeProgressKey('hablar', 'presente', 'yo'), 'wrong')

    await recordAnswers(store, [
      { key: makeProgressKey('hablar', 'presente', 'yo'), verdict: 'correct', input: 'hablo' },
    ])

    expect(await store.getProgress(makeProgressKey('hablar', 'presente', 'yo'))).toEqual({
      attempts: 2,
      wrong: 1,
      accent: 0,
    })
  })
})
