export const STORE_NAMES = {
  progress: 'progress',
  settings: 'settings',
  customVerbs: 'customVerbs',
} as const

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES]

const DATABASE_VERSION = 1

/** The browser database the app owns. */
export const DATABASE_NAME = 'conjugation-trainer'

/** The settings singleton lives under one fixed key inside its store. */
export const SETTINGS_KEY = 'settings'

/** Open (and create on first run) the three stores the app owns. */
export function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      for (const storeName of Object.values(STORE_NAMES)) {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName)
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
    request.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'))
  })
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}
