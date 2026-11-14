import { useState, type Dispatch, type FormEvent } from 'react'
import {
  sessionSummary,
  startBlockedReason,
  toSessionConfig,
  type BuilderAction,
  type BuilderState,
} from '../domain/builder'
import {
  MAX_SESSION_LENGTH,
  MIN_SESSION_LENGTH,
  isVerbTier,
  type SessionConfig,
} from '../domain/session'
import { tenseGroups, type TenseInfo } from '../domain/tenses'
import { poolSize, searchVerbs } from '../domain/verbPool'
import { canonicalVerb, normalizeInfinitive } from '../domain/verbs'
import type { LocalStore } from '../store/store'
import { MESSAGES } from '../store/types'

interface BuilderScreenProps {
  store: LocalStore | null
  state: BuilderState
  dispatch: Dispatch<BuilderAction>
  storageMessage?: string
  onStart(config: SessionConfig): void
}

export function BuilderScreen({
  store,
  state,
  dispatch,
  storageMessage,
  onStart,
}: BuilderScreenProps) {
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const groups = tenseGroups(state.archaicTenses)
  const suggestions = searchVerbs(query, state.customVerbs)
  const config = toSessionConfig(state)
  const verbCount = poolSize(state.verbTier, state.customVerbs)
  const summary = sessionSummary(config)
  const blocked = startBlockedReason(state)

  async function addVerb(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const typed = query.trim()
    if (!typed) return

    if (!store) {
      setFeedback(storageMessage ?? MESSAGES.unavailable)
      return
    }

    if (state.customVerbs.includes(normalizeInfinitive(typed))) {
      setFeedback('That verb is already in your list.')
      return
    }

    const result = await store.addCustomVerb(typed)
    if (!result.ok) {
      setFeedback(result.error.message)
      return
    }

    dispatch({ type: 'set-custom-verbs', customVerbs: result.value })
    setQuery('')
    setFeedback(null)
  }

  async function removeVerb(infinitive: string) {
    if (!store) {
      setFeedback(storageMessage ?? MESSAGES.unavailable)
      return
    }

    const result = await store.removeCustomVerb(infinitive)
    if (!result.ok) {
      setFeedback(result.error.message)
      return
    }

    dispatch({ type: 'set-custom-verbs', customVerbs: result.value })
    setFeedback(null)
  }

  function setTier(value: string) {
    const verbTier = value === 'all' ? 'all' : Number(value)
    if (isVerbTier(verbTier)) dispatch({ type: 'set-tier', verbTier })
  }

  function tenseOption(tense: TenseInfo) {
    return (
      <li key={tense.id}>
        <label className={tense.archaic ? 'tense-option is-archaic' : 'tense-option'}>
          <input
            type="checkbox"
            aria-label={`${tense.label} (${tense.gloss})`}
            checked={state.tenses.includes(tense.id)}
            onChange={() => dispatch({ type: 'toggle-tense', tense: tense.id })}
          />
          <span>{tense.label}</span>
          <span className="tense-gloss">{tense.gloss}</span>
        </label>
      </li>
    )
  }

  return (
    <section className="screen builder">
      <h2>Builder</h2>

      <fieldset className="field">
        <legend>Mode</legend>
        <div className="segmented">
          <button
            type="button"
            aria-pressed={state.mode === 'conjugation'}
            onClick={() => dispatch({ type: 'set-mode', mode: 'conjugation' })}
          >
            Conjugation
          </button>
          <button
            type="button"
            aria-pressed={state.mode === 'vocabulary'}
            onClick={() => dispatch({ type: 'set-mode', mode: 'vocabulary' })}
          >
            Vocabulary
          </button>
        </div>
        <p className="field-note">
          {state.mode === 'conjugation'
            ? 'Type one conjugated form at a time.'
            : 'Match each infinitive to its English gloss.'}
        </p>
      </fieldset>

      {state.mode === 'conjugation' ? (
        <fieldset className="field">
          <legend>Tenses</legend>
          <div className="tense-groups">
            {groups.map((group) => {
              const core = group.tenses.filter((tense) => !tense.archaic)
              const archaic = group.tenses.filter((tense) => tense.archaic)

              return (
                <section
                  key={group.mood}
                  className="tense-group"
                  aria-labelledby={`mood-${group.mood}`}
                >
                  <h3 id={`mood-${group.mood}`}>
                    {group.label} <span className="muted">({core.length})</span>
                  </h3>
                  <ul className="tense-list">{core.map(tenseOption)}</ul>
                  {archaic.length > 0 ? (
                    <div className="archaic-tenses">
                      <p className="archaic-label">Archaic / formal</p>
                      <ul className="tense-list">{archaic.map(tenseOption)}</ul>
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      <label className="field">
        <span className="field-label">Verb pool</span>
        <select value={String(state.verbTier)} onChange={(event) => setTier(event.currentTarget.value)}>
          <option value="1">Top 100</option>
          <option value="2">Top 500</option>
          <option value="all">All verbs</option>
        </select>
        <span className="field-note">
          {verbCount} verbs in this session&apos;s pool.
        </span>
      </label>

      <fieldset className="field">
        <legend>Search to add</legend>
        <form className="verb-search" onSubmit={addVerb}>
          <label htmlFor="verb-search-input">Add a verb by infinitive</label>
          <div className="verb-search-row">
            <input
              id="verb-search-input"
              list="verb-suggestions"
              aria-label="Add a verb by infinitive"
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value)
                setFeedback(null)
              }}
              placeholder="e.g. abrazar"
              autoComplete="off"
              spellCheck={false}
            />
            <datalist id="verb-suggestions">
              {suggestions.map((verb) => (
                <option key={verb.infinitive} value={verb.infinitive}>
                  {verb.gloss}
                </option>
              ))}
            </datalist>
            <button type="submit" disabled={!query.trim()}>
              Add
            </button>
          </div>
        </form>
        {feedback ? (
          <p className="field-error" role="status">
            {feedback}
          </p>
        ) : null}

        <h3>Your verbs</h3>
        {state.customVerbs.length === 0 ? (
          <p className="muted">No hand-added verbs yet.</p>
        ) : (
          <ul className="custom-verbs">
            {state.customVerbs.map((infinitive) => {
              const verb = canonicalVerb(infinitive)
              return (
                <li key={infinitive}>
                  <span>{infinitive}</span>
                  <span className="tense-gloss">{verb ? verb.gloss : 'not in this verb list'}</span>
                  <button
                    type="button"
                    onClick={() => removeVerb(infinitive)}
                    aria-label={`Remove ${infinitive}`}
                  >
                    Remove
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </fieldset>

      <fieldset className="field">
        <legend>Session length</legend>
        <div className="stepper">
          <button
            type="button"
            onClick={() => dispatch({ type: 'set-length', length: state.length - 1 })}
            disabled={state.length <= MIN_SESSION_LENGTH}
            aria-label="One fewer item"
          >
            −
          </button>
          <output className="stepper-value" aria-live="polite">
            {state.length} items
          </output>
          <button
            type="button"
            onClick={() => dispatch({ type: 'set-length', length: state.length + 1 })}
            disabled={state.length >= MAX_SESSION_LENGTH}
            aria-label="One more item"
          >
            +
          </button>
        </div>
      </fieldset>

      <footer className="builder-footer">
        <div className="builder-summary">
          <p className="session-summary" aria-live="polite">
            {summary}
          </p>
          {storageMessage ? (
            <p className="field-note" role="status">
              {storageMessage}
            </p>
          ) : null}
        </div>
        <div className="builder-start">
          <button
            type="button"
            className="start-button"
            disabled={blocked !== undefined}
            aria-describedby={blocked ? 'start-reason' : undefined}
            onClick={() => onStart(config)}
          >
            Start session
          </button>
          {blocked ? (
            <p id="start-reason" className="field-error">
              {blocked}
            </p>
          ) : null}
        </div>
      </footer>
    </section>
  )
}
