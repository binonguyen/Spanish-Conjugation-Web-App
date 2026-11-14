import { useEffect, useRef, type Dispatch, type KeyboardEvent } from 'react'
import type { Verdict } from '../domain/check'
import { currentVerdict, type DrillAction, type DrillState } from '../domain/drill'
import type { VocabularyItem } from '../domain/draw'
import { correctOption, type VocabularyOption } from '../domain/vocab'
import {
  advanceLabel,
  DrillHeader,
  ExampleSentenceBlock,
  ReviewBanner,
  useEndConfirmation,
} from './DrillChrome'

interface VocabularyDrillProps {
  item: VocabularyItem
  state: DrillState
  dispatch: Dispatch<DrillAction>
  notice?: string
}

export function VocabularyDrill({ item, state, dispatch, notice }: VocabularyDrillProps) {
  const end = useEndConfirmation(() => dispatch({ type: 'end' }))
  const firstOptionRef = useRef<HTMLButtonElement>(null)
  const advanceRef = useRef<HTMLButtonElement>(null)

  const revealed = state.phase === 'revealed'
  const verdict = currentVerdict(state)
  const correct = correctOption(item.options)
  const selected = item.options.find((option) => option.gloss === state.input)

  useEffect(() => {
    if (end.confirmingEnd) return
    if (revealed) advanceRef.current?.focus()
    else firstOptionRef.current?.focus()
  }, [end.confirmingEnd, revealed])

  function choose(option: VocabularyOption) {
    if (revealed) return

    dispatch({ type: 'input', value: option.gloss })
    dispatch({ type: 'submit' })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      if (end.confirmingEnd) {
        event.preventDefault()
        end.cancelEnd()
      }
      return
    }

    const command = event.ctrlKey || event.metaKey

    if (event.key === 'Enter') {
      // Enter advances a reveal and skips while asking; it must never answer the
      // focused first option by accident.
      event.preventDefault()
      if (revealed) dispatch({ type: 'advance' })
      else if (command) dispatch({ type: 'dont-know' })
      return
    }

    if (command || event.altKey || revealed) return

    if (!/^[1-9]$/.test(event.key)) return

    const option = item.options[Number(event.key) - 1]
    if (!option) return

    event.preventDefault()
    choose(option)
  }

  return (
    <section className="screen drill" onKeyDown={handleKeyDown}>
      <DrillHeader state={state} modeLabel="Vocabulary" notice={notice} end={end} />

      <ReviewBanner state={state} />

      <div className="drill-prompt">
        <p className="drill-verb">
          <span className="drill-infinitive" lang="es">
            {item.verb.infinitive}
          </span>
        </p>
        <p className="drill-meta">What does it mean?</p>
      </div>

      <div className="vocab-options" role="group" aria-label="Choose the English gloss">
        {item.options.map((option, index) => {
          const chosen = selected?.gloss === option.gloss
          const optionState = !revealed
            ? ''
            : option.correct
              ? ' is-correct'
              : chosen
                ? ' is-wrong'
                : ' is-dim'

          return (
            <button
              key={option.gloss}
              ref={index === 0 ? firstOptionRef : undefined}
              type="button"
              className={`vocab-option${optionState}`}
              aria-pressed={chosen}
              disabled={revealed}
              onClick={() => choose(option)}
            >
              <kbd className="vocab-key">{index + 1}</kbd>
              <span className="vocab-gloss" lang="en">
                {option.gloss}
              </span>
            </button>
          )
        })}
      </div>

      <p className="drill-hint">
        Press <kbd>1</kbd>–<kbd>{item.options.length}</kbd> or tap an answer.{' '}
        <kbd>Ctrl</kbd>+<kbd>Enter</kbd> is I don&apos;t know. <kbd>Enter</kbd> moves on after the
        reveal.
      </p>

      <div
        className={verdict ? `verdict is-${verdict}` : 'verdict'}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {revealed && verdict ? (
          <>
            <p className="verdict-headline">{verdict === 'correct' ? 'Correct' : 'Wrong'}</p>
            <p className="verdict-note">{verdictMessage(verdict, correct, selected)}</p>
          </>
        ) : null}
      </div>

      {revealed ? (
        <div className="drill-reveal">
          <p className="correct-gloss" lang="en">
            {correct?.gloss ?? '—'}
          </p>

          {item.verb.sentence ? <ExampleSentenceBlock sentence={item.verb.sentence} /> : null}

          <div className="reveal-actions">
            <button
              ref={advanceRef}
              type="button"
              className="start-button"
              onClick={() => dispatch({ type: 'advance' })}
            >
              {advanceLabel(state)}
              <kbd className="key-hint">Enter</kbd>
            </button>
          </div>
        </div>
      ) : (
        <div className="drill-actions">
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

function verdictMessage(
  verdict: Verdict,
  correct: VocabularyOption | undefined,
  selected: VocabularyOption | undefined,
): string {
  if (verdict === 'correct') return 'Well done.'
  if (!correct) return 'The correct gloss is shown below.'
  if (!selected) return `You skipped it. The correct gloss is “${correct.gloss}”.`

  return `“${selected.gloss}” is the gloss of ${selected.infinitive}. The correct gloss is “${correct.gloss}”.`
}
