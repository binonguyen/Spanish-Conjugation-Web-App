import type { Verdict } from '../domain/check'
import type { Verb } from '../data/verbs'
import { canonicalVerb, normalizeInfinitive, resolveVerbs } from './customVerbs'
import {
  DATABASE_NAME,
  openDatabase,
  requestResult,
  SETTINGS_KEY,
  STORE_NAMES,
  transactionDone,
  type StoreName,
} from './db'
import { parseExportText, saveExportFile, serializeExport } from './transfer'
import {
  APP_ID,
  defaultSettings,
  EXPORT_VERSION,
  fail,
  IMPORT_CONFIRMATION,
  MESSAGES,
  nextProgress,
  ok,
  parseSettings,
  RESET_CONFIRMATION,
  unknownVerbMessage,
  type ExportFile,
  type ImportSummary,
  type ProgressMap,
  type ProgressRecord,
  type Settings,
  type StoreResult,
} from './types'

export * from './types'

/** Turn a thrown IndexedDB write failure into a result the UI can show. */function asWriteFailure<T>(error: unknown): StoreResult<T> {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return fail('quota', MESSAGES.quota)
  }
  return fail('write-failed', MESSAGES.writeFailed)
}

export interface LocalStore {
  readonly name: string
  close(): void
  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<StoreResult<Settings>>
  getProgress(key: string): Promise<ProgressRecord | undefined>
  getAllProgress(): Promise<ProgressMap>
  recordVerdict(key: string, verdict: Verdict): Promise<StoreResult<ProgressRecord>>
  getCustomVerbs(): Promise<string[]>
  addCustomVerb(infinitive: string): Promise<StoreResult<string[]>>
  removeCustomVerb(infinitive: string): Promise<StoreResult<string[]>>
  resolveCustomVerbs(): Promise<Verb[]>
  exportJson(): Promise<StoreResult<string>>
  downloadExport(): Promise<StoreResult<string>>
  importJson(text: string, confirmation: string): Promise<StoreResult<ImportSummary>>
  resetAll(confirmation: string): Promise<StoreResult<void>>
}

/**
 * Open the local store. The IndexedDB database is the only persistence in the app;
 * callers hold one store for the page's lifetime. Opening is the one operation that
 * rejects: without a database there is no store to report against.
 */
