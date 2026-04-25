#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "==> Installing npm dependencies..."
npm install

echo "==> Installing Emacs Lisp dependencies via eldev..."
eldev prepare

echo "==> Session setup complete."
