import { MAX_SESSION_LENGTH, MIN_SESSION_LENGTH } from '../domain/session'

interface LengthStepperProps {
  value: number
  disabled?: boolean
  onChange(length: number): void
}

/** The 5–50 length control, shared by the builder and the saved defaults. */
export function LengthStepper({ value, disabled, onChange }: LengthStepperProps) {
  return (
    <div className="stepper">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= MIN_SESSION_LENGTH}
        aria-label="One fewer item"
      >
        −
      </button>
      <output className="stepper-value" aria-live="polite">
        {value} items
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= MAX_SESSION_LENGTH}
        aria-label="One more item"
      >
        +
      </button>
    </div>
  )
}
