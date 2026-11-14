import { useEffect, useState } from 'react'
import { aggregateStats } from '../domain/aggregate'
import type { LocalStore } from '../store/store'
import { MESSAGES, type ProgressMap } from '../store/types'

interface StatsScreenProps {
  store: LocalStore | null
  onOpenBuilder(): void
}

export function StatsScreen({ store, onOpenBuilder }: StatsScreenProps) {
  const [progress, setProgress] = useState<ProgressMap | null>(null)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    let active = true

    if (!store) {
      setProgress(null)
      setError(MESSAGES.unavailable)
      return () => {
        active = false
      }
    }

    setProgress(null)
    setError(undefined)

    store
      .getAllProgress()
      .then((loaded) => {
        if (active) setProgress(loaded)
      })
      .catch(() => {
        if (active) setError(MESSAGES.unavailable)
      })

    return () => {
      active = false
    }
  }, [store])

  if (error) {
    return (
      <section className="screen stats">
        <h2>Stats</h2>
        <p className="field-error" role="status">
          {error}
        </p>
      </section>
    )
  }

  if (!progress) {
    return (
      <section className="screen stats">
        <h2>Stats</h2>
        <p className="status" role="status">
          Loading your history…
        </p>
      </section>
    )
  }

  const stats = aggregateStats(progress)

  if (!stats.hasHistory) {
    return (
      <section className="screen stats">
        <h2>Stats</h2>
        <div className="stats-empty">
          <p>No history yet.</p>
          <p className="field-note">
            Accuracy per tense, your accent-error rate and the verbs you miss most appear
            after your first session.
          </p>
          <button type="button" className="start-button" onClick={onOpenBuilder}>
            Build a session
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="screen stats">
      <header className="stats-header">
        <h2>Stats</h2>
        <span className="results-mode">Across all sessions on this device</span>
      </header>

      <dl className="result-counts">
        <div>
          <dt>Conjugation accuracy</dt>
          <dd>{stats.hasConjugation ? percent(stats.accuracy) : '—'}</dd>
        </div>
        <div>
          <dt>Accent-error rate</dt>
          <dd>{stats.hasConjugation ? percent(stats.accentRate, 1) : '—'}</dd>
        </div>
        <div>
          <dt>Vocabulary accuracy</dt>
          <dd>{stats.hasVocabulary ? percent(stats.vocabulary.accuracy) : 'No checks yet'}</dd>
        </div>
      </dl>

      <p className="field-note">
        {stats.hasConjugation
          ? `${stats.attempts} conjugation attempts · ${stats.wrong} wrong · ${stats.accent} accent-only. Accent-only answers count as correct for accuracy; the accent-error rate tracks them separately.`
          : 'No conjugation attempts yet.'}
        {stats.hasVocabulary
          ? ` ${stats.vocabulary.attempts} vocabulary checks · ${stats.vocabulary.wrong} wrong.`
          : ''}
      </p>

      <section className="result-block" aria-labelledby="stats-by-tense">
        <h3 id="stats-by-tense">Accuracy by tense</h3>
        {stats.byTense.length === 0 ? (
          <p className="field-note">No conjugation attempts yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="result-table">
              <thead>
                <tr>
                  <th scope="col">Tense</th>
                  <th scope="col">Accuracy</th>
                  <th scope="col">Attempts</th>
                  <th scope="col">Accent-only</th>
                </tr>
              </thead>
              <tbody>
                {stats.byTense.map((tense) => (
                  <tr key={tense.tense}>
                    <th scope="row">{tense.label}</th>
                    <td>{percent(tense.accuracy)}</td>
                    <td>{tense.attempts}</td>
                    <td>{tense.accent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="result-block" aria-labelledby="stats-most-missed">
        <h3 id="stats-most-missed">Most-missed verbs</h3>
        {stats.mostMissed.length === 0 ? (
          <p className="field-note">No missed verbs yet.</p>
        ) : (
          <ol className="most-missed">
            {stats.mostMissed.map((verb) => (
              <li key={verb.infinitive}>
                <span className="missed-infinitive" lang="es">
                  {verb.infinitive}
                </span>
                <span className="field-note">
                  {verb.misses} {verb.misses === 1 ? 'miss' : 'misses'} in {verb.attempts}{' '}
                  {verb.attempts === 1 ? 'attempt' : 'attempts'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="result-actions">
        <button type="button" className="start-button" onClick={onOpenBuilder}>
          Start a session
        </button>
      </div>
    </section>
  )
}

/** One decimal is enough for a rate that is usually small. */
function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`
}
