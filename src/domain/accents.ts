/** The characters the drill's accent bar offers, in the order it shows them. */
export const ACCENT_BAR = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'] as const

/** What each dead key turns the next letter into. */
export const DEAD_KEY_ACCENTS = {
  "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' },
  '"': { u: 'ü' },
  '~': { n: 'ñ' },
} as const

export type DeadKey = keyof typeof DEAD_KEY_ACCENTS

const DEAD_KEYS = new Set<string>(Object.keys(DEAD_KEY_ACCENTS))

export interface Insertion {
  value: string
  /** Where the caret belongs once the browser has painted the new value. */
  caret: number
}

/** Insert text over the selected range, clamped to the value, as the accent bar does. */
export function insertAt(value: string, start: number, end: number, text: string): Insertion {
  const from = Math.min(Math.max(start, 0), value.length)
  const to = Math.min(Math.max(end, from), value.length)

  return {
    value: value.slice(0, from) + text + value.slice(to),
    caret: from + text.length,
  }
}

export interface DeadKeyStep {
  /** Text the dead key produces this step; empty while it waits for a letter. */
  insert: string
  /** The mark still waiting, or null once the combination is complete. */
  pending: DeadKey | null
}

/**
 * The desktop dead-key shortcut: press `'` then a vowel for á é í ó ú, `"` then u
 * for ü, `~` then n for ñ. A mark followed by a letter it cannot accent inserts
 * both characters literally. Anything that is not a single typed character (Enter,
 * Backspace, arrows) returns undefined so the input can handle it normally.
 */
export function applyDeadKey(pending: DeadKey | null, key: string): DeadKeyStep | undefined {
  if (key.length !== 1) return undefined

  if (DEAD_KEYS.has(key)) return { insert: '', pending: key as DeadKey }
  if (pending === null) return undefined

  const accents: Readonly<Record<string, string>> = DEAD_KEY_ACCENTS[pending]
  return { insert: accents[key.toLowerCase()] ?? `${pending}${key}`, pending: null }
}
