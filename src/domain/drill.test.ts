import { describe, expect, it } from 'vitest'
import type { ConjugationItem } from './draw'
import {
  atRoundEnd,
  currentItem,
  currentVerdict,
  drillReducer,
  roundLength,
  startDrill,
  startsReview,
  type DrillState,
} from './drill'
import type { Person } from './session'
import type { TenseId } from './tenses'
import { canonicalVerb } from './verbs'
import { makeProgressKey } from '../store/types'

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

function type(state: DrillState, value: string): DrillState {
  return drillReducer(state, { type: 'input', value }) as DrillState
}

function submit(state: DrillState): DrillState {
  return drillReducer(state, { type: 'submit' }) as DrillState
}

function answer(state: DrillState, value: string): DrillState {
  return submit(type(state, value))
}

function nextItem(state: DrillState): DrillState {
  return drillReducer(state, { type: 'advance' }) as DrillState
}

const threeItems = [
  item('hablar', 'presente', 'yo'),
  item('hablar', 'preterito_indefinido', 'yo'),
  item('hablar', 'presente', 'tu'),
]

describe('drill flow', () => {
  it('starts asking the first item with an empty input', () => {
    const state = startDrill(threeItems)

    expect(state.phase).toBe('asking')
    expect(state.index).toBe(0)
    expect(state.input).toBe('')
    expect(state.answers).toEqual([])
  })

  it('reveals the verdict on submit and clears the input on advance', () => {
    const asked = type(startDrill(threeItems), 'hablo')
    const revealed = submit(asked)

    expect(revealed.phase).toBe('revealed')
    expect(revealed.input).toBe('hablo')
    expect(currentVerdict(revealed)).toBe('correct')

    const next = nextItem(revealed)
    expect(next.phase).toBe('asking')
    expect(next.index).toBe(1)
    expect(next.input).toBe('')
    expect(currentVerdict(next)).toBeUndefined()
  })

  it('records I don\'t know as a wrong answer with an empty input', () => {
    const state = drillReducer(startDrill(threeItems), { type: 'dont-know' }) as DrillState

    expect(state.phase).toBe('revealed')
    expect(currentVerdict(state)).toBe('wrong')
    expect(state.answers).toEqual([{ key: 'hablar|presente|yo', verdict: 'wrong', input: '' }])
  })

  it('ignores a blank submit and a second submit for the same item', () => {
    const blank = submit(startDrill(threeItems))
    expect(blank.phase).toBe('asking')
    expect(blank.answers).toEqual([])

    const answered = answer(startDrill(threeItems), 'hablo')
    const again = submit(answered)
    expect(again).toBe(answered)
    expect(again.answers).toHaveLength(1)
  })

  it('accepts any variant of the cell', () => {
    const state = answer(
      startDrill([item('hablar', 'imperfecto_subjuntivo', 'yo')]),
      'hablase',
    )

    expect(currentVerdict(state)).toBe('correct')
  })

  it('ends after the last advance and after an explicit end', () => {
    const finished = nextItem(answer(startDrill([threeItems[0]!]), 'hablo'))
    expect(finished.phase).toBe('finished')

    const ended = drillReducer(type(startDrill(threeItems), 'habl'), { type: 'end' }) as DrillState
    expect(ended.phase).toBe('finished')
    expect(ended.answers).toEqual([])
  })
})

describe('verdict records', () => {
  it('queues exactly one answer per item, keyed and verdict-matched, for correct, accent-only and wrong', () => {
    let state = startDrill(threeItems)

    state = nextItem(answer(state, 'hablo')) // presente yo: correct
    state = nextItem(answer(state, 'hable')) // pretérito indefinido yo is hablé: accent-only
    state = answer(state, 'habla') // presente tú is hablas: wrong, still revealed

    expect(state.phase).toBe('revealed')
    expect(state.answers).toEqual([
      { key: 'hablar|presente|yo', verdict: 'correct', input: 'hablo' },
      { key: 'hablar|preterito_indefinido|yo', verdict: 'accent-only', input: 'hable' },
      { key: 'hablar|presente|tu', verdict: 'wrong', input: 'habla' },
    ])
  })

  it('records each item exactly once even when advance is pressed twice', () => {
    const answered = answer(startDrill(threeItems), 'hablo')
    const twice = drillReducer(answered, { type: 'advance' }) as DrillState

    expect(drillReducer(twice, { type: 'advance' })).toBe(twice)
    expect(twice.answers).toHaveLength(1)
  })
})

