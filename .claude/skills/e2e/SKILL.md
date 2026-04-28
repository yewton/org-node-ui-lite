---
description: E2E test guide for org-node-ui-lite (Playwright + Emacs integration)
trigger: automatic
---

# /e2e — E2E test guide

## Run

```sh
npm run test:e2e          # Playwright + Emacs integration tests
```

Internally this is:
```sh
playwright test
```

In CI, the Chromium binary lives at `/opt/pw-browsers`.  Do not attempt to download a
different version; install the version that matches the already-present binary. Locally, `npm run test:e2e` will use your default Playwright browsers.

---

## Architecture

```
Playwright test
    │  page.goto("http://localhost:5173")
    ▼
Vite dev server  (port 5173)   ← started by webServer in playwright.config.ts
    │  /api/* → proxy
    ▼
Emacs HTTP server  (port 5174) ← started by globalSetup (e2e/global-setup.ts)
    │  org-mem scans e2e/fixtures/*.org
    ▼
org-node-ui-lite-mode API  (/api/graph.json, /api/node/:id.json)
```

Lifecycle:
1. `globalSetup` spawns `emacs --batch --load e2e/emacs-server.el`
2. Emacs loads packages from `.eldev/29.3/packages/`, sets `org-mem-watch-dirs`
   to `e2e/fixtures/`, enables `org-mem-updater-mode` + `org-node-cache-mode`
   (per the org-mem documented quickstart), then calls `httpd-start`
3. `globalSetup` polls `http://localhost:5174/api/graph.json` until ≥ 1 node
   is returned — this naturally waits for the async org-mem scan to finish
4. Playwright starts the Vite dev server; tests run
5. `globalTeardown` sends SIGTERM to Emacs

The `global-setup.ts` also creates a stub `packages/frontend/dist/index.html`
so `org-node-ui-lite-mode`'s dist-check passes (the actual frontend is served
by Vite, not Emacs, during tests).

---

## Adding or changing fixture nodes

Edit `e2e/fixtures/*.org`.  Standard org-id format:

```org
* Heading Title
:PROPERTIES:
:ID: some-unique-id
:END:

Content.  Links use the standard org-id syntax:

[[id:target-id][Target Title]]
```

Rules:
- Every heading that should appear as a graph node **must** have a `:ID:` property.
- Each `[[id:X][Y]]` link under a heading with ID `src` creates an edge `src → X`.
- To get exactly N edges in the API response, include exactly N such links across
  all fixture files — no extras in prose or examples.
- org-mem scans the directory recursively; adding a new `.org` file is enough.

---

## Debugging failures

| Symptom | Likely cause |
|---------|-------------|
| "did not become ready within 90s" | Emacs batch startup crashed — check `[emacs]` stderr in test output |
| `graph endpoint returns 30 nodes` fails | Fixture file has a heading without `:ID:`, or a duplicate ID |
| `graph endpoint returns 31 edges` fails | A fixture file has unintended `[[id:...]]` links in prose/examples |
| `node endpoint returns backlinks for X` fails | The source node's fixture file is missing the expected link |
| UI tests fail despite API passing | Vite proxy not running — check `npm run dev` output |
| Random `ECONNREFUSED` on API tests | Emacs background process likely received `SIGPIPE` or died. Ensure `global-setup.ts` uses `detached: true`, `stdio: "ignore"`, and `emacs.unref()`. |

To inspect what Emacs actually returns:
```sh
curl -s http://localhost:5174/api/graph.json | python3 -m json.tool | head -40
curl -s http://localhost:5174/api/node/math-linear-algebra.json | python3 -m json.tool
```
(Only works while an E2E test run is in progress, or if you manually start Emacs.)

---

## Do NOT

- Reach into `org-mem` / `el-job-ng` internals to implement waiting logic.
  The polling loop in `global-setup.ts` is the correct approach.
- Read org-mem source to understand the scan lifecycle before writing fixtures.
  The public API (`org-mem-watch-dirs`, `org-mem-updater-mode`) is sufficient.
