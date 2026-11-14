import type { Verb } from '../data/verbs'
import type { Verdict } from './check'
import { shuffle, type Rng } from './random'
import { verbsInTier } from './verbPool'

/** One English gloss offered beside a vocabulary prompt. */
export interface VocabularyOption {
  /** The verb whose gloss this option is. */
  infinitive: string
  /** The English gloss shown on the answer button. */
  gloss: string
  /** Whether this is the prompted verb's own gloss. */
  correct: boolean
}

/** Words a gloss shares only by syntax, not by meaning. */
const GLOSS_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'for',
  'in',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'with',
])

function glossWords(gloss: string): Set<string> {
  return new Set(
    gloss
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}]+/gu, ' ')
      .split(' ')
      .filter((word) => word !== '' && !GLOSS_STOP_WORDS.has(word)),
  )
}

function sharesWord(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return [...left].some((word) => right.has(word))
}

/**
 * Four glosses for one vocabulary prompt: the verb's own gloss plus three from the
 * same frequency tier. Distinct gloss strings keep only one option answerable, and a
 * distractor sharing a meaning word with the target or an earlier option is avoided
 * while enough candidates remain, so `mirar` is not offered beside `ver`.
 */
export function buildVocabularyOptions(verb: Verb, rng: Rng): VocabularyOption[] {
  const candidates = shuffle(
    verbsInTier(verb.tier).filter((candidate) => candidate.infinitive !== verb.infinitive),
    rng,
  )
  const chosen: Verb[] = []
  const glosses = new Set([verb.gloss])
  const wordSets = [glossWords(verb.gloss)]

  for (const candidate of candidates) {
    if (chosen.length === 3) break
    if (glosses.has(candidate.gloss)) continue

    const words = glossWords(candidate.gloss)
    if (wordSets.some((taken) => sharesWord(taken, words))) continue

    chosen.push(candidate)
    glosses.add(candidate.gloss)
    wordSets.push(words)
  }

  // A small or unusually crowded tier may exhaust the non-overlapping candidates; a
  // distinct gloss is still better than a repeated option.
  for (const candidate of candidates) {
    if (chosen.length === 3) break
    if (glosses.has(candidate.gloss)) continue

    chosen.push(candidate)
    glosses.add(candidate.gloss)
  }

  // The artifact is asserted in CI to have enough tier peers, so this is a data bug,
  // not a runtime case to hide behind three buttons.
  if (chosen.length < 3) {
    throw new Error(
      `Tier ${verb.tier} has too few verbs with distinct glosses to build options for ${verb.infinitive}`,
    )
  }

  return shuffle(
    [
      { infinitive: verb.infinitive, gloss: verb.gloss, correct: true },
      ...chosen.map((candidate) => ({
        infinitive: candidate.infinitive,
        gloss: candidate.gloss,
        correct: false,
      })),
    ],
    rng,
  )
}

/** The prompted verb's option, or `undefined` if the options are malformed. */
export function correctOption(
  options: readonly VocabularyOption[],
): VocabularyOption | undefined {
  return options.find((option) => option.correct)
}

/** A vocabulary answer is right only when it picks the prompted verb's gloss. */
export function vocabularyVerdict(
  options: readonly VocabularyOption[],
  selectedGloss: string,
): Verdict {
  return correctOption(options)?.gloss === selectedGloss ? 'correct' : 'wrong'
}
