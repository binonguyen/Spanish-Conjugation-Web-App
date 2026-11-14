import { dataSources } from '../data/verbs'

/**
 * Attribution required by the data licences: Tatoeba (CC BY 2.0 FR), the
 * conjugation engine and the gloss source. Mounted from the Results footer
 * and, later, the Settings sheet.
 */
export function AboutPanel() {
  return (
    <section className="about" aria-label="About and data sources">
      <p>
        Example sentences come from{' '}
        <a href="https://tatoeba.org" target="_blank" rel="noreferrer">
          Tatoeba
        </a>{' '}
        and are licensed CC BY 2.0 FR. Every sentence is credited to its Tatoeba author wherever it appears.
      </p>
      <ul className="source-list">
        {dataSources.map((source) => (
          <li key={source.name}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.name}
            </a>
            <span className="muted source-meta">
              {source.use} · {source.license}
            </span>
          </li>
        ))}
      </ul>
      <p className="muted">
        Tables are generated at build time from these sources. The app runs entirely in your browser and stores
        progress locally.
      </p>
    </section>
  )
}
