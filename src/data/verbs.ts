import artifact from './verbs.json'

/** One Tatoeba pair, with the id and author needed to credit the Spanish sentence. */
export interface ExampleSentence {
  es: string
  en: string
  id: number
  author: string
}

export interface Verb {
  infinitive: string
  reflexive: boolean
  gloss: string
  tier: 1 | 2
  sentence?: ExampleSentence
  forms: Record<string, string[][]>
  nonFinite: { gerundio: string[]; participio: string[] }
}

export interface DataSource {
  name: string
  license: string
  url: string
  use: string
}

export interface VerbArtifact {
  generatedAt: string
  personOrder: { personal: string[]; imperative: string[] }
  tenses: string[]
  sources: DataSource[]
  verbs: Verb[]
  haber: Record<string, string[][]>
}

export const verbArtifact = artifact as VerbArtifact

/** Names, licences and links rendered by the About / data sources panel. */
export const dataSources: readonly DataSource[] = verbArtifact.sources
