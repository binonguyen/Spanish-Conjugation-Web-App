import { describe, expect, it } from 'vitest'
import { verbArtifact, type Verb } from '../data/verbs'
import { createRng } from './random'
import { buildVocabularyOptions, correctOption, vocabularyVerdict } from './vocab'

/** The independent oracle for "these glosses mean different things". */
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

function sharesWord(left: Set<string>, right: Set<string>): boolean {
  return [...left].some((word) => right.has(word))
}

function verb(infinitive: string): Verb {
  const found = verbArtifact.verbs.find((candidate) => candidate.infinitive === infinitive)
  if (!found) throw new Error(`missing fixture verb ${infinitive}`)
  return found
}

describe('vocabulary options', () => {
  it('offers four options and carries the verb’s own gloss exactly once', () => {
    for (const source of verbArtifact.verbs) {
      const options = buildVocabularyOptions(source, createRng(2026))
      const correct = options.filter((option) => option.correct)

      expect(options, source.infinitive).toHaveLength(4)
      expect(correct, source.infinitive).toHaveLength(1)
      expect(correct[0]?.infinitive, source.infinitive).toBe(source.infinitive)
      expect(correct[0]?.gloss, source.infinitive).toBe(source.gloss)
    }
  })

  it('draws every distractor from the same frequency tier and gives no two options the same gloss', () => {
    for (const source of verbArtifact.verbs) {
      const options = buildVocabularyOptions(source, createRng(77))

      for (const option of options) {
        expect(verb(option.infinitive).tier, option.infinitive).toBe(source.tier)
      }
      expect(new Set(options.map((option) => option.gloss)).size).toBe(options.length)
    }
  })

  it('prefers distractors whose gloss words do not overlap the target or the other options', () => {
    const pairs = [
      ['mirar', 'ver'],
      ['ser', 'estar'],
    ] as const

    for (const [target, twin] of pairs) {
      for (let seed = 0; seed < 20; seed += 1) {
        const options = buildVocabularyOptions(verb(target), createRng(seed))
        const words = options.map((option) => glossWords(option.gloss))

        expect(options.map((option) => option.infinitive), `${target} seed ${seed}`).not.toContain(
          twin,
        )
        for (let left = 0; left < words.length; left += 1) {
          for (let right = left + 1; right < words.length; right += 1) {
            expect(
              sharesWord(words[left]!, words[right]!),
              `${target} seed ${seed}: ${options[left]!.gloss} / ${options[right]!.gloss}`,
            ).toBe(false)
          }
        }
      }
    }
  })
})

describe('vocabulary verdict', () => {
  const options = buildVocabularyOptions(verb('hablar'), createRng(5))

  it('accepts the target gloss and rejects a distractor gloss', () => {
    expect(vocabularyVerdict(options, correctOption(options)!.gloss)).toBe('correct')

    const distractor = options.find((option) => !option.correct)
    expect(vocabularyVerdict(options, distractor!.gloss)).toBe('wrong')
  })

  it('marks a gloss that is not among the options wrong rather than trusting it', () => {
    expect(vocabularyVerdict(options, 'to fly')).toBe('wrong')
  })
})
