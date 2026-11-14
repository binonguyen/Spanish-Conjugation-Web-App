import { describe, expect, it } from 'vitest'
import { SCREEN_LABELS, SCREENS } from './screens'

describe('screens', () => {
  it('defines the four shell screens once each, with labels', () => {
    expect(SCREENS).toHaveLength(4)
    expect(new Set(SCREENS).size).toBe(SCREENS.length)

    for (const screen of SCREENS) {
      expect(SCREEN_LABELS[screen]).not.toBe('')
    }
  })
})
