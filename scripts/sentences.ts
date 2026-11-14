/**
 * Selecting one Tatoeba example sentence per verb.
 *
 * Pure helpers shared by `build-sentences.ts` (which reads the raw aligned
 * export) and `build-verbs.ts` (which joins the vendored selection into the
 * artifact). No filesystem or network access here, so it is unit-testable.
 *
 * Tatoeba pairs are Spanish/English sentences linked as translations, exported
 * by manythings.org as `english \t spanish \t attribution`. The first
 * attribution link names the English sentence, the second the Spanish one; the
 * Spanish id and author are what we store and credit.
 */
export const SENTENCE_MAX_LENGTH = 90

/** Coverage gate from the ticket: one sentence for at least this share of the top verbs. */
export const TOP_VERB_COUNT = 500
export const MIN_TOP_SENTENCE_COVERAGE = 0.9

const MIN_SENTENCE_LENGTH = 6
const MAX_ENGLISH_LENGTH = 140
const MAX_FORM_WORDS = 2
const COMFORTABLE_MIN = 20
const COMFORTABLE_MAX = 64
const CANDIDATE_CAP = 40

export interface TatoebaPair {
  /** Spanish sentence, as displayed. */
  es: string
  /** English translation. */
  en: string
  /** Tatoeba id of the Spanish sentence, for attribution and stable deduplication. */
  id: number
  /** Tatoeba author of the Spanish sentence. */
  author: string
}

export interface IndexableVerb {
  infinitive: string
  forms: Record<string, string[][]>
  nonFinite: { gerundio: string[]; participio: string[] }
}

export interface SelectOptions {
  maxLength?: number
  minLength?: number
  maxEnglishLength?: number
}

const ATTRIBUTION_LINK = /#(\d+) \(([^)]*)\)/g

/** Parse one line of the manythings.org `spa.txt` aligned export. */
export function parsePairLine(line: string): TatoebaPair | null {
  const columns = line.split('\t')
  if (columns.length < 3) return null

  const en = columns[0]?.trim() ?? ''
  const es = columns[1]?.trim() ?? ''
  if (!es || !en) return null

  const links = [...columns.slice(2).join('\t').matchAll(ATTRIBUTION_LINK)]
  const spanish = links[1]
  if (!spanish) return null

  const id = Number(spanish[1])
  const author = spanish[2]?.trim() ?? ''
  if (!Number.isInteger(id) || id < 1 || !author) return null

  return { es, en, id, author }
}

/** Forced picks: infinitive -> Tatoeba id of the Spanish sentence. */
export function parseOverrideTsv(text: string): Map<string, number> {
  const overrides = new Map<string, number>()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.trim() || line.startsWith('#')) continue
    const [infinitive, idColumn, ...rest] = line.split('\t')
    const id = Number(idColumn)
    if (!infinitive || rest.length > 0 || !Number.isInteger(id) || id < 1) {
      throw new Error(`malformed sentence override: ${line}`)
    }
    if (overrides.has(infinitive)) throw new Error(`duplicate sentence override for ${infinitive}`)
    overrides.set(infinitive, id)
  }
  return overrides
}

/** Read the vendored selection. Comment lines start with `#`. */
export function parseSentenceTsv(text: string): Map<string, TatoebaPair> {
  const rows = new Map<string, TatoebaPair>()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.trim() || line.startsWith('#')) continue

    const columns = line.split('\t')
    if (columns.length !== 5) {
      throw new Error(`malformed sentence row (expected 5 columns): ${line}`)
    }
    const [infinitive, idColumn, author, es, en] = columns as [string, string, string, string, string]
    const id = Number(idColumn)
    if (!infinitive || !author || !es || !en) throw new Error(`empty sentence column: ${line}`)
    if (!Number.isInteger(id) || id < 1) throw new Error(`bad sentence id: ${line}`)
    if (rows.has(infinitive)) throw new Error(`duplicate sentence for ${infinitive}`)
    rows.set(infinitive, { id, author, es, en })
  }
  return rows
}

const TSV_HEADER = [
  '# Tatoeba example sentences, joined from the manythings.org spa-eng export.',
  '# Source: https://www.manythings.org/anki/ (Tatoeba, CC BY 2.0 FR)',
  '# Columns: infinitive, Spanish sentence id, Spanish author, Spanish sentence, English translation',
]

export function serializeSentenceTsv(rows: Map<string, TatoebaPair>, order: readonly string[]): string {
  const lines = [...TSV_HEADER]
  for (const infinitive of order) {
    const row = rows.get(infinitive)
    if (!row) continue
    lines.push([infinitive, String(row.id), row.author, row.es, row.en].join('\t'))
  }
  return lines.join('\n') + '\n'
}

