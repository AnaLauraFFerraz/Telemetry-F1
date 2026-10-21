# Telemetry-F1

React frontend for F1 24 telemetry: live dashboard over WebSocket, session history, two-lap comparative analysis with a hand-built SVG chart engine, track map and an AI coach panel. It depends on the backend repo [TelemetryF1_API](https://github.com/AnaLauraFFerraz/TelemetryF1_API), which must be running (WebSocket + REST).

## Stack

- React 18.3 + TypeScript 5.6 (`strict`) + Vite 5.4 + React Router 6
- CSS Modules + global design tokens (`src/styles/tokens.css`), single dark theme
- No state, chart, data-fetching or UI libraries: React Context + hooks, custom `useFetch`, custom SVG `Chart`
- Tests: Node's built-in runner with `--experimental-strip-types` (Node ≥ 22.17)

Node is installed through **fnm** on the dev machine; make sure it is on `PATH` before running npm. The Node major comes from `.nvmrc`.

## Commands

```bash
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run typecheck  # type-check only (src/, tools/ and vite.config.ts), no bundle
npm test          # runs the test-discovery guard, then node --experimental-strip-types --test "src/**/*.test.ts"
npm run preview   # serve the production build
```

Configuration comes from `.env` (copy `.env.example`): `VITE_WS_URL` and `VITE_HTTP_API_URL`, both required. `src/config/env.ts` throws at module load if one is missing, which happens before React renders, so the result is a blank page (the ErrorBoundary cannot catch it).

## Architecture

`App` = `ErrorBoundary` → `TelemetryProvider` (one shared WebSocket) → router.

| Path | Responsibility |
|---|---|
| `src/config/` | Env loading |
| `src/context/` | `TelemetryProvider` (WebSocket, reconnection, extracts the player's car), `useTelemetry` |
| `src/api/` | `httpClient` (`ApiError`, `httpGet`, `httpPost`), `sessionsApi`, generic `useFetch`, thin per-endpoint hooks, manual-trigger `useCoachAnalysis` |
| `src/pages/` | Containers: own hooks and state, compose components (`dashboard`, `sessionHistory`, `sessionAnalysis`, `settings`, `notFound`) |
| `src/components/` | Presentational: data and callbacks via props, no fetching (`chart`, `coach`, `hero`, `gforce`, `tyres`, `laps`, `sessions`, `connection`, `ErrorBoundary`) |
| `src/types/` | `ws.ts` and `rest.ts`, hand-mirrored from the API |
| `src/utils/` | Pure helpers (formatting, best lap, coach opportunities) |
| `src/styles/` | `tokens.css` and `global.css` |
| `tools/` | Test-discovery guard run by `pretest` |

The API repo owns the REST/WebSocket contract. `src/types/` is a manual copy: when the API changes a payload, update the mirror in the same piece of work. Some UI logic matches API strings literally (e.g. `"session not found"`).

## Conventions

- Identifiers, file names and commit messages in **English**. UI text, error messages, test names and comments in **Portuguese (pt-BR)**.
- **Comments: minimal.** Only where the *why* is not obvious. Do not narrate what the code does. Do not rewrite existing comments as a side effect of other work.
- Pages use default exports; components and hooks use named exports. Props are typed with an `interface XProps`.
- Styling: co-located `X.module.css`; colours only through tokens (`var(--token)`), including colours passed from TS.
- Derive values during render instead of syncing them with effects (see the stale-result logic in `SessionAnalysisPage` / `CoachPanel`).
- Coaching is a paid API call on a server cache miss: it only runs on explicit user action, never automatically.
- Tests cover pure functions only. Test files import with relative paths **including `.ts`** (Node cannot resolve the `@/` alias); a module under test may use `@/` only for type-only imports. Any `*.test.ts` under `src/` is discovered automatically.
- Commits: small, Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), English subject, **no `Co-Authored-By` trailer**.

## Rules

- Never commit secrets (`.env` is gitignored via `*.env`; `.env.example` is tracked).
- Run `npm test`, `npm run lint` and `npm run build` before every commit; report any failure instead of committing around it.
- Documentation must describe only what exists in the code. Partial features are described as partial; no invented metrics or results.
- Never rewrite published git history.
- New features follow Spec Driven Development: spec, plan and tasks are committed before the implementation.

## Spec Driven Development

Spec Kit 1.2.0 (Claude Code integration, PowerShell scripts). The constitution is `.specify/memory/constitution.md`; read it before planning.

- Flow: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → (`/speckit-analyze`) → `/speckit-implement` → `/speckit-converge`.
- Each feature lives in `specs/NNN-short-name/` (`spec.md`, `plan.md`, `tasks.md`, ...). Commit those artifacts (`docs:`) before any implementation commit.
- The API repo owns the REST/WebSocket contract. A feature that depends on a contract change references the API spec instead of redefining the contract here.
- The project existed before SDD was adopted; only features from `specs/001` onward were built this way.

## Known pitfalls

These are also listed under "Known limitations" in the README. When a limitation is fixed, remove it from both this file and the README in the same PR.

- Open the app at `http://localhost:5173`. The dev server may bind only to the IPv6 loopback, in which case `http://127.0.0.1:5173` shows nothing.
- Reconnection is exponential backoff `min(1000 * 2^attempt, 15000)` ms, retried forever. There is no client-side heartbeat, and the `disconnected` state is never set.
- The chart crosshair/tooltip is mouse-only.
- The primary lap is always the most recent one; only the comparison lap is selectable.
- Dashboard tyre colours (`components/tyres/tyreColor.ts`) use 70–110 °C, while the API's analysis uses 85–105 °C.
- A missing `VITE_*` variable throws at module load, before React renders: blank page.
- Without the backend's `ANTHROPIC_API_KEY`, the coach panel shows the 503 message.

## How to work in this repo

- Audit the relevant code and present a plan before changing files; wait for approval.
- One phase at a time; at the end, summarize what changed and what needs review.
- When a decision has a trade-off, present the options instead of deciding alone.
- If a request conflicts with what the code actually does, say so before proceeding.
- Only commit as part of an approved plan or when asked; never push without explicit approval.
