# Local-only, static: no accounts, no backend

All learner state lives in IndexedDB in the browser; the app is a static build deployed to GitHub Pages. There is no server, no login and no sync.

The alternative — accounts plus a backend — buys cross-device progress at the cost of auth, a database, a deployment surface and a privacy obligation, for a single learner who mostly drills in one place. The decision is recorded because it shapes everything downstream: the export/import file is the *only* way progress moves between devices, so it is a v1 feature rather than a nicety; and because the Android path (Capacitor wrapping the same WebView build) would be a rewrite if a server entered the picture.

## Consequences

- Progress does not follow the learner between the browser and an installed app; the JSON export is the bridge.
- Any future sync is a new capability, not a switch: it needs identity, conflict resolution for attempt counts, and a migration of local data.
- No server means no telemetry: bugs about wrong conjugation data are found by the build fixtures, not by observing users.
