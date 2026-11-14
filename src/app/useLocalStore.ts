import { useEffect, useState } from 'react'
import { createStore, defaultSettings, MESSAGES, type LocalStore, type Settings } from '../store/store'

export interface LocalStoreState {
  store: LocalStore | null
  settings: Settings
  customVerbs: string[]
  /** Set when the browser could not give us a database; the app still runs in memory. */
  message?: string
  ready: boolean
}

function initialState(): LocalStoreState {
  return {
    store: null,
    settings: defaultSettings(),
    customVerbs: [],
    message: undefined,
    ready: false,
  }
}

/**
 * Open the one store the page owns and load what the builder starts from. A failure
 * falls back to the spec defaults so a first-time visitor can still start a session.
 */
export function useLocalStore(): LocalStoreState {
  const [state, setState] = useState<LocalStoreState>(initialState)

  useEffect(() => {
    let active = true
    let opened: LocalStore | null = null

    async function load() {
      try {
        const store = await createStore()
        opened = store
        const [settings, customVerbs] = await Promise.all([store.getSettings(), store.getCustomVerbs()])

        if (!active) {
          store.close()
          return
        }

        setState({ store, settings, customVerbs, message: undefined, ready: true })
      } catch {
        if (!active) return
        opened?.close()
        setState({ ...initialState(), ready: true, message: MESSAGES.unavailable })
      }
    }

    void load()

    return () => {
      active = false
      opened?.close()
    }
  }, [])

  return state
}
