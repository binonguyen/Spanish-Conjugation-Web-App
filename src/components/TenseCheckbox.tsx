import type { TenseInfo } from '../domain/tenses'

interface TenseCheckboxProps {
  tense: TenseInfo
  checked: boolean
  disabled?: boolean
  onToggle(): void
}

/** One tense in a selectable list, labelled in Spanish with its English gloss. */
export function TenseCheckbox({ tense, checked, disabled, onToggle }: TenseCheckboxProps) {
  return (
    <label className={tense.archaic ? 'tense-option is-archaic' : 'tense-option'}>
      <input
        type="checkbox"
        aria-label={`${tense.label} (${tense.gloss})`}
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <span>{tense.label}</span>
      <span className="tense-gloss">{tense.gloss}</span>
    </label>
  )
}
