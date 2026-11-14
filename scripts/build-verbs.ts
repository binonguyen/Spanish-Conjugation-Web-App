/**
 * Generates src/data/verbs.json from permissively licensed sources.
 *
 * Run with `npm run data`. Needs the network only the first time the verb list
 * is replaced; regeneration itself is offline.
 *
 * Forms: conjuego (ISC). Glosses: conjugator (Apache-2.0), with the MIT
 * frequency list's own gloss as a fallback where conjugator has no entry.
 * Frequency order: fuzzy-logic/2000-verbos (MIT), vendored in
 * scripts/data/top-verbs.tsv. See docs/adr/0003-verb-frequency-list.md.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { conjuego } from 'conjuego/por-defecto'

type Person = 'yo' | 'tu' | '3sg' | 'nosotros' | 'vosotros' | '3pl'
type ImperativePerson = Exclude<Person, 'yo'>
/** One array per tense, in `PERSON_ORDER`; each entry is the accepted forms for that person. */
type Forms = Record<string, string[][]>

interface VerbListRow {
  rank: number
  infinitive: string
  fallbackGloss: string
}

interface VerbRecord {
  infinitive: string
  reflexive: boolean
  gloss: string
  tier: 1 | 2
  forms: Forms
  nonFinite: { gerundio: string[]; participio: string[] }
}

type Cell = string | readonly string[] | null | undefined

const ROOT = process.cwd()
const LIST_PATH = join(ROOT, 'scripts', 'data', 'top-verbs.tsv')
const OVERRIDES_PATH = join(ROOT, 'scripts', 'data', 'gloss-overrides.tsv')
const OUT_PATH = join(ROOT, 'src', 'data', 'verbs.json')
const GZIP_LIMIT = 110 * 1024
const TIER_1_SIZE = 100
const MIN_VERB_COUNT = 500

const PERSON_FROM_CELL = {
  primera_singular: 'yo',
  segunda_singular: 'tu',
  tercera_singular: '3sg',
  primera_plural: 'nosotros',
  segunda_plural: 'vosotros',
  tercera_plural: '3pl',
} as const satisfies Record<string, Person>

const CELL_FOR_PERSON = {
  yo: 'primera_singular',
  tu: 'segunda_singular',
  '3sg': 'tercera_singular',
  nosotros: 'primera_plural',
  vosotros: 'segunda_plural',
  '3pl': 'tercera_plural',
} as const satisfies Record<Person, keyof typeof PERSON_FROM_CELL>

const PERSON_ORDER: Person[] = ['yo', 'tu', '3sg', 'nosotros', 'vosotros', '3pl']
const IMPERATIVE_ORDER: ImperativePerson[] = ['tu', '3sg', 'nosotros', 'vosotros', '3pl']

const INDICATIVE_TENSES = {
  presente: 'presente',
  imperfecto: 'preterito_imperfecto',
  preterito: 'preterito_indefinido',
  futuro: 'futuro_simple',
  condicional: 'condicional_simple',
} as const

const SUBJUNCTIVE_TENSES = {
  presente: 'presente_subjuntivo',
  futuro: 'futuro_subjuntivo',
} as const

/** Stable order in the artifact. Compound tenses are composed at runtime. */
const TENSE_ORDER = [
  'presente',
  'preterito_imperfecto',
  'preterito_indefinido',
  'futuro_simple',
  'condicional_simple',
  'presente_subjuntivo',
  'imperfecto_subjuntivo',
  'futuro_subjuntivo',
  'imperativo_afirmativo',
  'imperativo_negativo',
] as const

function peopleForTense(tense: string): readonly string[] {
  return tense.startsWith('imperativo_') ? IMPERATIVE_ORDER : PERSON_ORDER
}

function fail(message: string): never {
  throw new Error(`build-verbs: ${message}`)
}

function readVersion(packageName: string): string {
  const raw = readFileSync(join(ROOT, 'node_modules', packageName, 'package.json'), 'utf8')
  const parsed = JSON.parse(raw) as { version?: string }
  return parsed.version ?? 'unknown'
}

function toArray(cell: Cell): string[] {
  if (cell === null || cell === undefined) return []
  const raw = Array.isArray(cell) ? cell : [cell as string]
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of raw) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

