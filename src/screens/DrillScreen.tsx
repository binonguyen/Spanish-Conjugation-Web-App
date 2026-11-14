import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
} from 'react'
import { ACCENT_BAR, applyDeadKey, insertAt, type DeadKey } from '../domain/accents'
import type { Verdict } from '../domain/check'
import { currentItem, currentVerdict, type DrillAction, type DrillState } from '../domain/drill'
import type { ConjugationItem } from '../domain/draw'
import { acceptedForms, paradigm } from '../domain/forms'
import { personLabel } from '../domain/session'
import { tenseById } from '../domain/tenses'

interface DrillScreenProps {
  /** The session being drilled; null until the builder starts one. */
  state: DrillState | null
  dispatch: Dispatch<DrillAction>
  /** Whether the session includes the vosotros slot, so the table matches the drills. */
  vosotros: boolean
  /** A store read or write failed; shown without interrupting the drill. */
  notice?: string
  onOpenBuilder(): void
}

export function DrillScreen({
  state,
  dispatch,
  vosotros,
  notice,
  onOpenBuilder,
}: DrillScreenProps) {
  const item = state ? currentItem(state) : undefined

  if (!state || !item) {
    return (
      <DrillPlaceholder
        title="Drill"
        text="Build a session to start drilling."
        actionLabel="Go to Builder"
        onAction={onOpenBuilder}
      />
    )
  }

  if (state.phase === 'finished') {
    return (
      <DrillPlaceholder
        title="Session complete"
        text="Your answers are saved."
        actionLabel="Start another session"
        onAction={onOpenBuilder}
      />
    )
  }

  if (item.mode === 'vocabulary') {
    return (
      <DrillPlaceholder
        title="Vocabulary check"
        text="Vocabulary checks are not available yet. Switch to Conjugation mode to drill forms."
        actionLabel="Go to Builder"
        onAction={onOpenBuilder}
      />
    )
  }

  return (
    <ConjugationDrill
      key={state.index}
      item={item}
      state={state}
      dispatch={dispatch}
      vosotros={vosotros}
      notice={notice}
    />
  )
}

interface DrillPlaceholderProps {
  title: string
  text: string
  actionLabel: string
  onAction(): void
}

function DrillPlaceholder({ title, text, actionLabel, onAction }: DrillPlaceholderProps) {
  return (
    <section className="screen drill">
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="drill-actions">
        <button type="button" className="start-button" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </section>
  )
}

interface ConjugationDrillProps {
  item: ConjugationItem
  state: DrillState
  dispatch: Dispatch<DrillAction>
  vosotros: boolean
  notice?: string
}