/** Every accepted form of a verb, normalized for whole-word matching. */
export function formsForVerb(verb: IndexableVerb): string[] {
  const all = [
    ...Object.values(verb.forms).flat(2),
    ...verb.nonFinite.gerundio,
    ...verb.nonFinite.participio,
  ]
  const forms = new Set<string>()
  for (const form of all) {
    const normalized = normalize(form)
    if (normalized) forms.add(normalized)
  }
  return [...forms]
}

function normalize(text: string): string {
  return text.normalize('NFC').toLowerCase()
}

function tokenize(sentence: string): string[] {
  return normalize(sentence)
    .split(/\s+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N}]+$/u, ''))
    .filter(Boolean)
}

/** Form (word or multi-word phrase) -> verbs that accept it. */
export function buildFormIndex(verbs: readonly IndexableVerb[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>()
  for (const verb of verbs) {
    for (const form of formsForVerb(verb)) {
      let owners = index.get(form)
      if (!owners) {
        owners = new Set()
        index.set(form, owners)
      }
      owners.add(verb.infinitive)
    }
  }
  return index
}

/** Verbs with an accepted form appearing as a whole word in the sentence. */
export function matchVerbs(sentence: string, index: Map<string, Set<string>>): Set<string> {
  const tokens = tokenize(sentence)
  const matched = new Set<string>()
  for (let start = 0; start < tokens.length; start += 1) {
    for (let words = 1; words <= MAX_FORM_WORDS && start + words <= tokens.length; words += 1) {
      const owners = index.get(tokens.slice(start, start + words).join(' '))
      if (!owners) continue
      for (const infinitive of owners) matched.add(infinitive)
    }
  }
  return matched
}

interface ScoredPair {
  pair: TatoebaPair
  /** Distance outside the comfortable length band; shorter is better. */
  lengthPenalty: number
  /** How many other verbs also accept a form in this sentence. */
  ambiguity: number
}

function comparePairs(a: ScoredPair, b: ScoredPair): number {
  return (
    a.lengthPenalty - b.lengthPenalty ||
    a.ambiguity - b.ambiguity ||
    a.pair.es.length - b.pair.es.length ||
    a.pair.id - b.pair.id
  )
}

function lengthPenalty(length: number): number {
  if (length < COMFORTABLE_MIN) return COMFORTABLE_MIN - length
  if (length > COMFORTABLE_MAX) return length - COMFORTABLE_MAX
  return 0
}

function insertCandidate(list: ScoredPair[], candidate: ScoredPair): void {
  const last = list[list.length - 1]
  if (list.length >= CANDIDATE_CAP && last && comparePairs(candidate, last) >= 0) return

  let low = 0
  let high = list.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (comparePairs(candidate, list[middle] as ScoredPair) < 0) high = middle
    else low = middle + 1
  }
  list.splice(low, 0, candidate)
  if (list.length > CANDIDATE_CAP) list.pop()
}

function isUsable(pair: TatoebaPair, maxLength: number, minLength: number, maxEnglishLength: number): boolean {
  if (pair.es.length < minLength || pair.es.length > maxLength) return false
  if (pair.en.length < 1 || pair.en.length > maxEnglishLength) return false
  return /\p{L}/u.test(pair.es)
}

/**
 * Pick one sentence per verb, in verb order, never reusing a sentence that an
 * earlier verb already took when a decent alternative exists.
 */
export function selectSentences(
  pairs: Iterable<TatoebaPair>,
  verbs: readonly IndexableVerb[],
  options: SelectOptions = {},
): Map<string, TatoebaPair> {
  const maxLength = options.maxLength ?? SENTENCE_MAX_LENGTH
  const minLength = options.minLength ?? MIN_SENTENCE_LENGTH
  const maxEnglishLength = options.maxEnglishLength ?? MAX_ENGLISH_LENGTH
  const byVerb = new Map<string, ScoredPair[]>()
  const index = buildFormIndex(verbs)

  for (const pair of pairs) {
    if (!isUsable(pair, maxLength, minLength, maxEnglishLength)) continue
    const matched = matchVerbs(pair.es, index)
    if (matched.size === 0) continue
    const candidate: ScoredPair = {
      pair,
      lengthPenalty: lengthPenalty(pair.es.length),
      ambiguity: matched.size - 1,
    }
    for (const infinitive of matched) {
      let candidates = byVerb.get(infinitive)
      if (!candidates) {
        candidates = []
        byVerb.set(infinitive, candidates)
      }
      insertCandidate(candidates, candidate)
    }
  }

  const chosen = new Map<string, TatoebaPair>()
  const usedIds = new Set<number>()
  for (const verb of verbs) {
    const candidates = byVerb.get(verb.infinitive) ?? []
    const pick = candidates.find((candidate) => !usedIds.has(candidate.pair.id))
    if (!pick) continue
    chosen.set(verb.infinitive, pick.pair)
    usedIds.add(pick.pair.id)
  }
  return chosen
}
