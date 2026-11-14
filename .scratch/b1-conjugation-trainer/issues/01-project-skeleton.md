# 01 — Project skeleton, typecheck and deploy

Status: done
Type: task
Blocked by: None (can start immediately)

## Context

Greenfield. Spec: [spec.md](../spec.md). Stack is React + Vite + TypeScript per the spec's Platform section.

## Scope

- `npm init` a Vite React-TS app at the repo root; `typescript` `strict`, `noUncheckedIndexedAccess`.
- Vitest wired up with one trivial passing test so CI is green from the first commit.
- Scripts: `dev`, `build`, `preview`, `typecheck`, `test`.
- GitHub Actions: on push and PR run `npm ci`, `typecheck`, `test`, `build`; on `main` publish `dist/` to GitHub Pages.
- Vite `base` set to the repo path so asset URLs survive Pages.
- Placeholder app shell with the four screen states stubbed (Builder / Drill / Results / Stats) and no router.

## Done when

- A push to `main` publishes a page that loads and shows the stub shell.
- `npm run typecheck && npm run test && npm run build` passes locally on a clean clone.

## Notes

Do not add a router: the app is a single state machine, and client-side routes need a Pages 404 workaround we do not want to own.

## Comments

- Implemented. Vite 8 + React 19 + TS 7 (`strict`, `noUncheckedIndexedAccess`), Vitest with one passing test, scripts `dev`/`build`/`preview`/`typecheck`/`test`, `.github/workflows/ci.yml` (verify on push and PR, deploy `dist/` to Pages from `main`), `base` set to `/Spanish-Conjugation-Web-App/`, and a placeholder shell with Builder / Drill / Results / Stats stubs.
- Local branch renamed `master` → `main` to match the deploy gate. The remote still only has `master`, so the Pages job stays dormant until `main` is pushed.
- Remaining human step (not verifiable from the repo): push `main`, set the repo default branch to `main`, and set Settings → Pages → Source to "GitHub Actions".

