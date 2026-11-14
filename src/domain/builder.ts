import {
  clampSessionLength,
  isVerbTier,
  type Mode,
  type SessionConfig,
  type VerbTier,
} from './session'
import { isTenseId, orderTenses, visibleTenses, type TenseId } from './tenses'
import { poolSize } from './verbPool'
import { normalizeInfinitive } from './verbs'

/** The settings fields the builder starts from; `Settings` satisfies this shape. */
export interface BuilderSeed {
  mode: Mode
  defaultTenses: readonly string[]
  verbTier: VerbTier
  sessionLength: number
  archaicTenses: boolean
  vosotros: boolean
}

export interface BuilderState {
  mode: Mode
  /** Selected tenses in catalogue order. Kept while the vocabulary mode hides them. */
  tenses: TenseId[]
  verbTier: VerbTier
  length: number
  customVerbs: string[]
  /** Mirrors the setting so the reducer cannot keep a tense that is no longer offered. */
  archaicTenses: boolean
  /** Mirrors the setting so the config fixes the person slots for the whole session. */
  vosotros: boolean
}

export type BuilderAction =
  | { type: 'set-mode'; mode: Mode }
  | { type: 'toggle-tense'; tense: string }
  | { type: 'set-tier'; verbTier: VerbTier }
  | { type: 'set-length'; length: number }
  | { type: 'set-custom-verbs'; customVerbs: readonly string[] }
  | { type: 'set-archaic'; archaicTenses: boolean }
  /** The Settings sheet changed a preference that shapes the next session. */
  | { type: 'apply-settings'; settings: Pick<BuilderSeed, 'archaicTenses' | 'vosotros'> }
  /** An import or reset replaced the store; start over from what it now holds. */
  | { type: 'rebuild'; seed: BuilderSeed; customVerbs: readonly string[] }

/** Keep hand-added names canonical, non-empty and unique, preserving their order. */
function cleanCustomVerbs(customVerbs: readonly string[]): string[] {
  const seen = new Set<string>()

  return customVerbs.flatMap((infinitive) => {
    const name = normalizeInfinitive(infinitive)
    if (!name || seen.has(name)) return []
    seen.add(name)
    return [name]
  })
}

function selectableTenses(archaicTenses: boolean, selected: ReadonlySet<TenseId>): TenseId[] {
  const offered = new Set(visibleTenses(archaicTenses).map((tense) => tense.id))
  return orderTenses([...selected].filter((tense) => offered.has(tense)))
}

/** A builder starts from the saved defaults; a reload discards the session's choices. */
export function createBuilderState(seed: BuilderSeed, customVerbs: readonly string[] = []): BuilderState {
  const offered = new Set(visibleTenses(seed.archaicTenses).map((tense) => tense.id))
  const selected = new Set(
    seed.defaultTenses.filter((tense): tense is TenseId => isTenseId(tense) && offered.has(tense)),
  )

  return {
    mode: seed.mode,
    tenses: selectableTenses(seed.archaicTenses, selected),
    verbTier: seed.verbTier,
    length: clampSessionLength(seed.sessionLength),
    customVerbs: cleanCustomVerbs(customVerbs),
    archaicTenses: seed.archaicTenses,
    vosotros: seed.vosotros,
  }
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'set-mode':
      return state.mode === action.mode ? state : { ...state, mode: action.mode }

    case 'toggle-tense': {
      if (!isTenseId(action.tense)) return state
      const offered = new Set(visibleTenses(state.archaicTenses).map((tense) => tense.id))
      if (!offered.has(action.tense)) return state

      const selected = new Set(state.tenses)
      if (selected.has(action.tense)) selected.delete(action.tense)
      else selected.add(action.tense)

      return { ...state, tenses: selectableTenses(state.archaicTenses, selected) }
    }

    case 'set-tier': {
      if (!isVerbTier(action.verbTier)) return state
      return state.verbTier === action.verbTier ? state : { ...state, verbTier: action.verbTier }
    }

    case 'set-length': {
      if (!Number.isFinite(action.length)) return state
      const length = clampSessionLength(action.length)
      return state.length === length ? state : { ...state, length }
    }

    case 'set-custom-verbs': {
      const customVerbs = cleanCustomVerbs(action.customVerbs)
      return { ...state, customVerbs }
    }

    case 'set-archaic': {
      if (state.archaicTenses === action.archaicTenses) return state
      const selected = new Set(state.tenses)
      return {
        ...state,
        archaicTenses: action.archaicTenses,
        tenses: selectableTenses(action.archaicTenses, selected),
      }
    }

    case 'apply-settings': {
      const { archaicTenses, vosotros } = action.settings
      if (state.archaicTenses === archaicTenses && state.vosotros === vosotros) return state

      return {
        ...state,
        archaicTenses,
        vosotros,
        tenses: selectableTenses(archaicTenses, new Set(state.tenses)),
      }
    }

    case 'rebuild':
      return createBuilderState(action.seed, action.customVerbs)
  }
}

/**
 * The object a started session hands to the drill. Vocabulary mode carries no tenses:
 * the builder keeps the selection for a switch back, but a session never mixes modes.
 */
export function toSessionConfig(state: BuilderState): SessionConfig {
  return {
    mode: state.mode,
    tenses: state.mode === 'conjugation' ? [...state.tenses] : [],
    verbTier: state.verbTier,
    length: state.length,
    customVerbs: [...state.customVerbs],
    vosotros: state.vosotros,
  }
}

/** Why Start is disabled, or `undefined` when the session can begin. */
export function startBlockedReason(state: BuilderState): string | undefined {
  if (state.mode === 'conjugation' && state.tenses.length === 0) {
    return 'Choose at least one tense to start.'
  }
  return undefined
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

/** One line saying what Start will drill, e.g. `20 items · 3 tenses · 487 verbs`. */
export function sessionSummary(config: SessionConfig): string {
  const unit =
    config.mode === 'vocabulary' ? 'vocabulary' : plural(config.tenses.length, 'tense', 'tenses')
  const verbs = poolSize(config.verbTier, config.customVerbs)

  return `${plural(config.length, 'item', 'items')} · ${unit} · ${plural(verbs, 'verb', 'verbs')}`
}
