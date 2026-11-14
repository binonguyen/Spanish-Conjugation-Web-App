import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { SettingsAction } from '../app/settings'
import type { Mode } from '../domain/session'
import { tenseGroups } from '../domain/tenses'
import type { LocalStore } from '../store/store'
import {
  IMPORT_CONFIRMATION,
  MESSAGES,
  RESET_CONFIRMATION,
  type Settings,
} from '../store/types'
import { AboutPanel } from './AboutPanel'
import { LengthStepper } from './LengthStepper'
import { TenseCheckbox } from './TenseCheckbox'

interface SettingsSheetProps {
  settings: Settings
  store: LocalStore | null
  /** The database could not be opened; every data action is unavailable. */
  storageMessage?: string
  /** The last settings write failed; shown beside the preference it could not save. */
  saveMessage?: string
  onChange(action: SettingsAction): void
  /** Reload settings and hand-added verbs after an import or reset replaced the store. */
  onDataReplaced(): Promise<void>
  onClose(): void
}

interface PendingImport {
  name: string
  text: string
}

/**
 * Every saved preference and the data controls, in one sheet over the Builder. A
 * native dialog keeps the Builder mounted underneath and needs no route.
 */
export function SettingsSheet({
  settings,
  store,
  storageMessage,
  saveMessage,
  onChange,
  onDataReplaced,
  onClose,
}: SettingsSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [notice, setNotice] = useState<string | undefined>()
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [resetInput, setResetInput] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  function close() {
    dialogRef.current?.close()
  }

  async function exportProgress() {
    if (!store) {
      setNotice(storageMessage ?? MESSAGES.unavailable)
      return
    }

    setBusy(true)
    const result = await store.downloadExport()
    setBusy(false)
    setNotice(result.ok ? `Downloaded ${result.value}.` : result.error.message)
  }

  async function chooseImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    setNotice(undefined)
    try {
      const text = await file.text()
      setPendingImport({ name: file.name, text })
    } catch {
      setNotice('Could not read that file.')
    }
  }

  async function importProgress() {
    if (!store || !pendingImport) return

    setBusy(true)
    const result = await store.importJson(pendingImport.text, IMPORT_CONFIRMATION)
    if (!result.ok) {
      setBusy(false)
      setNotice(result.error.message)
      return
    }

    await onDataReplaced()
    setBusy(false)
    setPendingImport(null)
    setNotice(
      `Imported ${plural(result.value.progress, 'progress record', 'progress records')} and ${plural(
        result.value.customVerbs,
        'hand-added verb',
        'hand-added verbs',
      )}.`,
    )
  }

  const resetReady = resetInput.normalize('NFC').trim().toLowerCase() === RESET_CONFIRMATION

  async function resetEverything() {
    if (!store || !resetReady) return

    setBusy(true)
    const result = await store.resetAll(RESET_CONFIRMATION)
    if (!result.ok) {
      setBusy(false)
      setNotice(result.error.message)
      return
    }

    setResetInput('')
    await onDataReplaced()
    setBusy(false)
    setNotice('All progress, settings and hand-added verbs were reset.')
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings-sheet"
      aria-labelledby="settings-title"
      onClose={onClose}
    >
      <header className="sheet-header">
        <h2 id="settings-title">Settings</h2>
        <button type="button" className="ghost-button" onClick={close}>
          Close
        </button>
      </header>

      <div className="sheet-body">
        {storageMessage || saveMessage ? (
          <p className="field-error" role="status">
            {saveMessage ?? storageMessage}
          </p>
        ) : null}
        {notice ? (
          <p className="field-note" role="status">
            {notice}
          </p>
        ) : null}

        <fieldset className="field">
          <legend>Drill forms</legend>
          <label className="toggle-field">
            <input
              type="checkbox"
              aria-label="Include vosotros forms"
              checked={settings.vosotros}
              disabled={busy}
              onChange={() => onChange({ type: 'toggle-vosotros' })}
            />
            <span>
              <span className="toggle-label">Include vosotros forms</span>
              <span className="field-note toggle-note">
                Adds the vosotros person slot to every tense. Off by default; stored answers are kept
                either way.
              </span>
            </span>
          </label>
          <label className="toggle-field">
            <input
              type="checkbox"
              aria-label="Show archaic / formal tenses"
              checked={settings.archaicTenses}
              disabled={busy}
              onChange={() => onChange({ type: 'toggle-archaic' })}
            />
            <span>
              <span className="toggle-label">Show archaic / formal tenses</span>
              <span className="field-note toggle-note">
                Adds pretérito anterior, futuro de subjuntivo and futuro perfecto de subjuntivo to the
                builder. Off by default.
              </span>
            </span>
          </label>
        </fieldset>

        <fieldset className="field">
          <legend>Defaults for the next app start</legend>
          <p className="field-note">
            Saved now and used when the app loads. A reload keeps the current session&apos;s choices
            out of these defaults.
          </p>

          <div className="default-mode">
            <span className="field-label">Default mode</span>
            <div className="segmented" role="group" aria-label="Default mode">
              {(['conjugation', 'vocabulary'] as const).map((mode: Mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={settings.mode === mode}
                  disabled={busy}
                  onClick={() => onChange({ type: 'set-default-mode', mode })}
                >
                  {mode === 'conjugation' ? 'Conjugation' : 'Vocabulary'}
                </button>
              ))}
            </div>
          </div>

          <div className="default-length">
            <span className="field-label">Default session length</span>
            <LengthStepper
              value={settings.sessionLength}
              disabled={busy}
              onChange={(length) => onChange({ type: 'set-session-length', length })}
            />
          </div>

          <div className="tense-groups">
            {tenseGroups(settings.archaicTenses).map((group) => (
              <section key={group.mood} className="tense-group">
                <h3>{group.label}</h3>
                <ul className="tense-list">
                  {group.tenses.map((tense) => (
                    <li key={tense.id}>
                      <TenseCheckbox
                        tense={tense}
                        checked={settings.defaultTenses.includes(tense.id)}
                        disabled={busy}
                        onToggle={() =>
                          onChange({ type: 'toggle-default-tense', tense: tense.id })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Progress data</legend>
          <p className="field-note">
            Progress lives only in this browser. Export it as a JSON file to keep a copy or move to
            another device.
          </p>

          <div className="data-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => void exportProgress()}
              disabled={!store || busy}
            >
              Export progress
            </button>
          </div>

          <label className="file-field">
            <span className="field-label">Import a progress file</span>
            <input
              type="file"
              aria-label="Import a progress file"
              accept="application/json,.json"
              onChange={(event) => void chooseImport(event)}
              disabled={!store || busy}
            />
          </label>

          {pendingImport ? (
            <div className="import-confirm">
              <p>
                Importing <strong>{pendingImport.name}</strong> replaces all progress, settings and
                hand-added verbs. This cannot be merged.
              </p>
              <div className="data-actions">
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => void importProgress()}
                  disabled={busy}
                >
                  Replace everything
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setPendingImport(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="reset-block">
            <label htmlFor="reset-confirmation">
              Reset everything: type <code>reset</code> to confirm
            </label>
            <div className="verb-search-row">
              <input
                id="reset-confirmation"
                aria-label={`Type ${RESET_CONFIRMATION} to confirm a reset`}
                value={resetInput}
                onChange={(event) => setResetInput(event.currentTarget.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
              />
              <button
                type="button"
                className="danger-button"
                onClick={() => void resetEverything()}
                disabled={!resetReady || !store || busy}
              >
                Reset
              </button>
            </div>
          </div>

          {!store ? (
            <p className="field-note">
              {storageMessage ?? 'Data actions need the local database.'}
            </p>
          ) : null}
        </fieldset>

        <details className="about-disclosure">
          <summary>About / data sources</summary>
          <AboutPanel />
        </details>
      </div>
    </dialog>
  )
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}
