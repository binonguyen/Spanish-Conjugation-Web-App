/** A source of numbers in `[0, 1)`; the draw takes one so a session's queue is testable. */
export type Rng = () => number

/**
 * Mulberry32: a small seeded generator. The same seed always replays the same session.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates shuffle: the input is left untouched, so callers can reuse it. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    const current = shuffled[index]!
    shuffled[index] = shuffled[swap]!
    shuffled[swap] = current
  }

  return shuffled
}
