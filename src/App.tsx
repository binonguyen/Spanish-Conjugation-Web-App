import { useEffect, useReducer, useRef, useState, type ReactElement } from 'react'
import { recordAnswers } from './app/recordAnswers'
import { SCREEN_LABELS, SCREENS, type Screen } from './app/screens'
import { settingsReducer, type SettingsAction } from './app/settings'
import { useLocalStore } from './app/useLocalStore'
import { SettingsSheet } from './components/SettingsSheet'
import { builderReducer, createBuilderState } from './domain/builder'
import { buildQueue } from './domain/draw'
import { createRng } from './domain/random'
import { drillReducer } from './domain/drill'
import type { SessionConfig } from './domain/session'
import { BuilderScreen } from './screens/BuilderScreen'
import { DrillScreen } from './screens/DrillScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { StatsScreen } from './screens/StatsScreen'
import type { LocalStore } from './store/store'
import { MESSAGES, type ProgressMap, type Settings } from './store/types'

export function App() {
  const { ready, store, settings, customVerbs, message } = useLocalStore()

  return (
    <div className="app">
      {ready ? (
        <Trainer
          store={store}
          initialSettings={settings}
          initialCustomVerbs={customVerbs}
          storageMessage={message}
        />
      ) : (
        <p className="status" role="status">
          Loading your settings…
        </p>
      )}
    </div>
  )
}

interface TrainerProps {
  store: LocalStore | null
  initialSettings: Settings
  initialCustomVerbs: string[]
  storageMessage?: string
}

function Trainer({ store, initialSettings, initialCustomVerbs, storageMessage }: TrainerProps) {
  const [screen, setScreen] = useState<Screen>('builder')
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null)
  const [drill, dispatchDrill] = useReducer(drillReducer, null)
  const [drillNotice, setDrillNotice] = useState<string | undefined>(undefined)
  const [settings, setSettings] = useState(initialSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSaveMessage, setSettingsSaveMessage] = useState<string | undefined>(undefined)
  /** The settings object the store already holds; the first visit does not need a write. */
  const savedSettings = useRef(initialSettings)
  /** How many answers have already reached the store; keeps the effect from writing twice. */
  const recorded = useRef(0)
  const [builder, dispatch] = useReducer(
    builderReducer,
    { settings: initialSettings, initialCustomVerbs },
    (seed) => createBuilderState(seed.settings, seed.initialCustomVerbs),
  )

  useEffect(() => {
    if (!store || settings === savedSettings.current) return

    let active = true
    void store.saveSettings(settings).then((result) => {
      if (!active) return
      if (result.ok) {
        savedSettings.current = settings
        setSettingsSaveMessage(undefined)
      } else {
        setSettingsSaveMessage(result.error.message)
      }
    })

    return () => {
      active = false
    }
  }, [settings, store])

  useEffect(() => {
    if (!drill) return

    const pending = drill.answers.slice(recorded.current)
    if (pending.length === 0) return
    recorded.current = drill.answers.length
    if (!store) return

    void recordAnswers(store, pending).then((messages) => {
      if (messages.length > 0) setDrillNotice(messages[0])
    })
  }, [drill, store])

  useEffect(() => {
    if (drill?.phase === 'finished') setScreen('results')
  }, [drill?.phase])

  function changeSettings(action: SettingsAction) {
    const next = settingsReducer(settings, action)
    if (next === settings) return

    setSettings(next)
    // Vosotros and the archaic offer shape the very next session, so the builder
    // mirrors them at once; length and tense defaults wait for the next app start.
    dispatch({ type: 'apply-settings', settings: next })
  }

  /** After an import or reset, the store holds the truth for settings and hand-added verbs. */
  async function refreshFromStore() {
    if (!store) return

    try {
      const [loadedSettings, loadedVerbs] = await Promise.all([
        store.getSettings(),
        store.getCustomVerbs(),
      ])
      savedSettings.current = loadedSettings
      setSettings(loadedSettings)
      dispatch({ type: 'rebuild', seed: loadedSettings, customVerbs: loadedVerbs })
      setSettingsSaveMessage(undefined)
    } catch {
      setSettingsSaveMessage(MESSAGES.unavailable)
    }
  }

  async function startSession(config: SessionConfig) {
    let progress: ProgressMap = {}
    let notice: string | undefined

    if (store) {
      try {
        progress = await store.getAllProgress()
      } catch {
        notice = MESSAGES.unavailable
      }
    }

    const items = buildQueue(
      config,
      progress,
      createRng(Math.floor(Math.random() * 0x100000000)),
    )

    recorded.current = 0
    setDrillNotice(notice)
    setSessionConfig(config)
    dispatchDrill({ type: 'start', items })
    setScreen('drill')
  }

  const views: Record<Screen, ReactElement> = {
    builder: (
      <BuilderScreen
        store={store}
        state={builder}
        dispatch={dispatch}
        storageMessage={settingsSaveMessage ?? storageMessage}
        onOpenSettings={() => setSettingsOpen(true)}
        onStart={startSession}
      />
    ),
    drill: (
      <DrillScreen
        state={drill}
        dispatch={dispatchDrill}
        vosotros={sessionConfig?.vosotros ?? false}
        notice={drillNotice}
        onOpenBuilder={() => setScreen('builder')}
      />
    ),
    results: (
      <ResultsScreen
        state={drill}
        onStartAnother={() => setScreen('builder')}
        onOpenDrill={() => setScreen('drill')}
        onOpenStats={() => setScreen('stats')}
      />
    ),
    stats: <StatsScreen store={store} onOpenBuilder={() => setScreen('builder')} />,
  }

  return (
    <>
      <header className="app-header">
        <h1>Conjugation Trainer</h1>
        <nav className="tabs" aria-label="Screens">
          {SCREENS.map((id) => (
            <button
              key={id}
              type="button"
              className="tab"
              aria-current={id === screen ? 'page' : undefined}
              onClick={() => setScreen(id)}
            >
              {SCREEN_LABELS[id]}
            </button>
          ))}
        </nav>
      </header>
      <main>{views[screen]}</main>
      {settingsOpen ? (
        <SettingsSheet
          settings={settings}
          store={store}
          storageMessage={storageMessage}
          saveMessage={settingsSaveMessage}
          onChange={changeSettings}
          onDataReplaced={refreshFromStore}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </>
  )
}
