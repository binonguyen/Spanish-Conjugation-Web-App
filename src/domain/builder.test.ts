import { describe, expect, it } from 'vitest'
import { verbArtifact } from '../data/verbs'
import { DEFAULT_TENSES, defaultSettings } from '../store/types'
import {
  builderReducer,
  createBuilderState,
  sessionSummary,
  startBlockedReason,
  toSessionConfig,
  type BuilderAction,
  type BuilderState,
} from './builder'
import { tenseById, tenseGroups, TENSES, visibleTenses } from './tenses'
import { poolSize, searchVerbs, SEARCH_LIMIT } from './verbPool'

const DEFAULT_TENSE_IDS = new Set<string>(DEFAULT_TENSES)
const DEFAULT_SELECTION = TENSES.filter((tense) => DEFAULT_TENSE_IDS.has(tense.id)).map(
  (tense) => tense.id,
)

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

function run(state: BuilderState, ...actions: BuilderAction[]): BuilderState {
  return actions.reduce(builderReducer, state)
}

describe('tense catalogue', () => {
  it('offers nine indicative, four subjunctive and two imperative tenses by default', () => {
    expect(tenseGroups(false).map((group) => [group.label, group.tenses.length])).toEqual([
      ['Indicativo', 9],
      ['Subjuntivo', 4],
      ['Imperativo', 2],
    ])
    expect(visibleTenses(false).some((tense) => tense.archaic)).toBe(false)
  })

  it('adds the three archaic tenses only when the setting is on', () => {
    const archaic = visibleTenses(true).filter((tense) => tense.archaic)

    expect(archaic.map((tense) => tense.id)).toEqual([
      'preterito_anterior',
      'futuro_subjuntivo',
      'futuro_perfecto_subjuntivo',
    ])
    expect(tenseGroups(true).flatMap((group) => group.tenses)).toHaveLength(TENSES.length)
    expect(TENSES).toHaveLength(18)
  })

  it('labels every tense in Spanish with an English gloss', () => {
    for (const tense of TENSES) {
      expect(tense.label.trim(), tense.id).not.toBe('')
      expect(tense.gloss.trim(), tense.id).not.toBe('')
      expect(tense.label, tense.id).not.toMatch(/^[a-z]/)
      expect(tense.id, tense.id).toMatch(/^[a-z_]+$/)
    }
  })

  it('keeps the catalogue and the artifact using the same tense ids', () => {
    for (const id of verbArtifact.tenses) {
      expect(tenseById(id), id).toBeDefined()
    }

    const stored = new Set<string>(verbArtifact.tenses)
    for (const tense of TENSES) {
      if (tense.archaic || COMPOUND_TENSES.includes(tense.id)) continue
      expect(stored.has(tense.id), tense.id).toBe(true)
    }
  })
})

