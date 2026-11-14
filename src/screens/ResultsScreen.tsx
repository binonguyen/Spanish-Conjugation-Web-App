import { AboutPanel } from '../components/AboutPanel'

export function ResultsScreen() {
  return (
    <section className="screen">
      <h2>Results</h2>
      <p>Score, accent-only count and the items missed in this session.</p>
      <footer className="screen-footer">
        <details className="about-disclosure">
          <summary>About / data sources</summary>
          <AboutPanel />
        </details>
      </footer>
    </section>
  )
}
