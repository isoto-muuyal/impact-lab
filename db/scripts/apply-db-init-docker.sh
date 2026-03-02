#!/usr/bin/env bash

set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"

APP_DB_NAME="${APP_DB_NAME:-impactlab}"
APP_DB_USER="${APP_DB_USER:-impactlab}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-impactlab}"
ADMIN_DB_NAME="${ADMIN_DB_NAME:-postgres}"
DOCKER_NETWORK="${DOCKER_NETWORK:-shared_network}"
POSTGRES_CLIENT_IMAGE="${POSTGRES_CLIENT_IMAGE:-postgres:16}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

docker run --rm \
  --network "${DOCKER_NETWORK}" \
  -e PGPASSWORD="${PGPASSWORD}" \
  -e PGHOST="${PGHOST}" \
  -e PGPORT="${PGPORT}" \
  -e PGUSER="${PGUSER}" \
  -e APP_DB_NAME="${APP_DB_NAME}" \
  -e APP_DB_USER="${APP_DB_USER}" \
  -e APP_DB_PASSWORD="${APP_DB_PASSWORD}" \
  -e ADMIN_DB_NAME="${ADMIN_DB_NAME}" \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  "${POSTGRES_CLIENT_IMAGE}" \
  bash /work/db/scripts/apply-db-init.sh
