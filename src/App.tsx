import { useState } from 'react'
import { SCREEN_LABELS, SCREENS, type Screen } from './app/screens'
import { BuilderScreen } from './screens/BuilderScreen'
import { DrillScreen } from './screens/DrillScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { StatsScreen } from './screens/StatsScreen'

function renderScreen(screen: Screen) {
  switch (screen) {
    case 'builder':
      return <BuilderScreen />
    case 'drill':
      return <DrillScreen />
    case 'results':
      return <ResultsScreen />
    case 'stats':
      return <StatsScreen />
  }
}

export function App() {
  const [screen, setScreen] = useState<Screen>('builder')

  return (
    <div className="app">
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
      <main>{renderScreen(screen)}</main>
    </div>
  )
}