export async function createStore(options: { name?: string } = {}): Promise<LocalStore> {
  const name = options.name ?? DATABASE_NAME
  const database = await openDatabase(name)

  function read<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
    const transaction = database.transaction(storeName, 'readonly')
    return requestResult(transaction.objectStore(storeName).get(key)) as Promise<T | undefined>
  }

  function readAll<T>(storeName: StoreName): Promise<T[]> {
    const transaction = database.transaction(storeName, 'readonly')
    return requestResult(transaction.objectStore(storeName).getAll()) as Promise<T[]>
  }

  async function write<T>(
    storeNames: StoreName[],
    run: (transaction: IDBTransaction) => T | Promise<T>,
  ): Promise<StoreResult<T>> {
    try {
      const transaction = database.transaction(storeNames, 'readwrite')
      const value = await run(transaction)
      await transactionDone(transaction)
      return ok(value)
    } catch (error) {
      return asWriteFailure<T>(error)
    }
  }

  async function loadSettings(): Promise<Settings> {
    return parseSettings(await read<Settings>(STORE_NAMES.settings, SETTINGS_KEY)) ?? defaultSettings()
  }

  async function loadProgress(): Promise<ProgressMap> {
    const transaction = database.transaction(STORE_NAMES.progress, 'readonly')
    const objectStore = transaction.objectStore(STORE_NAMES.progress)
    const [keys, records] = await Promise.all([
      requestResult(objectStore.getAllKeys()),
      requestResult(objectStore.getAll()) as Promise<ProgressRecord[]>,
    ])
    const progress: ProgressMap = {}

    keys.forEach((key, index) => {
      const record = records[index]
      if (typeof key === 'string' && record) progress[key] = record
    })

    return progress
  }

  async function buildExport(): Promise<StoreResult<ExportFile>> {
    try {
      const [settings, customVerbs, progress] = await Promise.all([
        loadSettings(),
        readAll<string>(STORE_NAMES.customVerbs),
        loadProgress(),
      ])

      return ok({
        app: APP_ID,
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        settings,
        customVerbs,
        progress,
      })
    } catch {
      return fail('unavailable', MESSAGES.unavailable)
    }
  }

  return {
    name,

    close() {
      database.close()
    },

    getSettings() {
      return loadSettings()
    },

    saveSettings(settings) {
      return write([STORE_NAMES.settings], (transaction) => {
        transaction.objectStore(STORE_NAMES.settings).put(settings, SETTINGS_KEY)
        return settings
      })
    },

    getProgress(key) {
      return read<ProgressRecord>(STORE_NAMES.progress, key)
    },

    getAllProgress() {
      return loadProgress()
    },

    recordVerdict(key, verdict) {
      return write([STORE_NAMES.progress], async (transaction) => {
        const progressStore = transaction.objectStore(STORE_NAMES.progress)
        const current = (await requestResult(progressStore.get(key))) as ProgressRecord | undefined
        const next = nextProgress(current, verdict)
        progressStore.put(next, key)
        return next
      })
    },

    getCustomVerbs() {
      return readAll<string>(STORE_NAMES.customVerbs)
    },

    addCustomVerb(infinitive) {
      const verb = canonicalVerb(infinitive)
      if (!verb) return Promise.resolve(fail<string[]>('unknown-verb', unknownVerbMessage(infinitive.trim())))

      return write([STORE_NAMES.customVerbs], (transaction) => {
        const customVerbStore = transaction.objectStore(STORE_NAMES.customVerbs)
        customVerbStore.put(verb.infinitive, verb.infinitive)
        return requestResult<string[]>(customVerbStore.getAll())
      })
    },

    removeCustomVerb(infinitive) {
      return write([STORE_NAMES.customVerbs], (transaction) => {
        const customVerbStore = transaction.objectStore(STORE_NAMES.customVerbs)
        customVerbStore.delete(normalizeInfinitive(infinitive))
        return requestResult<string[]>(customVerbStore.getAll())
      })
    },

    async resolveCustomVerbs() {
      return resolveVerbs(await readAll<string>(STORE_NAMES.customVerbs))
    },

    async exportJson() {
      const exported = await buildExport()
      if (!exported.ok) return exported
      return ok(serializeExport(exported.value))
    },

    async downloadExport() {
      if (typeof document === 'undefined') return fail('unavailable', MESSAGES.unavailable)

      const exported = await buildExport()
      if (!exported.ok) return exported
      return ok(saveExportFile(exported.value))
    },

    importJson(text, confirmation) {
      if (confirmation.normalize('NFC').trim().toLowerCase() !== IMPORT_CONFIRMATION) {
        return Promise.resolve(fail<ImportSummary>('unconfirmed', MESSAGES.unconfirmedImport))
      }

      const parsed = parseExportText(text)
      if (!parsed.ok) return Promise.resolve(parsed)

      const { settings, customVerbs, progress } = parsed.value

      return write(
        [STORE_NAMES.progress, STORE_NAMES.settings, STORE_NAMES.customVerbs],
        (transaction) => {
          const progressStore = transaction.objectStore(STORE_NAMES.progress)
          const settingsStore = transaction.objectStore(STORE_NAMES.settings)
          const customVerbStore = transaction.objectStore(STORE_NAMES.customVerbs)

          progressStore.clear()
          settingsStore.clear()
          customVerbStore.clear()

          for (const [key, record] of Object.entries(progress)) progressStore.put(record, key)
          settingsStore.put(settings, SETTINGS_KEY)
          for (const infinitive of customVerbs) customVerbStore.put(infinitive, infinitive)

          return { progress: Object.keys(progress).length, customVerbs: customVerbs.length }
        },
      )
    },

    resetAll(confirmation) {
      if (confirmation.normalize('NFC').trim().toLowerCase() !== RESET_CONFIRMATION) {
        return Promise.resolve(fail<void>('unconfirmed', MESSAGES.unconfirmed))
      }

      return write(
        [STORE_NAMES.progress, STORE_NAMES.settings, STORE_NAMES.customVerbs],
        (transaction) => {
          for (const storeName of Object.values(STORE_NAMES)) transaction.objectStore(storeName).clear()
        },
      )
    },
  }
}
