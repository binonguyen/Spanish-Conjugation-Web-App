import type { Verdict } from './check'
import type { Item } from './draw'
import type { DrillState } from './drill'
import { acceptedForms } from './forms'
import { personLabel, type Mode, type Person } from './session'
import { isTenseId, TENSES, tenseById, type TenseId } from './tenses'
import type { ProgressMap } from '../store/types'

/** A miss is a verdict that was not exactly right; accent-only still misses the mark. */
export type MissVerdict = Exclude<Verdict, 'correct'>

/** One round's numbers. `score` counts accent-only as right, as the spec requires. */
export interface RoundSummary {
  /** Main items asked in the round; the denominator of the first-try score. */
  asked: number
  /** Items the round contained. A main round cut short by an explicit end asks fewer. */
  total: number
  /** Correct or accent-only: the form was produced. */
  score: number
  /** Exactly right, accents included. */
  exact: number
  accentOnly: number
  wrong: number
}

/** A main-round miss, carrying what the reveal would have shown. */
export interface MissedItem {
  key: string
  mode: Mode
  infinitive: string
  gloss: string
  /** The first accepted form, or the correct gloss in a vocabulary check. */
  answer: string
  /** Conjugation only; vocabulary has no tense. */
  tense?: TenseId
  tenseLabel?: string
  person?: Person
  personLabel?: string
  verdict: MissVerdict
  /** The review round asked this item and got its form right. */
  correctedInReview: boolean
}

/** One tense's share of a conjugation session's main round. */
export interface TenseBreakdown {
  tense: TenseId
  label: string
  asked: number
  score: number
  accentOnly: number
  wrong: number
}

export interface SessionSummary {
  mode: Mode
  main: RoundSummary
  /** Empty when the main round was clean or the session ended before review. */
  review: RoundSummary
  /** Every miss from the main round, in the order it was missed. */
  missed: MissedItem[]
  /** Main-round conjugation items grouped by tense, in catalogue order. */
  byTense: TenseBreakdown[]
  endedEarly: boolean
}

/** The part of the drill state a session summary needs. */
export type CompletedSession = Pick<DrillState, 'items' | 'reviewItems' | 'answers'>

interface RoundTally {
  asked: number
  exact: number
  accentOnly: number
  wrong: number
}

function emptyTally(): RoundTally {
  return { asked: 0, exact: 0, accentOnly: 0, wrong: 0 }
}

function tallyVerdict(tally: RoundTally, verdict: Verdict): void {
  tally.asked += 1
  if (verdict === 'correct') tally.exact += 1
  else if (verdict === 'accent-only') tally.accentOnly += 1
  else tally.wrong += 1
}

function roundSummary(tally: RoundTally, total: number): RoundSummary {
  return {
    asked: tally.asked,
    total,
    score: tally.exact + tally.accentOnly,
    exact: tally.exact,
    accentOnly: tally.accentOnly,
    wrong: tally.wrong,
  }
}

function missedItem(item: Item, verdict: MissVerdict, correctedInReview: boolean): MissedItem {
  if (item.mode === 'vocabulary') {
    return {
      key: item.key,
      mode: item.mode,
      infinitive: item.verb.infinitive,
      gloss: item.verb.gloss,
      answer: item.verb.gloss,
      verdict,
      correctedInReview,
    }
  }

  return {
    key: item.key,
    mode: item.mode,
    infinitive: item.verb.infinitive,
    gloss: item.verb.gloss,
    answer: acceptedForms(item.verb, item.tense, item.person)[0] ?? '',
    tense: item.tense,
    tenseLabel: tenseById(item.tense)?.label ?? item.tense,
    person: item.person,
    personLabel: personLabel(item.tense, item.person),
    verdict,
    correctedInReview,
  }
}

/**
 * Summarize a finished drill from its queue and the answers already written to the store.
 * Answers are positional: the main round answers the first `items.length` answers, and any
 * answer after that belongs to the review round, in `reviewItems` order. Nothing is
 * re-derived from the store, so replaying one fixture always yields the same numbers.
 */
export function summarizeSession(state: CompletedSession): SessionSummary {
  const mainAnswers = state.answers.slice(0, state.items.length)
  const reviewAnswers = state.answers.slice(
    state.items.length,
    state.items.length + state.reviewItems.length,
  )

  const main = emptyTally()
  const review = emptyTally()
  const tenses = new Map<TenseId, RoundTally>()

  mainAnswers.forEach((answer, index) => {
    tallyVerdict(main, answer.verdict)
    const item = state.items[index]
    if (!item || item.mode !== 'conjugation') return

    const tense = tenses.get(item.tense) ?? emptyTally()
    tallyVerdict(tense, answer.verdict)
    tenses.set(item.tense, tense)
  })

  // A review answer only counts as a correction if the form came back; an accent-only
  // review answer still scores, matching how the session score treats it.
  const corrected = new Set<string>()
  reviewAnswers.forEach((answer, index) => {
    tallyVerdict(review, answer.verdict)
    const item = state.reviewItems[index]
    if (item && answer.verdict !== 'wrong') corrected.add(item.key)
  })

  const missed = mainAnswers.flatMap((answer, index) => {
    const item = state.items[index]
    if (!item || answer.verdict === 'correct') return []
    return [missedItem(item, answer.verdict, corrected.has(item.key))]
  })

  const byTense = TENSES.flatMap((tense): TenseBreakdown[] => {
    const tally = tenses.get(tense.id)
    if (!tally) return []
    return [
      {
        tense: tense.id,
        label: tense.label,
        asked: tally.asked,
        score: tally.exact + tally.accentOnly,
        accentOnly: tally.accentOnly,
        wrong: tally.wrong,
      },
    ]
  })

  const mode: Mode =
    state.items[0]?.mode ?? state.reviewItems[0]?.mode ?? 'conjugation'
  const mainSummary = roundSummary(main, state.items.length)

  return {
    mode,
    main: mainSummary,
    review: roundSummary(review, state.reviewItems.length),
    missed,
    byTense,
    endedEarly: mainSummary.asked < mainSummary.total,
  }
}

