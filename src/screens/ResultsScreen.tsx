import { AboutPanel } from '../components/AboutPanel'
import { summarizeSession, type RoundSummary, type SessionSummary } from '../domain/aggregate'
import type { DrillState } from '../domain/drill'

interface ResultsScreenProps {
  /** The last drill, finished or still in progress. */
  state: DrillState | null
  onStartAnother(): void
  onOpenDrill(): void
  onOpenStats(): void
}

export function ResultsScreen({
  state,
  onStartAnother,
  onOpenDrill,
  onOpenStats,
}: ResultsScreenProps) {
  if (!state || state.items.length === 0) {
    return (
      <section className="screen results">
        <h2>Results</h2>
        <p>No session to report yet. Build one to see your score here.</p>
        <div className="result-actions">
          <button type="button" className="start-button" onClick={onStartAnother}>
            Build a session
          </button>
        </div>
        <ResultsFooter />
      </section>
    )
  }

  if (state.phase !== 'finished') {
    return (
      <section className="screen results">
        <h2>Results</h2>
        <p>This session is still in progress. Finish the drill to see its results.</p>
        <div className="result-actions">
          <button type="button" className="start-button" onClick={onOpenDrill}>
            Back to drill
          </button>
        </div>
        <ResultsFooter />
      </section>
    )
  }

  const summary = summarizeSession(state)

  return (
    <section className="screen results">
      <header className="results-header">
        <h2>Results</h2>
        <span className="results-mode">
          {summary.mode === 'vocabulary' ? 'Vocabulary check' : 'Conjugation drill'}
        </span>
      </header>

      <div className="results-score">
        {summary.main.answered === 0 ? (
          <p className="results-score-value">No answers</p>
        ) : (
          <>
            <p className="results-score-value">
              {summary.main.score} / {summary.main.total}
            </p>
            <p className="results-score-label">first-try score</p>
          </>
        )}
      </div>

      {summary.endedEarly ? (
        <p className="field-note">
          Ended early — {summary.main.answered} of {summary.main.total} main-round items{' '}
          {summary.main.answered === 1 ? 'was' : 'were'} answered. Unanswered items are not
          counted as correct.
        </p>
      ) : null}

      <RoundCounts summary={summary.main} mode={summary.mode} />

      {summary.mode === 'conjugation' && summary.byTense.length > 0 ? (
        <section className="result-block" aria-labelledby="results-by-tense">
          <h3 id="results-by-tense">By tense</h3>
          <div className="table-scroll">
            <table className="result-table">
              <thead>
                <tr>
                  <th scope="col">Tense</th>
                  <th scope="col">Score</th>
                  <th scope="col">Accent-only</th>
                  <th scope="col">Wrong</th>
                </tr>
              </thead>
              <tbody>
                {summary.byTense.map((tense) => (
                  <tr key={tense.tense}>
                    <th scope="row">
                      <span lang="es">{tense.label}</span>{' '}
                      <span className="tense-gloss">({tense.gloss})</span>
                    </th>
                    <td>{scoreText(tense.score, tense.total)}</td>
                    <td>{tense.accentOnly}</td>
                    <td>{tense.wrong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="result-block" aria-labelledby="results-review">
        <h3 id="results-review">Review round</h3>
        <ReviewOutcome summary={summary} />
      </section>

      <section className="result-block" aria-labelledby="results-missed">
        <h3 id="results-missed">Missed items</h3>
        {summary.missed.length === 0 ? (
          <p className="field-note">Nothing missed in the main round.</p>
        ) : (
          <ul className="missed-list">
            {summary.missed.map((miss) => (
              <li key={miss.key} className="missed-item">
                <span className="missed-prompt">
                  <span className="missed-infinitive" lang="es">
                    {miss.infinitive}
                  </span>
                  {miss.tenseLabel ? (
                    <span className="missed-meta">
                      {miss.tenseLabel}
                      {miss.personLabel ? ` · ${miss.personLabel}` : ''}
                    </span>
                  ) : null}
                </span>
                <span
                  className="missed-answer"
                  lang={miss.mode === 'conjugation' ? 'es' : 'en'}
                >
                  {miss.answer}
                </span>
                <span className={missTone(miss.correctedInReview, miss.verdict)}>
                  {miss.correctedInReview
                    ? 'Corrected in review'
                    : miss.verdict === 'accent-only'
                      ? 'Accent-only'
                      : 'Wrong'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="result-actions">
        <button type="button" className="start-button" onClick={onStartAnother}>
          Start another session
        </button>
        <button type="button" className="ghost-button" onClick={onOpenStats}>
          Open Stats
        </button>
      </div>

      <ResultsFooter />
    </section>
  )
}

function ResultsFooter() {
  return (
    <footer className="screen-footer">
      <details className="about-disclosure">
        <summary>About / data sources</summary>
        <AboutPanel />
      </details>
    </footer>
  )
}

function scoreText(score: number, total: number): string {
  return `${score} / ${total}`
}

function missTone(corrected: boolean, verdict: 'accent-only' | 'wrong'): string {
  if (corrected) return 'missed-badge is-corrected'
  return verdict === 'accent-only' ? 'missed-badge is-accent' : 'missed-badge is-wrong'
}

interface RoundCountsProps {
  summary: RoundSummary
  mode: SessionSummary['mode']
}

function RoundCounts({ summary, mode }: RoundCountsProps) {
  return (
    <dl className="result-counts">
      <div>
        <dt>{mode === 'vocabulary' ? 'Correct' : 'Exactly right'}</dt>
        <dd>{summary.exact}</dd>
      </div>
      {mode === 'conjugation' ? (
        <div>
          <dt>Accent-only</dt>
          <dd>{summary.accentOnly}</dd>
        </div>
      ) : null}
      <div>
        <dt>Wrong</dt>
        <dd>{summary.wrong}</dd>
      </div>
    </dl>
  )
}

function ReviewOutcome({ summary }: { summary: SessionSummary }) {
  const { review } = summary

  if (review.total === 0) {
    return (
      <p className="field-note">
        {summary.endedEarly
          ? 'No review round — you ended early with no misses.'
          : 'No review round — the main round was clear.'}
      </p>
    )
  }

  if (review.answered === 0) {
    return <p className="field-note">Review round skipped — you ended the session early.</p>
  }

  return (
    <div className="review-outcome">
      <p>
        <strong>
          {review.exact} of {review.total}
        </strong>{' '}
        missed {review.total === 1 ? 'item' : 'items'} corrected.
      </p>
      <p className="field-note">
        {review.exact} exactly right
        {summary.mode === 'conjugation' ? ` · ${review.accentOnly} accent-only` : ''} ·{' '}
        {review.wrong} still wrong
        {review.answered < review.total
          ? ` · review ended after ${review.answered} of ${review.total} items`
          : ''}
      </p>
    </div>
  )
}
