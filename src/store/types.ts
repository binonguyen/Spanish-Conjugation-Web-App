import type { Verdict } from '../domain/check'

/** The tag every export carries, so an import can refuse a file from another app. */
export const APP_ID = 'conjugation-trainer'

/** The only export schema this build reads. A higher number is a newer app. */
export const EXPORT_VERSION = 1

export type Mode = 'conjugation' | 'vocabulary'

/** Frequency tier of the verb pool: top 100, top 500, or the whole artifact. */
export type VerbTier = 1 | 2 | 'all'

export interface Settings {
  vosotros: boolean
  sessionLength: number
  verbTier: VerbTier
  mode: Mode
  defaultTenses: string[]
  archaicTenses: boolean
}

export const DEFAULT_TENSES = [
  'presente',
  'preterito_indefinido',
  'preterito_imperfecto',
  'futuro_simple',
] as const

/** The settings a first visit starts from; copied per call so callers cannot mutate it. */
export function defaultSettings(): Settings {
  return {
    vosotros: false,
    sessionLength: 20,
    verbTier: 2,
    mode: 'conjugation',
    defaultTenses: [...DEFAULT_TENSES],
    archaicTenses: false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Accept a stored or imported settings object, filling fields an older v1 export may
 * lack. Returns `undefined` when a present field has the wrong type, so an import can
 * refuse instead of storing nonsense.
 */
export function parseSettings(raw: unknown): Settings | undefined {
  if (!isRecord(raw)) return undefined

  const parsed = defaultSettings()

  if (raw.vosotros !== undefined) {
    if (typeof raw.vosotros !== 'boolean') return undefined
    parsed.vosotros = raw.vosotros
  }
  if (raw.sessionLength !== undefined) {
    if (typeof raw.sessionLength !== 'number' || !Number.isFinite(raw.sessionLength)) return undefined
    parsed.sessionLength = raw.sessionLength
  }
  if (raw.verbTier !== undefined) {
    if (raw.verbTier !== 1 && raw.verbTier !== 2 && raw.verbTier !== 'all') return undefined
    parsed.verbTier = raw.verbTier
  }
  if (raw.mode !== undefined) {
    if (raw.mode !== 'conjugation' && raw.mode !== 'vocabulary') return undefined
    parsed.mode = raw.mode
  }
  if (raw.defaultTenses !== undefined) {
    if (!Array.isArray(raw.defaultTenses) || raw.defaultTenses.some((tense) => typeof tense !== 'string')) {
      return undefined
    }
    parsed.defaultTenses = [...raw.defaultTenses]
  }
  if (raw.archaicTenses !== undefined) {
    if (typeof raw.archaicTenses !== 'boolean') return undefined
    parsed.archaicTenses = raw.archaicTenses
  }

  return parsed
}

export interface ProgressRecord {
  attempts: number
  wrong: number
  accent: number
}

export type ProgressMap = Record<string, ProgressRecord>

/** Progress is stored at verb × tense × person, the addressable unit of a drill. */
export function makeProgressKey(verb: string, tense: string, person: string): string {
  return `${verb}|${tense}|${person}`
}

/** A vocabulary check has a verb but no tense or person; `vocab` is the reserved tense id. */
export function makeVocabKey(verb: string): string {
  return makeProgressKey(verb, 'vocab', '')
}

/** The record after one verdict: accent-only counts as a miss in weighting and separately here. */
export function nextProgress(record: ProgressRecord | undefined, verdict: Verdict): ProgressRecord {
  const current = record ?? { attempts: 0, wrong: 0, accent: 0 }

  return {
    attempts: current.attempts + 1,
    wrong: current.wrong + (verdict === 'wrong' ? 1 : 0),
    accent: current.accent + (verdict === 'accent-only' ? 1 : 0),
  }
}

export interface ExportFile {
  app: typeof APP_ID
  version: number
  exportedAt: string
  settings: Settings
  customVerbs: string[]
  progress: ProgressMap
}

/** What an import put in place, so the UI can say how much arrived. */
export interface ImportSummary {
  progress: number
  customVerbs: number
}

/** The exact word a reset asks the learner to type. */
export const RESET_CONFIRMATION = 'reset'

export type StoreErrorCode =
  | 'quota'
  | 'unavailable'
  | 'write-failed'
  | 'corrupted'
  | 'wrong-app'
  | 'newer-version'
  | 'unknown-verb'
  | 'unconfirmed'

export interface StoreError {
  code: StoreErrorCode
  message: string
}

/** Every fallible store operation reports rather than throws, so the UI gets a message. */
export type StoreResult<T> = { ok: true; value: T } | { ok: false; error: StoreError }

export function ok<T>(value: T): StoreResult<T> {
  return { ok: true, value }
}

export function fail<T>(code: StoreErrorCode, message: string): StoreResult<T> {
  return { ok: false, error: { code, message } }
}

export const MESSAGES = {
  quota: 'Local storage is full. Export your progress, free some space, then try again.',
  unavailable: 'Local storage is not available in this browser.',
  writeFailed: 'Could not save to local storage.',
  corrupted: 'That file is not a valid Conjugation Trainer export. Nothing was changed.',
  wrongApp: 'That file was exported by a different app. Nothing was changed.',
  unconfirmed: 'Reset needs the typed confirmation. Nothing was changed.',
} as const

export function newerVersionMessage(version: number): string {
  return `That file uses export version ${version}; this app reads version ${EXPORT_VERSION}. Update the app, then import. Nothing was changed.`
}

export function unknownVerbMessage(infinitive: string): string {
  return `“${infinitive}” is not in the verb list. Check the spelling or pick a verb from search.`
}