function parseVerbList(): VerbListRow[] {
  const text = readFileSync(LIST_PATH, 'utf8')
  const rows: VerbListRow[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue
    const [rank, infinitive, , ...rest] = line.split('\t')
    const fallbackGloss = rest.join('\t').trim()
    if (!rank || !infinitive) fail(`malformed verb list row: ${line}`)
    const parsedRank = Number(rank)
    if (!Number.isInteger(parsedRank) || parsedRank < 1) fail(`bad rank in: ${line}`)
    rows.push({ rank: parsedRank, infinitive: infinitive.trim(), fallbackGloss })
  }
  if (rows.length < MIN_VERB_COUNT) fail(`expected at least ${MIN_VERB_COUNT} verbs, got ${rows.length}`)
  const seen = new Set<string>()
  for (const row of rows) {
    if (seen.has(row.infinitive)) fail(`duplicate infinitive: ${row.infinitive}`)
    seen.add(row.infinitive)
  }
  return rows
}

/** English glosses from conjugator's TSVs; the last column is always English. */
function loadConjugatorGlosses(): Map<string, string> {
  const dir = join(ROOT, 'node_modules', 'conjugator', 'data')
  const glosses = new Map<string, string>()
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.tsv')) continue
    const lines = readFileSync(join(dir, file), 'utf8').split(/\r?\n/)
    for (const line of lines) {
      if (!line.trim() || line.startsWith('infinitive')) continue
      const cols = line.split('\t')
      const infinitive = cols[0]?.trim()
      const gloss = cols[cols.length - 1]?.trim()
      if (!infinitive || !gloss || gloss === 'English') continue
      if (!glosses.has(infinitive)) glosses.set(infinitive, gloss)
    }
  }
  return glosses
}

