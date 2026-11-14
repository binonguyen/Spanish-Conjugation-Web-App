import { describe, expect, it } from 'vitest'
import { DEFAULT_TENSES, defaultSettings, type Settings } from '../store/types'
import { settingsReducer, type SettingsAction } from './settings'

function run(...actions: SettingsAction[]): Settings {
  return actions.reduce(settingsReducer, defaultSettings())
}

describe('settings reducer', () => {
  it('turns vosotros on and off without touching another preference', () => {
    const settings = defaultSettings()
    const on = settingsReducer(settings, { type: 'toggle-vosotros' })

    expect(on.vosotros).toBe(true)
    expect({ ...on, vosotros: false }).toEqual(settings)
    expect(settingsReducer(on, { type: 'toggle-vosotros' }).vosotros).toBe(false)
  })

  it('offers the archaic tenses without selecting them', () => {
    const on = settingsReducer(defaultSettings(), { type: 'toggle-archaic' })

    expect(on.archaicTenses).toBe(true)
    expect(on.defaultTenses).toEqual([...DEFAULT_TENSES])
  })

  it('keeps hidden archaic defaults so re-enabling the setting restores them', () => {
    const on = run(
      { type: 'toggle-archaic' },
      { type: 'toggle-default-tense', tense: 'presente' },
      { type: 'toggle-default-tense', tense: 'preterito_anterior' },
    )

    expect(on.defaultTenses).toContain('preterito_anterior')

    const off = settingsReducer(on, { type: 'toggle-archaic' })

    expect(off.archaicTenses).toBe(false)
    expect(off.defaultTenses).toContain('preterito_anterior')

    const back = settingsReducer(off, { type: 'toggle-archaic' })
    expect(back.defaultTenses).toContain('preterito_anterior')
  })

  it('clamps the default session length to 5–50 and ignores nonsense', () => {
    const settings = defaultSettings()

    expect(settingsReducer(settings, { type: 'set-session-length', length: 2 }).sessionLength).toBe(5)
    expect(settingsReducer(settings, { type: 'set-session-length', length: 99 }).sessionLength).toBe(50)
    expect(settingsReducer(settings, { type: 'set-session-length', length: 22.6 }).sessionLength).toBe(23)
    expect(settingsReducer(settings, { type: 'set-session-length', length: Number.NaN })).toBe(settings)
  })

  it('only selects a known tense the current offer includes', () => {
    const settings = defaultSettings()

    expect(settingsReducer(settings, { type: 'toggle-default-tense', tense: 'not_a_tense' })).toBe(settings)
    expect(settingsReducer(settings, { type: 'toggle-default-tense', tense: 'preterito_anterior' })).toBe(
      settings,
    )

    const on = run({ type: 'toggle-archaic' }, { type: 'toggle-default-tense', tense: 'preterito_anterior' })
    expect(on.defaultTenses).toContain('preterito_anterior')

    const off = settingsReducer(on, { type: 'toggle-default-tense', tense: 'preterito_anterior' })
    expect(off.defaultTenses).not.toContain('preterito_anterior')
  })

  it('saves a default mode without touching another preference', () => {
    const settings = defaultSettings()
    const vocabulary = settingsReducer(settings, { type: 'set-default-mode', mode: 'vocabulary' })

    expect(vocabulary.mode).toBe('vocabulary')
    expect({ ...vocabulary, mode: 'conjugation' }).toEqual(settings)
  })
})
