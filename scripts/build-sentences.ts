/**
 * Picks one Tatoeba example sentence per verb and vendors it to
 * scripts/data/sentences.tsv for `build-verbs.ts` to join.
 *
 * The bulk source is the manythings.org aligned spa-eng export (a filtered
 * Tatoeba snapshot). It is not committed: download it once, keep it in
 * `.cache/`, and refresh the selection only when the sentence set needs to
 * change. Regenerating `src/data/verbs.json` afterwards stays offline.
 *
 * Usage:
 *   node scripts/build-sentences.ts [path-to-spa.txt]
 *   npm run data:sentences
 *
 * Without an argument the script reads `.cache/tatoeba/spa.txt`. To fetch it:
 *   Invoke-WebRequest https://www.manythings.org/anki/spa-eng.zip -OutFile spa-eng.zip
 *   Expand-Archive spa-eng.zip -DestinationPath .cache/tatoeba
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildFormIndex,
  matchVerbs,
  MIN_TOP_SENTENCE_COVERAGE,
  parseOverrideTsv,
  parsePairLine,
  selectSentences,
  serializeSentenceTsv,
  SENTENCE_MAX_LENGTH,
  TOP_VERB_COUNT,
  type IndexableVerb,
  type TatoebaPair,
} from './sentences.ts'

const ROOT = process.cwd()
const DEFAULT_SOURCE = join(ROOT, '.cache', 'tatoeba', 'spa.txt')
const VERBS_PATH = join(ROOT, 'src', 'data', 'verbs.json')
const OVERRIDES_PATH = join(ROOT, 'scripts', 'data', 'sentence-overrides.tsv')
const OUT_PATH = join(ROOT, 'scripts', 'data', 'sentences.tsv')

interface Artifact {
  verbs: IndexableVerb[]
}

function fail(message: string): never {
  throw new Error(`build-sentences: ${message}`)
}

function readPairs(path: string): TatoebaPair[] {
  const lines = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
  const pairs: TatoebaPair[] = []
  for (const line of lines) {
    if (!line.trim()) continue
    const pair = parsePairLine(line)
    if (pair) pairs.push(pair)
  }
  return pairs
}

function main() {
  const sourcePath = process.argv[2] ?? process.env.TATOEBA_SPA_ENG ?? DEFAULT_SOURCE
  if (!existsSync(sourcePath)) {
    fail(
      `missing ${sourcePath}. Download https://www.manythings.org/anki/spa-eng.zip, ` +
        `extract spa.txt to .cache/tatoeba/spa.txt, then rerun.`,
    )
  }
  if (!existsSync(VERBS_PATH)) fail(`missing ${VERBS_PATH}; run \`npm run data\` first`)

  const artifact = JSON.parse(readFileSync(VERBS_PATH, 'utf8')) as Artifact
  const pairs = readPairs(sourcePath)
  const selected = selectSentences(pairs, artifact.verbs)

  const byId = new Map<number, TatoebaPair>()
  for (const pair of pairs) if (!byId.has(pair.id)) byId.set(pair.id, pair)

  const overrides = existsSync(OVERRIDES_PATH)
    ? parseOverrideTsv(readFileSync(OVERRIDES_PATH, 'utf8'))
    : new Map<string, number>()
  const index = buildFormIndex(artifact.verbs)
  for (const [infinitive, id] of overrides) {
    if (!artifact.verbs.some((verb) => verb.infinitive === infinitive)) {
      fail(`sentence override names unknown verb ${infinitive}`)
    }
    const pair = byId.get(id)
    if (!pair) fail(`sentence override for ${infinitive} points at missing Tatoeba id ${id}`)
    if (pair.es.length > SENTENCE_MAX_LENGTH) {
      fail(`sentence override for ${infinitive} is ${pair.es.length} chars, over ${SENTENCE_MAX_LENGTH}`)
    }
    if (!matchVerbs(pair.es, index).has(infinitive)) {
      fail(`sentence override for ${infinitive} does not contain a form of it: ${pair.es}`)
    }
    selected.set(infinitive, pair)
  }

  const rows = new Map<string, TatoebaPair>()
  for (const verb of artifact.verbs) {
    const sentence = selected.get(verb.infinitive)
    if (sentence) rows.set(verb.infinitive, sentence)
  }

  const top = artifact.verbs.slice(0, TOP_VERB_COUNT)
  const topCovered = top.filter((verb) => rows.has(verb.infinitive)).length
  const coverage = topCovered / top.length
  console.log(
    `build-sentences: ${pairs.length} aligned pairs, ${rows.size}/${artifact.verbs.length} verbs ` +
      `(${topCovered}/${top.length} top verbs, ${(coverage * 100).toFixed(1)}%)`,
  )
  if (coverage < MIN_TOP_SENTENCE_COVERAGE) {
    fail(`only ${(coverage * 100).toFixed(1)}% of the top ${TOP_VERB_COUNT} verbs have a sentence`)
  }

  mkdirSync(join(ROOT, 'scripts', 'data'), { recursive: true })
  writeFileSync(OUT_PATH, serializeSentenceTsv(rows, artifact.verbs.map((verb) => verb.infinitive)), 'utf8')
  console.log(`build-sentences: wrote ${OUT_PATH}`)

  for (const [index, verb] of artifact.verbs.entries()) {
    if (index >= TOP_VERB_COUNT) break
    const sentence = rows.get(verb.infinitive)
    console.log(
      `${String(index + 1).padStart(3)}. ${verb.infinitive} — ` +
        (sentence ? `${sentence.es} | ${sentence.en} [#${sentence.id} ${sentence.author}]` : '(none)'),
    )
  }
}

main()
