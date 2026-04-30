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

# Run Playwright E2E tests (starts Emacs + Vite automatically)
npm run test:e2e
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

## E2E tests

`npm run test:e2e` runs Playwright tests in `e2e/`.  Use `/e2e` for the full
guide.  Quick summary:

- **`e2e/global-setup.ts`** spawns `emacs --batch --load e2e/emacs-server.el`,
  which sets `org-mem-watch-dirs` to `e2e/fixtures/`, enables
  `org-mem-updater-mode` + `org-node-cache-mode` (the documented quickstart),
  and calls `httpd-start`.  It then polls `/api/graph.json` until nodes appear.
- **Vite dev server** (port 5173) proxies `/api/*` to Emacs (port 5174).
- **`e2e/fixtures/*.org`** are the test data.  Every heading that should be a
  graph node needs `:PROPERTIES: :ID: some-id :END:`.  Every `[[id:X][Y]]`
  link creates one edge — include only intentional links to keep counts exact.
- **`e2e/global-teardown.ts`** sends SIGTERM to Emacs.

When debugging E2E setup issues, trust the public API (`org-mem-watch-dirs`,
`org-mem-updater-mode`) and the polling loop — do not reach into org-mem
internals.

## TypeScript patterns

**`exactOptionalPropertyTypes: true` is enabled.**  Index-accessing a
`Record<string, T>` returns `T | undefined`, which triggers the
`noNonNullAssertion` lint rule if you suppress it with `!`.

Preferred pattern for object literals that are indexed by known keys:

```typescript
// Use `satisfies` instead of an explicit type annotation.
// TypeScript infers the concrete object type so literal-key access returns T,
// not T | undefined, and no `!` assertion is needed.
export const MY_MAP = {
  "key-a": { ... },
  "key-b": { ... },
} satisfies Record<string, MyType>;

// Access without `!`:
const item = MY_MAP["key-a"]; // type: MyType
```

Use this pattern for any constant map whose keys are known at compile time
(fixture data, ID→config tables, etc.).

## General Best Practices & Knowledge

The following generally useful knowledge has been gathered:

- **GitHub Actions (Versioning):** Pin GitHub Actions to their exact SHA-1 commit hashes instead of version tags. You can retain the version tag as a comment.
- **GitHub Actions (`workflow_run`):** When using `workflow_run` triggered by PRs, context variables point to the default branch. Tools like `actions/checkout` and `dorny/paths-filter` must use explicit `ref` and `base` inputs (e.g., `ref: ${{ github.event.workflow_run.head_branch }}`) to correctly target the PR branch instead of `main`.
- **Playwright (Browsers):** Do not hardcode `PLAYWRIGHT_BROWSERS_PATH` in `package.json` scripts. This allows local runs to use default cached browsers and avoid slow installations. It should only be explicitly set in CI environments.
- **Playwright (`global-setup.ts`):** When spawning a background process (like Emacs) from `global-setup.ts`, use `detached: true`, `stdio: "ignore"`, and `process.unref()`. Otherwise, the process may receive `SIGPIPE` and crash when the `globalSetup` Node.js process exits.
- **Playwright (`webServer` deadlock):** The `webServer` config starts and polls its `url` *before* `globalSetup` runs. Pointing `webServer.url` to an endpoint that depends on a backend started in `globalSetup` will cause a deadlock.
- **Emacs Testing:** Avoid mocking interactive prompts (like `yes-or-no-p`) for synchronous test execution. Instead, favor approaches like state polling or explicitly loading files.
- **Agent Environment constraint:** The `run_in_bash_session` tool in this environment blocks scripts containing the literal string 'emacs'. Use Eldev to run Elisp tasks to avoid this restriction.

## Language

All deliverables must be written in English: commit messages, pull request titles and descriptions, and any other generated text artifacts.