describe('builder reducer', () => {
  it('starts a first-time visitor from the spec defaults', () => {
    const state = createBuilderState(defaultSettings())

    expect(state).toEqual({
      mode: 'conjugation',
      tenses: DEFAULT_SELECTION,
      verbTier: 2,
      length: 20,
      customVerbs: [],
      archaicTenses: false,
      vosotros: false,
    })
    expect(startBlockedReason(state)).toBeUndefined()
  })

  it('turns the chosen tenses, tier and length into a session config', () => {
    const state = run(
      createBuilderState(defaultSettings()),
      { type: 'toggle-tense', tense: 'presente' },
      { type: 'toggle-tense', tense: 'pluscuamperfecto' },
      { type: 'set-tier', verbTier: 1 },
      { type: 'set-length', length: 35 },
    )

    expect(toSessionConfig(state)).toEqual({
      mode: 'conjugation',
      tenses: ['preterito_imperfecto', 'preterito_indefinido', 'futuro_simple', 'pluscuamperfecto'],
      verbTier: 1,
      length: 35,
      customVerbs: [],
      vosotros: false,
    })
    expect(sessionSummary(toSessionConfig(state))).toBe('35 items · 4 tenses · 100 verbs')
  })

  it('carries the vosotros setting into the session config', () => {
    const state = createBuilderState({ ...defaultSettings(), vosotros: true })

    expect(toSessionConfig(state).vosotros).toBe(true)
    expect(state.vosotros).toBe(true)
  })

  it('keeps the selection when the vocabulary mode hides it, but never mixes it into the session', () => {
    const state = run(createBuilderState(defaultSettings()), { type: 'set-mode', mode: 'vocabulary' })

    expect(state.tenses).toEqual(DEFAULT_SELECTION)
    expect(toSessionConfig(state)).toEqual({
      mode: 'vocabulary',
      tenses: [],
      verbTier: 2,
      length: 20,
      customVerbs: [],
      vosotros: false,
    })
    expect(sessionSummary(toSessionConfig(state))).toBe('20 items · vocabulary · 501 verbs')

    const back = builderReducer(state, { type: 'set-mode', mode: 'conjugation' })
    expect(back.tenses).toEqual(DEFAULT_SELECTION)
  })

  it('clamps the session length to 5–50, rounds fractions and offers every length between', () => {
    const state = createBuilderState(defaultSettings())

    expect(builderReducer(state, { type: 'set-length', length: 1 }).length).toBe(5)
    expect(builderReducer(state, { type: 'set-length', length: 99 }).length).toBe(50)
    expect(builderReducer(state, { type: 'set-length', length: 22.6 }).length).toBe(23)
    expect(builderReducer(state, { type: 'set-length', length: Number.NaN })).toBe(state)

    for (let length = 5; length <= 50; length += 1) {
      expect(builderReducer(state, { type: 'set-length', length }).length).toBe(length)
    }
  })

  it('ignores an unknown tense or tier instead of corrupting the config', () => {
    const state = createBuilderState(defaultSettings())

    expect(builderReducer(state, { type: 'toggle-tense', tense: 'not_a_tense' })).toBe(state)
    expect(builderReducer(state, { type: 'toggle-tense', tense: 'preterito_anterior' })).toBe(state)
    expect(builderReducer(state, { type: 'set-tier', verbTier: 3 as never })).toBe(state)
  })

  it('can only select archaic tenses while the setting is on, and drops them when it turns off', () => {
    const modern = createBuilderState(defaultSettings())
    const archaic = builderReducer(modern, { type: 'set-archaic', archaicTenses: true })
    const selected = builderReducer(archaic, { type: 'toggle-tense', tense: 'preterito_anterior' })

    expect(selected.tenses).toContain('preterito_anterior')
    expect(builderReducer(selected, { type: 'set-archaic', archaicTenses: false }).tenses).not.toContain(
      'preterito_anterior',
    )
  })

  it('keeps hand-added verbs canonical and unique', () => {
    const state = builderReducer(createBuilderState(defaultSettings()), {
      type: 'set-custom-verbs',
      customVerbs: ['  Llamarse ', 'llamarse', '', 'abrazar'],
    })

    expect(state.customVerbs).toEqual(['llamarse', 'abrazar'])
    expect(toSessionConfig(state).customVerbs).toEqual(['llamarse', 'abrazar'])
  })

  it('drops a default tense the archaic setting hides', () => {
    const state = createBuilderState({
      ...defaultSettings(),
      defaultTenses: ['preterito_anterior', 'presente'],
    })

    expect(state.tenses).toEqual(['presente'])

    const archaic = createBuilderState({
      ...defaultSettings(),
      archaicTenses: true,
      defaultTenses: ['preterito_anterior', 'presente'],
    })
    expect(archaic.tenses).toEqual(['presente', 'preterito_anterior'])
  })

  it('blocks a conjugation session with no tense and says why', () => {
    const empty = createBuilderState({ ...defaultSettings(), defaultTenses: [] })

    expect(startBlockedReason(empty)).toBe('Choose at least one tense to start.')

    const vocabulary = builderReducer(empty, { type: 'set-mode', mode: 'vocabulary' })
    expect(startBlockedReason(vocabulary)).toBeUndefined()
  })
})

describe('verb pool', () => {
  const total = verbArtifact.verbs.length
  const tierTwoVerb = verbArtifact.verbs.find((verb) => verb.tier === 2)?.infinitive ?? ''

  it('counts the frequency tiers from the artifact', () => {
    expect(poolSize(1)).toBe(100)
    expect(poolSize(2)).toBe(total)
    expect(poolSize('all')).toBe(total)
  })

  it('adds hand-added verbs outside the tier without double-counting them inside it', () => {
    expect(poolSize(1, [tierTwoVerb])).toBe(101)
    expect(poolSize(2, [tierTwoVerb])).toBe(total)
    expect(poolSize('all', [tierTwoVerb])).toBe(total)
    expect(poolSize(1, ['verbogone'])).toBe(100)
  })

  it('prefix-searches the whole artifact for verbs to add', () => {
    const matches = searchVerbs('hab')

    expect(matches.map((verb) => verb.infinitive)).toContain('hablar')
    expect(matches.length).toBeLessThanOrEqual(SEARCH_LIMIT)
    expect(searchVerbs('')).toEqual([])
    expect(searchVerbs('hablar', ['hablar']).map((verb) => verb.infinitive)).not.toContain('hablar')
  })
})
