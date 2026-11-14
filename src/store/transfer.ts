import {
  APP_ID,
  EXPORT_VERSION,
  fail,
  MESSAGES,
  newerVersionMessage,
  ok,
  parseSettings,
  type ExportFile,
  type ProgressMap,
  type ProgressRecord,
  type StoreResult,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function parseProgressRecord(value: unknown): ProgressRecord | undefined {
  if (!isRecord(value)) return undefined
  if (!isCount(value.attempts) || !isCount(value.wrong) || !isCount(value.accent)) return undefined

  return { attempts: value.attempts, wrong: value.wrong, accent: value.accent }
}

function parseProgress(value: unknown): ProgressMap | undefined {
  if (!isRecord(value)) return undefined

  const progress: ProgressMap = {}
  for (const [key, record] of Object.entries(value)) {
    const parsed = parseProgressRecord(record)
    if (!parsed || key.split('|').length !== 3) return undefined
    progress[key] = parsed
  }

  return progress
}

function parseCustomVerbs(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined

  const verbs: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item.trim() === '') return undefined
    verbs.push(item.normalize('NFC').trim().toLowerCase())
  }

  return [...new Set(verbs)]
}

/**
 * Validate an export before it touches the database: an import replaces everything, so
 * a file that is not ours, is newer, or is malformed must be refused entirely.
 */
export function parseExport(raw: unknown): StoreResult<ExportFile> {
  if (!isRecord(raw)) return fail('corrupted', MESSAGES.corrupted)
  if (raw.app !== APP_ID) return fail('wrong-app', MESSAGES.wrongApp)
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    return fail('corrupted', MESSAGES.corrupted)
  }
  if (raw.version > EXPORT_VERSION) return fail('newer-version', newerVersionMessage(raw.version))

  const settings = parseSettings(raw.settings)
  const customVerbs = parseCustomVerbs(raw.customVerbs)
  const progress = parseProgress(raw.progress)

  if (!settings || !customVerbs || !progress) return fail('corrupted', MESSAGES.corrupted)
  if (typeof raw.exportedAt !== 'string' || Number.isNaN(Date.parse(raw.exportedAt))) {
    return fail('corrupted', MESSAGES.corrupted)
  }

  return ok({
    app: APP_ID,
    version: raw.version,
    exportedAt: raw.exportedAt,
    settings,
    customVerbs,
    progress,
  })
}

export function parseExportText(text: string): StoreResult<ExportFile> {
  let raw: unknown

  try {
    raw = JSON.parse(text)
  } catch {
    return fail('corrupted', MESSAGES.corrupted)
  }

  return parseExport(raw)
}

export function serializeExport(file: ExportFile): string {
  return JSON.stringify(file, null, 2)
}

/** Hand a JSON string to the browser as a download; returns the file name written. */
export function downloadJson(file: ExportFile): string {
  const name = `conjugation-trainer-${file.exportedAt.slice(0, 10)}.json`
  const blob = new Blob([serializeExport(file)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = name
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Revoke on the next task so the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)

  return name
}
