import { checkAnswer, type Verdict } from './check'
import type { Item } from './draw'
import { acceptedForms } from './forms'

/** An item is asked, then revealed; a session is finished after its last reveal. */
export type DrillPhase = 'asking' | 'revealed' | 'finished'

/** One verdict the drill owes the store. Every answer is recorded once. */
export interface DrillAnswer {
  /** The progress key the item was drawn with. */
  key: string
  verdict: Verdict
  /** What the learner typed; empty for I don't know. */
  input: string
}

export interface DrillState {
  /** The main round's queue, drawn for the session. */
  items: readonly Item[]
  /** Items missed in the main round, in the order they were missed; each is asked once more. */
  reviewItems: readonly Item[]
  /** Whether the item on screen comes from `reviewItems` rather than `items`. */
  inReview: boolean
  /** Position of the item being asked or revealed within its round. */
  index: number
  phase: DrillPhase
  /** The text in the answer field; kept through the reveal so it can be shown struck through. */
  input: string
  answers: readonly DrillAnswer[]
}

export type DrillAction =
  | { type: 'start'; items: readonly Item[] }
  | { type: 'input'; value: string }
  | { type: 'submit' }
  | { type: 'dont-know' }
  | { type: 'advance' }
  | { type: 'end' }

/** A session with no items is over before it begins. */
export function startDrill(items: readonly Item[]): DrillState {
  return {
    items,
    reviewItems: [],
    inReview: false,
    index: 0,
    phase: items.length === 0 ? 'finished' : 'asking',
    input: '',
    answers: [],
  }
}

/** The item on screen, from the main round or the review round. */
export function currentItem(state: DrillState): Item | undefined {
  const round = state.inReview ? state.reviewItems : state.items
  return round[state.index]
}

/** How many items the round on screen asks. */
export function roundLength(state: DrillState): number {
  return state.inReview ? state.reviewItems.length : state.items.length
}

/** The last item of the round on screen is revealed. */
export function atRoundEnd(state: DrillState): boolean {
  return state.index >= roundLength(state) - 1
}

/** Advancing from this reveal starts the review round rather than finishing. */
export function startsReview(state: DrillState): boolean {
  return !state.inReview && atRoundEnd(state) && state.reviewItems.length > 0
}

/** The verdict of the item on screen, while its reveal is showing. */
export function currentVerdict(state: DrillState): Verdict | undefined {
  if (state.phase !== 'revealed') return undefined
  return state.answers[state.answers.length - 1]?.verdict
}

/**
 * Check one typed answer against the item's cell. Vocabulary items have no typed form;
 * they arrive with issue 09 and must never be mistaken for a wrong conjugation.
 */
function verdictFor(item: Item, input: string): Verdict | undefined {
  if (item.mode !== 'conjugation') return undefined

  return checkAnswer(input, acceptedForms(item.verb, item.tense, item.person))
}

function reveal(state: DrillState, verdict: Verdict, input: string): DrillState {
  const item = currentItem(state)
  if (!item) return { ...state, phase: 'finished' }

  // A miss in the main round earns one place in the review round. A miss during the
  // review itself is recorded but never requeued again.
  const missed =
    !state.inReview &&
    verdict !== 'correct' &&
    !state.reviewItems.some((reviewItem) => reviewItem.key === item.key)

  return {
    ...state,
    phase: 'revealed',
    reviewItems: missed ? [...state.reviewItems, item] : state.reviewItems,
    answers: [...state.answers, { key: item.key, verdict, input }],
  }
}

/**
 * The drill's whole state machine. A verdict is added exactly once per item:
 * submitting again during the reveal, or advancing while still asking, changes nothing.
 */
export function drillReducer(
  state: DrillState | null,
  action: DrillAction,
): DrillState | null {
  if (action.type === 'start') return startDrill(action.items)
  if (!state) return state

  switch (action.type) {
    case 'input':
      return state.phase === 'asking' ? { ...state, input: action.value } : state

    case 'submit': {
      if (state.phase !== 'asking' || state.input.trim() === '') return state

      const item = currentItem(state)
      if (!item) return state

      const verdict = verdictFor(item, state.input)
      return verdict ? reveal(state, verdict, state.input) : state
    }

    case 'dont-know': {
      if (state.phase !== 'asking') return state

      return reveal(state, 'wrong', '')
    }

    case 'advance': {
      if (state.phase !== 'revealed') return state

      const index = state.index + 1
      if (state.inReview) {
        return index >= state.reviewItems.length
          ? { ...state, phase: 'finished' }
          : { ...state, index, phase: 'asking', input: '' }
      }

      if (index < state.items.length) return { ...state, index, phase: 'asking', input: '' }

      // The main round is over: ask every missed item once more before results.
      return state.reviewItems.length > 0
        ? { ...state, inReview: true, index: 0, phase: 'asking', input: '' }
        : { ...state, phase: 'finished' }
    }

    case 'end':
      return state.phase === 'finished' ? state : { ...state, phase: 'finished' }
  }
}
