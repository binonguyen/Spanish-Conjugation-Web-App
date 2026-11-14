# 12 — PWA, mobile and accessibility pass

Status: ready-for-agent
Type: task
Blocked by: 01, 06, 08, 09, 10, 11

## Context

The app should live on a phone home screen before any Android packaging. [ADR-0002](../../../docs/adr/0002-local-only-static-app.md) explains why the wrapper comes later.

## Scope

- `vite-plugin-pwa`: manifest (name, icons, theme colour, `display: standalone`), precache the build, work offline from a cold start.
- Install hint on the Builder, dismissible, shown once.
- Mobile layout review at 360 px: no horizontal scroll, tap targets ≥ 44 px, accent bar reachable without the input scrolling away, keyboard does not cover the verdict.
- Accessibility: keyboard-only session confirmed, `aria-live` verdicts, visible focus, labels on the accent buttons, contrast checked in both light and dark.
- Performance sanity: first load of the artifact under 200 KB gzip total, and a Lighthouse pass recorded in the issue comments.

## Done when

- Installed on an Android phone via Chrome, a full session completes in airplane mode, and progress is still there after closing the app.