function ConjugationDrill({
  item,
  state,
  dispatch,
  vosotros,
  notice,
}: ConjugationDrillProps) {
  const tense = tenseById(item.tense)
  const inputRef = useRef<HTMLInputElement>(null)
  /** Set by an accent or dead-key insert, applied once React has painted the new value. */
  const pendingCaret = useRef<number | null>(null)
  const [deadKey, setDeadKey] = useState<DeadKey | null>(null)
  const [confirmingEnd, setConfirmingEnd] = useState(false)

  const revealed = state.phase === 'revealed'
  const verdict = currentVerdict(state)
  const accepted = acceptedForms(item.verb, item.tense, item.person)
  const rows = paradigm(item.verb, item.tense, vosotros)
  const sentence = item.verb.sentence
  const lastItem = state.index >= state.items.length - 1
  const person = personLabel(item.tense, item.person)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    if (pendingCaret.current !== null) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }
    input.focus()
  }, [state.input])

  // Cancel a confirmation without losing the caret: the button that had focus is gone.
  useEffect(() => {
    if (!confirmingEnd) inputRef.current?.focus()
  }, [confirmingEnd])

  function insert(text: string) {
    const input = inputRef.current
    const start = input?.selectionStart ?? state.input.length
    const end = input?.selectionEnd ?? start
    const next = insertAt(state.input, start, end, text)

    setDeadKey(null)
    pendingCaret.current = next.caret
    dispatch({ type: 'input', value: next.value })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setDeadKey(null)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      setDeadKey(null)

      if (event.ctrlKey || event.metaKey) {
        if (!revealed) dispatch({ type: 'dont-know' })
        return
      }

      if (revealed) dispatch({ type: 'advance' })
      else dispatch({ type: 'submit' })
      return
    }

    if (deadKey && event.key === 'Backspace') {
      event.preventDefault()
      setDeadKey(null)
      return
    }

    // A pending mark must never swallow a browser or OS chord.
    if (event.ctrlKey || event.metaKey || event.altKey) return

    const step = applyDeadKey(deadKey, event.key)
    if (!step) return

    event.preventDefault()
    setDeadKey(step.pending)
    if (step.insert) insert(step.insert)
  }

  function handleSectionKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return

    setDeadKey(null)
    if (confirmingEnd) {
      event.preventDefault()
      setConfirmingEnd(false)
    }
  }

  return (
    <section className="screen drill" onKeyDown={handleSectionKeyDown}>
      <header className="drill-header">
        <div className="drill-status">
          <p className="drill-progress" aria-label={`Item ${state.index + 1} of ${state.items.length}`}>
            <span className="drill-count">
              {state.index + 1} / {state.items.length}
            </span>
            <span className="drill-tense">{tense ? tense.label : item.tense}</span>
          </p>
          {notice ? (
            <p className="field-note" role="status">
              {notice}
            </p>
          ) : null}
        </div>

        <div className="drill-end">
          {confirmingEnd ? (
            <div className="end-confirm" role="group" aria-label="End session">
              <p className="field-note">End this session now? Unanswered items are not counted.</p>
              <div className="end-actions">
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => dispatch({ type: 'end' })}
                >
                  End now
                </button>
                <button type="button" autoFocus onClick={() => setConfirmingEnd(false)}>
                  Keep going
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="ghost-button" onClick={() => setConfirmingEnd(true)}>
              End session
            </button>
          )}
        </div>
      </header>

      <div className="drill-prompt">
        <p className="drill-verb">
          <span className="drill-infinitive" lang="es">
            {item.verb.infinitive}
          </span>{' '}
          <span className="drill-gloss">{item.verb.gloss}</span>
        </p>
        <p className="drill-meta">
          <span lang="es">{tense ? tense.label : item.tense}</span>
          {tense ? <span className="tense-gloss"> ({tense.gloss})</span> : null}
          <span aria-hidden="true"> · </span>
          <span>{person}</span>
        </p>
      </div>

      <label className="field drill-answer">
        <span className="field-label">Your answer</span>
        <input
          ref={inputRef}
          className={verdict ? `answer-input is-${verdict}` : 'answer-input'}
          value={state.input}
          onChange={(event) => dispatch({ type: 'input', value: event.currentTarget.value })}
          onKeyDown={handleKeyDown}
          onBlur={() => setDeadKey(null)}
          readOnly={revealed}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-label={`The ${person} form of ${item.verb.infinitive} in ${tense ? tense.label : item.tense}`}
        />
      </label>

      <div className="accent-bar" role="group" aria-label="Accent characters">
        {ACCENT_BAR.map((character) => (
          <button
            key={character}
            type="button"
            className="accent-key"
            aria-label={`Insert ${character}`}
            disabled={revealed}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insert(character)}
          >
            {character}
          </button>
        ))}
      </div>

      <p className="drill-hint">
        Keyboard accents: type <kbd>&apos;</kbd> then a vowel for á é í ó ú, <kbd>&quot;</kbd> then
        u for ü, <kbd>~</kbd> then n for ñ. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> is I don&apos;t know.
      </p>

      <div
        className={verdict ? `verdict is-${verdict}` : 'verdict'}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {revealed && verdict ? (
          <>
            <p className="verdict-headline">
              {verdict === 'correct'
                ? 'Correct'
                : verdict === 'accent-only'
                  ? 'Accent-only'
                  : 'Wrong'}
            </p>
            <p className="verdict-note">{verdictMessage(verdict, accepted, state.input)}</p>
          </>
        ) : null}
      </div>

      {revealed ? (
        <div className="drill-reveal">
          <p className="correct-form" lang="es">
            {accepted[0] ?? '—'}
          </p>
          {accepted.length > 1 ? (
            <p className="variant-note">
              Accepted: <span lang="es">{accepted.join(' / ')}</span>
            </p>
          ) : null}

          {sentence ? (
            <figure className="example">
              <blockquote lang="es">{sentence.es}</blockquote>
              <figcaption>
                <span lang="en">{sentence.en}</span>
                <span className="sentence-credit">
                  <a
                    href={`https://tatoeba.org/en/sentences/show/${sentence.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Tatoeba #{sentence.id}
                  </a>{' '}
                  · {sentence.author}
                </span>
              </figcaption>
            </figure>
          ) : null}

          <details className="paradigm">
            <summary>Show table</summary>
            <table>
              <caption>
                {item.verb.infinitive} · {tense ? tense.label : item.tense}
              </caption>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.person}
                    className={row.person === item.person ? 'is-current' : undefined}
                    aria-current={row.person === item.person ? 'true' : undefined}
                  >
                    <th scope="row">{row.label}</th>
                    <td lang="es">{row.forms.join(' / ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          <div className="reveal-actions">
            <button type="button" className="start-button" onClick={() => dispatch({ type: 'advance' })}>
              {lastItem ? 'See results' : 'Next item'}
              <kbd className="key-hint">Enter</kbd>
            </button>
          </div>
        </div>
      ) : (
        <div className="drill-actions">
          <button
            type="button"
            className="start-button"
            onClick={() => dispatch({ type: 'submit' })}
            disabled={state.input.trim() === ''}
          >
            Check
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => dispatch({ type: 'dont-know' })}
          >
            I don&apos;t know
          </button>
        </div>
      )}
    </section>
  )
}

function verdictMessage(verdict: Verdict, accepted: readonly string[], input: string): string {
  if (verdict === 'correct') return 'Well done.'
  if (verdict === 'accent-only') {
    return 'Marca de acento — the form is right; only the accent mark is missing.'
  }

  const correct = accepted[0]
  if (!correct) return 'The correct form is shown below.'
  return input.trim() === ''
    ? `You skipped it. The correct form is ${correct}.`
    : `The correct form is ${correct}.`
}
