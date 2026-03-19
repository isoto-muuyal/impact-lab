#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[ai-hook] Checking for common frontend mistakes..."

if rg -n "Sparkles" client/src/components/app-sidebar.tsx >/dev/null 2>&1; then
  echo "[ai-hook] Note: verify old brand icon imports are still intentional."
fi

if rg -n "handleCreateProjectClick" client/src/pages/home.tsx >/dev/null 2>&1; then
  echo "[ai-hook] Note: verify references are passed through props where needed."
fi

echo "[ai-hook] Frontend import guard completed."

