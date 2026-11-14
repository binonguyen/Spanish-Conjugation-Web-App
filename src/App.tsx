import { useEffect, useReducer, useRef, useState, type ReactElement } from 'react'
import { recordAnswers } from './app/recordAnswers'
import { SCREEN_LABELS, SCREENS, type Screen } from './app/screens'
import { useLocalStore } from './app/useLocalStore'
import { builderReducer, createBuilderState } from './domain/builder'
import { buildQueue, createRng } from './domain/draw'
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
          settings={settings}
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
  settings: Settings
  initialCustomVerbs: string[]
  storageMessage?: string
}

function Trainer({ store, settings, initialCustomVerbs, storageMessage }: TrainerProps) {
  const [screen, setScreen] = useState<Screen>('builder')
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null)
  const [drill, dispatchDrill] = useReducer(drillReducer, null)
  const [drillNotice, setDrillNotice] = useState<string | undefined>(undefined)
  /** How many answers have already reached the store; keeps the effect from writing twice. */
  const recorded = useRef(0)
  const [builder, dispatch] = useReducer(
    builderReducer,
    { settings, initialCustomVerbs },
    (seed) => createBuilderState(seed.settings, seed.initialCustomVerbs),
  )

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
        storageMessage={storageMessage}
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
    </>
  )
}
