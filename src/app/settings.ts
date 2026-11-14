import { clampSessionLength, type Mode } from '../domain/session'
import { isTenseId, orderTenses, visibleTenses } from '../domain/tenses'
import type { Settings } from '../store/types'

/**
 * Every edit the Settings sheet can make. The reducer keeps the stored object valid:
 * hidden archaic tenses cannot be selected and a length stays inside the stepper range.
 */
export type SettingsAction =
  | { type: 'toggle-vosotros' }
  | { type: 'toggle-archaic' }
  | { type: 'set-default-mode'; mode: Mode }
  | { type: 'set-session-length'; length: number }
  | { type: 'toggle-default-tense'; tense: string }

export function settingsReducer(settings: Settings, action: SettingsAction): Settings {
  switch (action.type) {
    case 'toggle-vosotros':
      return { ...settings, vosotros: !settings.vosotros }

    // Hidden defaults are kept rather than deleted, so turning the setting back on
    // restores the previous selection and the toggle has no unrelated side effect.
    case 'toggle-archaic':
      return { ...settings, archaicTenses: !settings.archaicTenses }

    case 'set-default-mode':
      return settings.mode === action.mode ? settings : { ...settings, mode: action.mode }

    case 'set-session-length': {
      if (!Number.isFinite(action.length)) return settings
      const sessionLength = clampSessionLength(action.length)
      return sessionLength === settings.sessionLength ? settings : { ...settings, sessionLength }
    }

    case 'toggle-default-tense': {
      if (!isTenseId(action.tense)) return settings

      const offered = new Set(visibleTenses(settings.archaicTenses).map((tense) => tense.id))
      if (!offered.has(action.tense)) return settings

      const selected = new Set(settings.defaultTenses)
      if (selected.has(action.tense)) selected.delete(action.tense)
      else selected.add(action.tense)

      return { ...settings, defaultTenses: orderTenses(selected) }
    }
  }
}