/** How many of a round's answers had the right form; accent-only counts. */
export interface TenseAccuracy {
  tense: TenseId
  label: string
  attempts: number
  wrong: number
  accent: number
  /** `(attempts - wrong) / attempts`; a missing accent is a separate measure. */
  accuracy: number
  /** `accent / attempts`. */
  accentRate: number
}

/** A verb's misses across every tense, person and mode in the history. */
export interface VerbMisses {
  infinitive: string
  attempts: number
  /** Misses as the weighting counts them: wrong plus accent-only. */
  misses: number
}

export interface VocabularyAccuracy {
  attempts: number
  wrong: number
  accuracy: number
}

export interface HistoryStats {
  /** Conjugation attempts only; vocabulary has its own accuracy below. */
  attempts: number
  wrong: number
  accent: number
  accuracy: number
  accentRate: number
  vocabulary: VocabularyAccuracy
  byTense: TenseAccuracy[]
  /** Most-missed first, ties broken by attempts then alphabetically. */
  mostMissed: VerbMisses[]
  hasConjugation: boolean
  hasVocabulary: boolean
  /** False on a first visit, so the screen can say so instead of showing zeroes. */
  hasHistory: boolean
}

interface Tally {
  attempts: number
  wrong: number
  accent: number
}

function ratio(part: number, total: number): number {
  return total > 0 ? part / total : 0
}

/** Form accuracy, tolerating an imported record whose counters do not add up. */
function accuracy(tally: Tally): number {
  return ratio(Math.max(0, tally.attempts - tally.wrong), tally.attempts)
}

/** Locale-independent ordering, so a tie is stable wherever the test runs. */
function byName(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/**
 * Roll the whole progress map into the compact stats view. Accuracy treats accent-only
 * as a right form and reports the missing accents separately; vocabulary accuracy is
 * kept apart because it measures recognition, not production.
 */
export function aggregateStats(progress: ProgressMap, limit = 3): HistoryStats {
  const byTense = new Map<TenseId, Tally>()
  const byVerb = new Map<string, { attempts: number; misses: number }>()
  const vocabulary = { attempts: 0, wrong: 0, accent: 0 }
  const conjugation = { attempts: 0, wrong: 0, accent: 0 }

  for (const [key, record] of Object.entries(progress)) {
    if (record.attempts <= 0) continue

    const [infinitive, tense] = key.split('|')
    if (!infinitive || !tense) continue
    if (tense !== 'vocab' && !isTenseId(tense)) continue

    const verb = byVerb.get(infinitive) ?? { attempts: 0, misses: 0 }
    verb.attempts += record.attempts
    verb.misses += record.wrong + record.accent
    byVerb.set(infinitive, verb)

    if (tense === 'vocab') {
      vocabulary.attempts += record.attempts
      vocabulary.wrong += record.wrong
      continue
    }

    conjugation.attempts += record.attempts
    conjugation.wrong += record.wrong
    conjugation.accent += record.accent

    const tally = byTense.get(tense) ?? { attempts: 0, wrong: 0, accent: 0 }
    tally.attempts += record.attempts
    tally.wrong += record.wrong
    tally.accent += record.accent
    byTense.set(tense, tally)
  }

  const mostMissed = [...byVerb.entries()]
    .filter(([, tally]) => tally.misses > 0)
    .sort(
      ([aName, a], [bName, b]) =>
        b.misses - a.misses || b.attempts - a.attempts || byName(aName, bName),
    )
    .slice(0, Math.max(0, limit))
    .map(([infinitive, tally]) => ({
      infinitive,
      attempts: tally.attempts,
      misses: tally.misses,
    }))

  return {
    attempts: conjugation.attempts,
    wrong: conjugation.wrong,
    accent: conjugation.accent,
    accuracy: accuracy(conjugation),
    accentRate: ratio(conjugation.accent, conjugation.attempts),
    vocabulary: {
      attempts: vocabulary.attempts,
      wrong: vocabulary.wrong,
      accuracy: accuracy(vocabulary),
    },
    byTense: TENSES.flatMap((tense): TenseAccuracy[] => {
      const tally = byTense.get(tense.id)
      if (!tally) return []
      return [
        {
          tense: tense.id,
          label: tense.label,
          attempts: tally.attempts,
          wrong: tally.wrong,
          accent: tally.accent,
          accuracy: accuracy(tally),
          accentRate: ratio(tally.accent, tally.attempts),
        },
      ]
    }),
    mostMissed,
    hasConjugation: conjugation.attempts > 0,
    hasVocabulary: vocabulary.attempts > 0,
    hasHistory: conjugation.attempts > 0 || vocabulary.attempts > 0,
  }
}
