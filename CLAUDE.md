# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Before opening a pull request

Run the full test suite and confirm all checks pass:

```sh
eldev --packaged --debug --trace --time compile --warnings-as-errors
eldev --debug --trace --time test
npm run lint
npm run check
npm test
```

These mirror the CI jobs defined in `.github/workflows/test.yaml`.

## Common commands

```sh
# Start frontend dev server (proxies API calls to a running Emacs httpd)
npm run dev

# Build frontend (output to packages/frontend/dist/)
npm run build

# Fix lint issues automatically
npm run lint:fix

# Run a single frontend test file
npx vitest run packages/frontend/test/path/to/file.test.ts

# Run a single Elisp test by name pattern
eldev test org-node-ui-lite--backlinks
```

## Architecture

The project has two independent layers that communicate over HTTP.

### Emacs Lisp backend (`org-node-ui-lite.el`)

A `simple-httpd` servlet that reads live data from `org-mem`/`org-node` and serves three JSON endpoints (see `openapi.yaml` for the schema):

- `GET /api/graph.json` — all nodes and edges
- `GET /api/node/:id.json` — single node with raw Org text and backlinks
- `GET /api/node/:id/:asset` — binary asset, with the filename Base64url-encoded in the path segment

The file also serves `packages/frontend/dist/` as the static root.  `org-node-ui-lite-mode` is a global minor mode that starts/stops the server and optionally triggers an `npm` build on first run if `dist/` is missing.

### React frontend (`packages/frontend/`)

Vite + React SPA.  Key modules:

- **`src/api/api.d.ts`** — TypeScript types auto-generated from `openapi.yaml` via `openapi-fetch`; do not edit by hand.
- **`src/store/`** — global UI state via React Context + `useReducer` (`reducer.ts` defines `UiState` and all actions).
- **`src/graph/`** — renderer-agnostic graph logic.  `graph.ts` drives draw/destroy; `graph-style.ts` handles highlight and theming; `graph/renderers/` contains three concrete adapters: `cytoscape.ts`, `force-graph.ts`, `force-graph-3d.ts`.
- **`src/hooks/useGraphManager.ts`** — wires the store state to the active renderer instance.
- **`src/utils/processor.ts`** — Org-to-React rendering pipeline: uniorg-parse → uniorg-rehype → rehype-mathjax / rehype-mermaid / rehype-pretty-code → rehype-react.

## Language

All deliverables must be written in English: commit messages, pull request titles and descriptions, and any other generated text artifacts.
