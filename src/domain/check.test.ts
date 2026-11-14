import { describe, expect, it } from 'vitest'
import { checkAnswer, type Verdict } from './check'

type Case = {
  input: string
  accepted: string[]
  verdict: Verdict
}

const cases: Case[] = [
  { input: 'hablo', accepted: ['hablo'], verdict: 'correct' },
  { input: 'HABLO', accepted: ['hablo'], verdict: 'correct' },
  { input: 'HABLÉ', accepted: ['hablé'], verdict: 'correct' },
  { input: 'hable\u0301', accepted: ['hablé'], verdict: 'correct' },
  { input: ' ¡Háblame! ', accepted: ['háblame'], verdict: 'correct' },
  { input: 'hablo.', accepted: ['hablo'], verdict: 'correct' },
  { input: 'me   llamo', accepted: ['me llamo'], verdict: 'correct' },
  { input: '¿hablas?', accepted: ['hablas'], verdict: 'correct' },
  { input: 'hable', accepted: ['hablé'], verdict: 'accent-only' },
  { input: 'verguenza', accepted: ['vergüenza'], verdict: 'accent-only' },
  { input: 'hablame', accepted: ['¡Háblame!'], verdict: 'accent-only' },
  { input: 'llamate', accepted: ['llámate'], verdict: 'accent-only' },
  { input: 'hablo', accepted: ['hablé'], verdict: 'wrong' },
  { input: '.hablo', accepted: ['hablo'], verdict: 'wrong' },
  { input: 'ano', accepted: ['año'], verdict: 'wrong' },
  { input: 'año', accepted: ['ano'], verdict: 'wrong' },
  { input: 'hablara', accepted: ['hablara', 'hablase'], verdict: 'correct' },
  { input: 'hablase', accepted: ['hablara', 'hablase'], verdict: 'correct' },
  { input: 'llamo', accepted: ['me llamo'], verdict: 'wrong' },
  { input: 'llámate', accepted: ['llámate'], verdict: 'correct' },
  { input: '', accepted: ['hablo'], verdict: 'wrong' },
  { input: '   ', accepted: ['hablo'], verdict: 'wrong' },
]

describe('checkAnswer', () => {
  it.each(cases)('$input against $accepted → $verdict', ({ input, accepted, verdict }) => {
    expect(checkAnswer(input, accepted)).toBe(verdict)
  })

  it('is wrong when no form is accepted', () => {
    expect(checkAnswer('hablo', [])).toBe('wrong')
  })

  it('prefers an exact match when an accented sibling would only match as accent-only', () => {
    expect(checkAnswer('hablo', ['habló', 'hablo'])).toBe('correct')
  })
})