function loadOverrides(): Map<string, string> {
  const overrides = new Map<string, string>()
  if (!existsSync(OVERRIDES_PATH)) return overrides
  for (const line of readFileSync(OVERRIDES_PATH, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue
    const [infinitive, ...rest] = line.split('\t')
    const gloss = rest.join('\t').trim()
    if (!infinitive || !gloss) fail(`malformed gloss override: ${line}`)
    overrides.set(infinitive.trim(), gloss)
  }
  return overrides
}

/** One gloss string, senses comma-joined rather than slash-joined. */
function normalizeGloss(gloss: string): string {
  return gloss
    .replace(/\s*\/\s*/g, ', ')
    .replace(/,\s*to\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
}

function personalForms(
  table: ReturnType<typeof conjuego>,
  mood: 'indicativo' | 'subjuntivo',
  tense: string,
): string[][] {
  const paradigm = (table[mood] as unknown as Record<string, Record<string, Cell>>)[tense]
  if (!paradigm) fail(`conjuego has no ${mood}.${tense}`)
  return PERSON_ORDER.map((person) => toArray(paradigm[CELL_FOR_PERSON[person]]))
}

/** The four simple personal moods/tenses shared by verbs and the haber table. */
function simpleForms(table: ReturnType<typeof conjuego>): Forms {
  const forms: Forms = {}
  for (const [tense, id] of Object.entries(INDICATIVE_TENSES)) {
    forms[id] = personalForms(table, 'indicativo', tense)
  }
  for (const [tense, id] of Object.entries(SUBJUNCTIVE_TENSES)) {
    forms[id] = personalForms(table, 'subjuntivo', tense)
  }

  const imperfect = table.subjuntivo.imperfecto
  forms.imperfecto_subjuntivo = PERSON_ORDER.map((person) => {
    const cell = CELL_FOR_PERSON[person]
    const merged = [...toArray(imperfect.ra[cell]), ...toArray(imperfect.se[cell])]
    return [...new Set(merged)]
  })
  return forms
}

function buildVerbForms(table: ReturnType<typeof conjuego>): Forms {
  const forms = simpleForms(table)
  forms.imperativo_afirmativo = IMPERATIVE_ORDER.map((person) =>
    toArray(table.imperativo.afirmativa[CELL_FOR_PERSON[person]]),
  )
  forms.imperativo_negativo = IMPERATIVE_ORDER.map((person) =>
    toArray(table.imperativo.negativa[CELL_FOR_PERSON[person]]),
  )
  return forms
}

function buildHaber(): Forms {
  const forms = simpleForms(conjuego('haber'))
  // "hay" is impersonal and must not compose "hay comido". The auxiliary table
  // only carries personal forms; the app has no impersonal-hay drill.
  const presente = forms.presente
  if (!presente) fail('conjuego returned no present for haber')
  const thirdSingular = PERSON_ORDER.indexOf('3sg')
  presente[thirdSingular] = (presente[thirdSingular] ?? []).filter((form) => form !== 'hay')
  return forms
}

function assertForms(infinitive: string, forms: Forms) {
  for (const tense of TENSE_ORDER) {
    const cells = forms[tense]
    if (!cells) fail(`${infinitive} is missing tense ${tense}`)
    const people = peopleForTense(tense)
    if (cells.length !== people.length) {
      fail(`${infinitive} has ${cells.length} people in ${tense}, expected ${people.length}`)
    }
    cells.forEach((accepted, index) => {
      if (!accepted || accepted.length === 0) fail(`${infinitive} has an empty ${tense}/${people[index]} cell`)
      for (const form of accepted) {
        if (!form.trim() || form.includes('?') || form.toLowerCase().includes('undefined')) {
          fail(`${infinitive} has a placeholder in ${tense}/${people[index]}: ${JSON.stringify(form)}`)
        }
      }
    })
  }

  const imperfect = forms.imperfecto_subjuntivo ?? []
  for (const person of PERSON_ORDER) {
    const accepted = imperfect[PERSON_ORDER.indexOf(person)] ?? []
    if (accepted.length < 2) fail(`${infinitive} lacks both imperfect-subjunctive endings for ${person}`)
  }
}

function buildVerbRecord(row: VerbListRow, tier: 1 | 2, gloss: string): VerbRecord {
  const table = conjuego(row.infinitive)
  const forms = buildVerbForms(table)
  assertForms(row.infinitive, forms)
  return {
    infinitive: row.infinitive,
    reflexive: row.infinitive.endsWith('se'),
    gloss,
    tier,
    forms,
    nonFinite: {
      gerundio: toArray(table.no_personal.gerundio),
      participio: toArray(table.no_personal.participio_pasado),
    },
  }
}

function main() {
  const rows = parseVerbList()
  const conjugatorGlosses = loadConjugatorGlosses()
  const overrides = loadOverrides()

  const verbs = rows.map((row, index) => {
    const gloss = overrides.get(row.infinitive) ?? conjugatorGlosses.get(row.infinitive) ?? row.fallbackGloss
    if (!gloss) fail(`no gloss for ${row.infinitive}`)
    return buildVerbRecord(row, index < TIER_1_SIZE ? 1 : 2, normalizeGloss(gloss))
  })

  const artifact = {
    generatedAt: new Date().toISOString(),
    personOrder: {
      personal: PERSON_ORDER,
      imperative: IMPERATIVE_ORDER,
    },
    tenses: TENSE_ORDER,
    sources: [
      {
        name: `conjuego ${readVersion('conjuego')}`,
        license: 'ISC',
        url: 'https://github.com/korovindn/conjuego',
        use: 'conjugated forms',
      },
      {
        name: `conjugator ${readVersion('conjugator')}`,
        license: 'Apache-2.0',
        url: 'https://github.com/ehoogerbeets/conjugator',
        use: 'English glosses',
      },
      {
        name: 'fuzzy-logic/2000-verbos',
        license: 'MIT',
        url: 'https://github.com/fuzzy-logic/2000-verbos',
        use: 'frequency order and fallback glosses',
      },
    ],
    verbs,
    haber: buildHaber(),
  }

  const json = JSON.stringify(artifact, null, 2) + '\n'
  mkdirSync(join(ROOT, 'src', 'data'), { recursive: true })
  writeFileSync(OUT_PATH, json, 'utf8')

  // What ships is the minified module Vite produces, not the pretty file in git.
  const shipped = JSON.stringify(artifact)
  const gzipBytes = gzipSync(Buffer.from(shipped, 'utf8')).byteLength
  console.log(
    `build-verbs: ${verbs.length} verbs, ${Math.round(Buffer.byteLength(shipped) / 1024)} KB raw, ` +
      `${(gzipBytes / 1024).toFixed(1)} KB gzip`,
  )
  if (gzipBytes > GZIP_LIMIT) {
    fail(`artifact is ${(gzipBytes / 1024).toFixed(1)} KB gzip, over the ${GZIP_LIMIT / 1024} KB budget`)
  }
}

main()
