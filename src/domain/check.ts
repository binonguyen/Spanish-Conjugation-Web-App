/** The outcome of one answered item. */
export type Verdict = 'correct' | 'accent-only' | 'wrong'

/** The punctuation a learner may wrap around an answer, and the full stop they may add after it. */
const LEADING_PUNCTUATION = /^[¡!¿?\s]+/
const TRAILING_PERIOD = /\s*\.$/
const TRAILING_PUNCTUATION = /[¡!¿?\s]+$/

/**
 * Fold an answer to the form compared against the data: NFC, trimmed, single-spaced,
 * lowercased, without surrounding `¡!¿?` or a trailing `.`.
 */
function normalizeAnswer(value: string): string {
  return value
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(LEADING_PUNCTUATION, '')
    .replace(TRAILING_PERIOD, '')
    .replace(TRAILING_PUNCTUATION, '')
    .trim()
}

const ACCENT_FOLDS: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ü: 'u',
}

const ACCENT_PATTERN = new RegExp(`[${Object.keys(ACCENT_FOLDS).join('')}]`, 'g')

/**
 * Remove acute accents and the diaeresis, never the tilde of `ñ`: `ano` stays distinct
 * from `año`, while `hable` is only an accent slip from `hablé`.
 */
function foldAccents(value: string): string {
  return value.replace(ACCENT_PATTERN, (char) => ACCENT_FOLDS[char] ?? char)
}

/**
 * Check a typed answer against the accepted forms of one cell.
 *
 * Accepted forms come from the data, so clitic and `-ra`/`-se` variants need no checker
 * knowledge. No edit-distance tolerance: a single wrong letter is a real confusion.
 */
export function checkAnswer(input: string, accepted: readonly string[]): Verdict {
  const normalized = normalizeAnswer(input)
  if (normalized === '') return 'wrong'

  const unaccented = foldAccents(normalized)
  let accentOnly = false

  for (const form of accepted) {
    const expected = normalizeAnswer(form)
    if (expected === normalized) return 'correct'
    if (foldAccents(expected) === unaccented) accentOnly = true
  }

  return accentOnly ? 'accent-only' : 'wrong'
}