describe('review round', () => {
  it('asks missed items once more, in the order they were missed', () => {
    let state = startDrill(threeItems)

    state = nextItem(answer(state, 'habla')) // presente yo: wrong
    state = nextItem(answer(state, 'hable')) // pretérito yo: accent-only
    state = answer(state, 'hablas') // presente tú: correct
    expect(state.phase).toBe('revealed')

    state = nextItem(state)
    expect(state.inReview).toBe(true)
    expect(state.reviewItems.map((item) => item.key)).toEqual([
      'hablar|presente|yo',
      'hablar|preterito_indefinido|yo',
    ])
    expect(currentItem(state)?.key).toBe('hablar|presente|yo')

    state = nextItem(answer(state, 'hablo'))
    expect(currentItem(state)?.key).toBe('hablar|preterito_indefinido|yo')
    state = nextItem(answer(state, 'hablé'))

    expect(state.phase).toBe('finished')
    expect(state.answers.map((answer) => answer.key)).toEqual([
      'hablar|presente|yo',
      'hablar|preterito_indefinido|yo',
      'hablar|presente|tu',
      'hablar|presente|yo',
      'hablar|preterito_indefinido|yo',
    ])
  })

  it('checks a review answer against the review item, not the main item at that index', () => {
    let state = startDrill(threeItems)

    state = nextItem(answer(state, 'hablo')) // presente yo: correct
    state = nextItem(answer(state, 'habla')) // pretérito yo: wrong
    state = nextItem(answer(state, 'hablas')) // presente tú: correct, into review

    expect(state.inReview).toBe(true)
    expect(currentItem(state)?.key).toBe('hablar|preterito_indefinido|yo')

    // Main index 0 is presente yo; this answer is only right for the review item.
    state = answer(state, 'hablé')
    expect(currentVerdict(state)).toBe('correct')
  })

  it('finishes a clean round without a review', () => {
    let state = startDrill(threeItems)

    state = nextItem(answer(state, 'hablo'))
    state = nextItem(answer(state, 'hablé'))
    state = nextItem(answer(state, 'hablas'))

    expect(state.phase).toBe('finished')
    expect(state.reviewItems).toEqual([])
    expect(state.inReview).toBe(false)
  })

  it('does not requeue a mistake made during the review round', () => {
    let state = startDrill([threeItems[0]!])

    state = nextItem(answer(state, 'habla')) // wrong in the main round
    expect(state.inReview).toBe(true)
    expect(roundLength(state)).toBe(1)

    state = nextItem(answer(state, 'habla')) // wrong again in review
    expect(state.phase).toBe('finished')
    expect(state.reviewItems).toHaveLength(1)
    expect(state.answers).toHaveLength(2)
  })

  it('lets an explicit end skip the review round', () => {
    const missed = answer(startDrill([threeItems[0]!]), 'habla')
    expect(missed.reviewItems).toHaveLength(1)

    const ended = drillReducer(missed, { type: 'end' }) as DrillState
    expect(ended.phase).toBe('finished')
    expect(ended.answers).toHaveLength(1)
  })

  it('reports the last main item as the point where review starts', () => {
    const missed = answer(startDrill([threeItems[0]!]), 'habla')

    expect(atRoundEnd(missed)).toBe(true)
    expect(startsReview(missed)).toBe(true)
    expect(startsReview(answer(startDrill([threeItems[0]!]), 'hablo'))).toBe(false)
  })
})


