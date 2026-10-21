# Telemetry-F1 Constitution

This constitution was written after the fact, from the code that already existed when Spec Driven Development was adopted. It records rules the codebase already follows plus the development process adopted from that point on; it does not describe aspirations.

## Core Principles

### I. The API owns the contract

The REST and WebSocket payloads are defined by the TelemetryF1_API repository. `src/types/ws.ts` and `src/types/rest.ts` are hand-maintained mirrors of that contract. A feature that depends on a contract change MUST reference the corresponding API spec, and the mirror MUST be updated in the same piece of work.

### II. Containers own state; components are presentational

Pages in `src/pages/` own hooks, data fetching and state. Components in `src/components/` receive data and callbacks through props and do not fetch. Shared live telemetry comes from a single `TelemetryProvider`.

### III. No state, chart or data-fetching libraries without a stated reason

State is React Context plus hooks, data fetching goes through `src/api/httpClient.ts` and `useFetch`, and charts are the in-house SVG `Chart`. Adding a library for any of these MUST be justified in the spec or plan.

### IV. Derive during render; side effects only on explicit action

Values that can be computed from props and state are derived during render instead of synchronised with effects. Actions with an external cost, such as requesting an AI coach analysis, run only on an explicit user action, never automatically.

### V. Design tokens only

Styling uses co-located CSS Modules. Colours come only from the custom properties in `src/styles/tokens.css`, including colours passed from TypeScript. The app has a single dark theme.

### VI. Honest UI and documentation

The UI shows "—" or an explicit state when data is missing instead of a fabricated value. Documentation MUST describe only behaviour that exists in the code; partial features are described as partial, with no invented metrics.

## Technology and Quality Constraints

- React, TypeScript in `strict` mode, Vite and React Router. Library versions live only in `package.json`, the single source: this constitution does not repeat library majors, so upgrading a dependency never makes it false. Node.js ≥ 22.17 for tooling (the first release with a stable `fs.globSync`, used by the test-discovery guard), with the major version pinned in `.nvmrc`.
- Tests use Node's built-in runner with `--experimental-strip-types` and cover pure functions. Test files import with relative paths including `.ts`, and every `*.test.ts` under `src/` is discovered automatically by the glob `src/**/*.test.ts` in the `test` script; no list of test files is kept by hand. New pure logic comes with unit tests.
- Identifiers, file names and commit messages are in English. UI text, error messages, test names and comments are in Portuguese (pt-BR). Comments are minimal and explain only a non-obvious *why*.
- Pages use default exports; components and hooks use named exports with an `interface XProps` for props.
- Secrets (`.env`) are never committed.

## Development Workflow

- New features follow Spec Driven Development: the spec, plan and tasks are committed before the implementation, in commits separate from the implementation. A correction commit may touch more than one of those artifacts.
- `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` pass before every commit. These are the same scripts the CI runs. A failure is reported, never committed around.
- Commits are small Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `ci:`) with no `Co-Authored-By` trailer.
- Known limitations are listed in both `CLAUDE.md` and `README.md`. The change that fixes a limitation removes it from both.
- Decisions with trade-offs are presented as options before being made.
- Published git history is never rewritten.

## Merge Gate

- `main` changes only through a pull request. A merge requires the CI checks `typecheck`, `lint`, `test` and `build` (`.github/workflows/ci.yml`) to pass on a branch that is up to date with `main`.
- `main` is protected as described in the README: pull request required, branch up to date, linear history, an empty bypass list, and "Rebase and merge" as the only merge method.
- The only exception is the README's last-resort procedure for a GitHub Actions outage, and every use of it is recorded in the pull request.

## Governance

This constitution takes precedence over other practices in this repository. `CLAUDE.md` holds the day-to-day operational guidance and must not contradict it. Where a feature spans both repositories, the API spec is authoritative for the contract and this repository's spec references it.

Amendments are made through a pull request that updates this file and states the reason. Versions follow semantic versioning: MAJOR for removing or redefining a principle, MINOR for adding a principle or section, PATCH for clarifications. Every plan produced with `/speckit-plan` includes a constitution check, and reviews verify compliance.

**Version**: 1.3.0 | **Ratified**: 2026-10-16 | **Last Amended**: 2026-10-21
