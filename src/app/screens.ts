export const SCREENS = ['builder', 'drill', 'results', 'stats'] as const

export type Screen = (typeof SCREENS)[number]

export const SCREEN_LABELS: Record<Screen, string> = {
  builder: 'Builder',
  drill: 'Drill',
  results: 'Results',
  stats: 'Stats',
}
