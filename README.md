# org-node-ui

A self-contained graph viewer for [org-node](https://github.com/meedstrom/org-node) /
[org-mem](https://github.com/meedstrom/org-mem) knowledge bases.

Powered by the same Vite + React + Cytoscape / Force Graph front-end as
[org-roam-ui-lite](https://github.com/tani/org-roam-ui-lite), but the Emacs
backend speaks org-mem natively — no org-roam dependency.

## Features

- **org-mem native** — reads your notes through org-mem; no SQLite DB required
- **Three renderers** — Cytoscape (default), Force Graph 2D, Force Graph 3D
- **Themes** — Nord Dark, Gruvbox Dark, Dracula Dark (plus light variants)
- **Backlink panel** — Org content with MathJax, Mermaid, syntax highlighting
- **Image serving** — assets referenced in notes are proxied through the API
- **Tag exclusion** — hide nodes by tag (default: `ROAM_EXCLUDE`)

## Prerequisites

- Emacs 29.1 or later
- [`org-mem`](https://github.com/meedstrom/org-mem) ≥ 0.34 with `org-mem-updater-mode` enabled
- [`org-node`](https://github.com/meedstrom/org-node) ≥ 1.0
- [`simple-httpd`](https://github.com/skeeto/emacs-web-server) ≥ 1.5.1

## Installation

### straight.el / use-package

```elisp
(use-package org-node-ui
  :straight (:host github :repo "yewton/org-node-ui-lite"
             :files ("org-node-ui.el" "packages/frontend/dist"))
  :after (org-mem org-node)
  :config
  (org-node-ui-mode 1))
```

### Manual

1. Clone the repository:

   ```bash
   git clone https://github.com/yewton/org-node-ui-lite.git
   ```

2. Add to `init.el`:

   ```elisp
   (add-to-list 'load-path "/path/to/org-node-ui-lite")
   (require 'org-node-ui)
   (org-node-ui-mode 1)
   ```

3. Open <http://localhost:5174/index.html>.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `org-node-ui-port` | `5174` | HTTP port |
| `org-node-ui-open-on-start` | `t` | Open browser on mode enable |
| `org-node-ui-browser-function` | `#'browse-url` | Browser opener |
| `org-node-ui-exclude-tags` | `'("ROAM_EXCLUDE")` | Tags that hide a node |
| `org-node-ui-static-root` | `packages/frontend/dist/` | Path to compiled front-end |

Example:

```elisp
(setq org-node-ui-port 8080
      org-node-ui-exclude-tags '("ROAM_EXCLUDE" "noexport" "private"))
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/graph.json` | All nodes and edges |
| `GET /api/node/{id}.json` | Single node, raw Org text, and backlinks |
| `GET /api/node/{id}/{path}` | Binary asset (Base64url-encoded filename) |

The full contract is defined in [`openapi.yaml`](openapi.yaml).

## Building the front-end from source

The compiled front-end (`packages/frontend/dist/`) is committed to the
repository. To rebuild it yourself:

```bash
cd packages/frontend
npm install
npm run build
```

## Known constraints

- **No live reload** — the graph does not update automatically when you save a
  file. Reload the browser tab after `org-mem-updater-mode` has picked up
  changes (usually within a few seconds).
- **No follow-mode** — cursor-following requires a WebSocket connection and is
  planned for a future release.
- **Read-only** — node creation and deletion are out of scope.
- **`org-mem-entry-text` caching** — the raw Org text is served from the file
  by default. Set `org-mem-do-cache-text t` before enabling `org-mem-updater-mode`
  to use org-mem's in-memory cache instead.

## Licence

GNU GPL v3 or later — see [LICENSE.md](LICENSE.md).

## Acknowledgements

- [org-roam-ui-lite](https://github.com/tani/org-roam-ui-lite) by Masaya
  Taniguchi — the front-end is used without modification.
- [org-mem](https://github.com/meedstrom/org-mem) and
  [org-node](https://github.com/meedstrom/org-node) by Martin Edström.
- Graph rendering by [Cytoscape.js](https://js.cytoscape.org) and
  [Force Graph](https://github.com/vasturiano/force-graph).
