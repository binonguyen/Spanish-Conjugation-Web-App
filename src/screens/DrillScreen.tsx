import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
} from 'react'
import { ACCENT_BAR, applyDeadKey, insertAt, type DeadKey } from '../domain/accents'
import type { Verdict } from '../domain/check'
import {
  currentItem,
  currentVerdict,
  type DrillAction,
  type DrillState,
} from '../domain/drill'
import type { ConjugationItem } from '../domain/draw'
import { acceptedForms, paradigm } from '../domain/forms'
import { personLabel, subjectPronoun } from '../domain/session'
import { tenseById } from '../domain/tenses'
import {
  advanceLabel,
  DrillHeader,
  ExampleSentenceBlock,
  ReviewBanner,
  useEndConfirmation,
} from './DrillChrome'
import { VocabularyDrill } from './VocabularyDrill'

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
      <VocabularyDrill
        key={`${state.inReview ? 'review' : 'main'}-${state.index}`}
        item={item}
        state={state}
        dispatch={dispatch}
        notice={notice}
      />
    )
  }

  return (
    <ConjugationDrill
      key={`${state.inReview ? 'review' : 'main'}-${state.index}`}
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
  const end = useEndConfirmation(() => dispatch({ type: 'end' }))

  const revealed = state.phase === 'revealed'
  const verdict = currentVerdict(state)
  const accepted = acceptedForms(item.verb, item.tense, item.person)
  const rows = paradigm(item.verb, item.tense, vosotros)
  const sentence = item.verb.sentence
  const person = personLabel(item.tense, item.person)
  const subject = subjectPronoun(item.tense, item.person)

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
    if (!end.confirmingEnd) inputRef.current?.focus()
  }, [end.confirmingEnd])

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
    if (end.confirmingEnd) {
      event.preventDefault()
      end.cancelEnd()
    }
  }

  return (
    <section className="screen drill" onKeyDown={handleSectionKeyDown}>
      <DrillHeader
        state={state}
        modeLabel={tense ? tense.label : item.tense}
        notice={notice}
        end={end}
      />

      <ReviewBanner state={state} />

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
        </p>
      </div>

      <label className="field drill-answer">
        <span className="field-label">Your answer</span>
        <span className="answer-bar">
          <span className="answer-person" lang="es" aria-hidden="true">
            {subject}
          </span>
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
        </span>
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

          {sentence ? <ExampleSentenceBlock sentence={sentence} /> : null}

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
              {advanceLabel(state)}
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
