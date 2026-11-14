import { useState } from 'react'
import type { ExampleSentence } from '../data/verbs'
import {
  atRoundEnd,
  roundLength,
  startsReview,
  type DrillState,
} from '../domain/drill'

/** End-session confirmation state, shared by both drill modes. */
export interface EndConfirmation {
  confirmingEnd: boolean
  requestEnd(): void
  confirmEnd(): void
  cancelEnd(): void
}

/** Owns the two-step "End session" control so each drill screen only wires the action. */
export function useEndConfirmation(onEnd: () => void): EndConfirmation {
  const [confirmingEnd, setConfirmingEnd] = useState(false)

  return {
    confirmingEnd,
    requestEnd: () => setConfirmingEnd(true),
    confirmEnd: () => {
      setConfirmingEnd(false)
      onEnd()
    },
    cancelEnd: () => setConfirmingEnd(false),
  }
}

interface DrillHeaderProps {
  state: DrillState
  /** The tense name for a drill, or `Vocabulary` for a meaning check. */
  modeLabel: string
  notice?: string
  end: EndConfirmation
}

/** Shared drill header: progress within the round, mode label, and the end confirmation. */
export function DrillHeader({ state, modeLabel, notice, end }: DrillHeaderProps) {
  const roundTotal = roundLength(state)

  return (
    <header className="drill-header">
      <div className="drill-status">
        <p
          className="drill-progress"
          aria-label={
            state.inReview
              ? `Review item ${state.index + 1} of ${roundTotal}`
              : `Item ${state.index + 1} of ${state.items.length}`
          }
        >
          <span className="drill-count">
            {state.inReview
              ? `Review ${state.index + 1} / ${roundTotal}`
              : `${state.index + 1} / ${state.items.length}`}
          </span>
          <span className="drill-tense">{modeLabel}</span>
        </p>
        {notice ? (
          <p className="field-note" role="status">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="drill-end">
        {end.confirmingEnd ? (
          <div className="end-confirm" role="group" aria-label="End session">
            <p className="field-note">End this session now? Unanswered items are not counted.</p>
            <div className="end-actions">
              <button type="button" className="danger-button" onClick={end.confirmEnd}>
                End now
              </button>
              <button type="button" autoFocus onClick={end.cancelEnd}>
                Keep going
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="ghost-button" onClick={end.requestEnd}>
            End session
          </button>
        )}
      </div>
    </header>
  )
}

/** The note above a review item, saying that misses come back once more. */
export function ReviewBanner({ state }: { state: DrillState }) {
  if (!state.inReview) return null

  return (
    <p className="review-banner" role="status">
      Review round — {state.reviewItems.length}{' '}
      {state.reviewItems.length === 1 ? 'item comes' : 'items come'} back once more.
    </p>
  )
}

/** The Tatoeba pair shown on a reveal, with the credit ADR-0001 requires. */
export function ExampleSentenceBlock({ sentence }: { sentence: ExampleSentence }) {
  return (
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
  )
}

/** What the reveal's advance button says at this point in the round. */
export function advanceLabel(state: DrillState): string {
  if (startsReview(state)) return 'Start review'
  return atRoundEnd(state) ? 'See results' : 'Next item'
}
