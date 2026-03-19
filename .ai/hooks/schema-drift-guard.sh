#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if git diff --name-only --cached 2>/dev/null | grep -q "^shared/schema.ts$"; then
  echo "[ai-hook] shared/schema.ts changed."
  echo "[ai-hook] Confirm deployment or migration rollout is updated before merge/deploy."
fi

if git diff --name-only 2>/dev/null | grep -q "^shared/schema.ts$"; then
  echo "[ai-hook] Working tree contains schema changes."
  echo "[ai-hook] Review .github/workflows/deploy.yml or your migration path."
fi

