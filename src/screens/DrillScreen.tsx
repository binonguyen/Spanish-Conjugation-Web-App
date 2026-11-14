import type { SessionConfig } from '../domain/session'

interface DrillScreenProps {
  /** The config handed over by the builder; null when the Drill tab is opened directly. */
  config: SessionConfig | null
}

export function DrillScreen({ config }: DrillScreenProps) {
  return (
    <section className="screen">
      <h2>Drill</h2>
      <p>
        {config
          ? `Session ready: ${config.length} ${config.mode} items.`
          : 'One form at a time: read the prompt, type the answer, press Enter.'}
      </p>
    </section>
  )
}
