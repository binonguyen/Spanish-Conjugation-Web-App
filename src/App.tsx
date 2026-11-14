import { useReducer, useState, type ReactElement } from 'react'
import { SCREEN_LABELS, SCREENS, type Screen } from './app/screens'
import { useLocalStore } from './app/useLocalStore'
import { builderReducer, createBuilderState } from './domain/builder'
import type { SessionConfig } from './domain/session'
import { BuilderScreen } from './screens/BuilderScreen'
import { DrillScreen } from './screens/DrillScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { StatsScreen } from './screens/StatsScreen'
import type { LocalStore } from './store/store'
import type { Settings } from './store/types'

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
  const [session, setSession] = useState<SessionConfig | null>(null)
  const [builder, dispatch] = useReducer(
    builderReducer,
    { settings, initialCustomVerbs },
    (seed) => createBuilderState(seed.settings, seed.initialCustomVerbs),
  )

  function startSession(config: SessionConfig) {
    setSession(config)
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
    drill: <DrillScreen config={session} />,
    results: <ResultsScreen />,
    stats: <StatsScreen />,
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
