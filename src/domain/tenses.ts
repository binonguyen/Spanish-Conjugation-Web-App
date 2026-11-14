export const MOODS = ['indicativo', 'subjuntivo', 'imperativo'] as const

export type Mood = (typeof MOODS)[number]

/** Stable, ASCII ids shared by the catalogue, the artifact and stored progress. */
export type TenseId =
  | 'presente'
  | 'preterito_imperfecto'
  | 'preterito_indefinido'
  | 'futuro_simple'
  | 'condicional_simple'
  | 'preterito_perfecto'
  | 'pluscuamperfecto'
  | 'futuro_perfecto'
  | 'condicional_perfecto'
  | 'preterito_anterior'
  | 'presente_subjuntivo'
  | 'imperfecto_subjuntivo'
  | 'perfecto_subjuntivo'
  | 'pluscuamperfecto_subjuntivo'
  | 'futuro_subjuntivo'
  | 'futuro_perfecto_subjuntivo'
  | 'imperativo_afirmativo'
  | 'imperativo_negativo'

export interface TenseInfo {
  id: TenseId
  /** Spanish name, as shown in drills and the builder. */
  label: string
  /** Small English gloss shown beside the Spanish name. */
  gloss: string
  mood: Mood
  /** Archaic or formal; hidden unless the setting is on. */
  archaic: boolean
}

/**
 * The fifteen tenses a session can draw from, plus the three archaic/formal ones
 * behind a setting. Compound tenses are listed here even though the artifact stores
 * only simple paradigms: they are composed at runtime from `haber` + participle.
 */
export const TENSES: readonly TenseInfo[] = [
  { id: 'presente', label: 'Presente', gloss: 'present', mood: 'indicativo', archaic: false },
  { id: 'preterito_imperfecto', label: 'Pretérito imperfecto', gloss: 'imperfect', mood: 'indicativo', archaic: false },
  { id: 'preterito_indefinido', label: 'Pretérito indefinido', gloss: 'simple past', mood: 'indicativo', archaic: false },
  { id: 'futuro_simple', label: 'Futuro simple', gloss: 'simple future', mood: 'indicativo', archaic: false },
  { id: 'condicional_simple', label: 'Condicional simple', gloss: 'simple conditional', mood: 'indicativo', archaic: false },
  { id: 'preterito_perfecto', label: 'Pretérito perfecto', gloss: 'present perfect', mood: 'indicativo', archaic: false },
  { id: 'pluscuamperfecto', label: 'Pluscuamperfecto', gloss: 'past perfect', mood: 'indicativo', archaic: false },
  { id: 'futuro_perfecto', label: 'Futuro perfecto', gloss: 'future perfect', mood: 'indicativo', archaic: false },
  { id: 'condicional_perfecto', label: 'Condicional perfecto', gloss: 'conditional perfect', mood: 'indicativo', archaic: false },
  { id: 'preterito_anterior', label: 'Pretérito anterior', gloss: 'past anterior', mood: 'indicativo', archaic: true },
  { id: 'presente_subjuntivo', label: 'Presente de subjuntivo', gloss: 'present subjunctive', mood: 'subjuntivo', archaic: false },
  { id: 'imperfecto_subjuntivo', label: 'Imperfecto de subjuntivo', gloss: 'imperfect subjunctive', mood: 'subjuntivo', archaic: false },
  { id: 'perfecto_subjuntivo', label: 'Pretérito perfecto de subjuntivo', gloss: 'present perfect subjunctive', mood: 'subjuntivo', archaic: false },
  { id: 'pluscuamperfecto_subjuntivo', label: 'Pluscuamperfecto de subjuntivo', gloss: 'past perfect subjunctive', mood: 'subjuntivo', archaic: false },
  { id: 'futuro_subjuntivo', label: 'Futuro de subjuntivo', gloss: 'future subjunctive', mood: 'subjuntivo', archaic: true },
  { id: 'futuro_perfecto_subjuntivo', label: 'Futuro perfecto de subjuntivo', gloss: 'future perfect subjunctive', mood: 'subjuntivo', archaic: true },
  { id: 'imperativo_afirmativo', label: 'Imperativo afirmativo', gloss: 'affirmative imperative', mood: 'imperativo', archaic: false },
  { id: 'imperativo_negativo', label: 'Imperativo negativo', gloss: 'negative imperative', mood: 'imperativo', archaic: false },
]

export const MOOD_LABELS: Record<Mood, string> = {
  indicativo: 'Indicativo',
  subjuntivo: 'Subjuntivo',
  imperativo: 'Imperativo',
}

const TENSES_BY_ID = new Map<string, TenseInfo>(TENSES.map((tense) => [tense.id, tense]))

export function tenseById(id: string): TenseInfo | undefined {
  return TENSES_BY_ID.get(id)
}

export function isTenseId(id: string): id is TenseId {
  return TENSES_BY_ID.has(id)
}

/** Tenses the builder offers for the current archaic setting, in catalogue order. */
export function visibleTenses(archaicTenses: boolean): TenseInfo[] {
  return TENSES.filter((tense) => !tense.archaic || archaicTenses)
}

export interface TenseGroup {
  mood: Mood
  label: string
  tenses: TenseInfo[]
}

/** The builder's mood groups; archaic tenses are included only when the setting is on. */
export function tenseGroups(archaicTenses: boolean): TenseGroup[] {
  return MOODS.map((mood) => ({
    mood,
    label: MOOD_LABELS[mood],
    tenses: visibleTenses(archaicTenses).filter((tense) => tense.mood === mood),
  }))
}
