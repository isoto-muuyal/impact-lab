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

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

psql \
  -v ON_ERROR_STOP=1 \
  -v app_db_name="$APP_DB_NAME" \
  -v app_db_user="$APP_DB_USER" \
  -v app_db_password="$APP_DB_PASSWORD" \
  -h "$PGHOST" \
  -p "$PGPORT" \
  -U "$PGUSER" \
  -d "$ADMIN_DB_NAME" \
  -f "$ROOT_DIR/db/init/00-bootstrap.sql"

DB_INITIALIZED="$(
  psql \
    -v ON_ERROR_STOP=1 \
    -tA \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$APP_DB_NAME" \
    -c "SELECT to_regclass('public.users') IS NOT NULL"
)"

if [[ "$DB_INITIALIZED" == "t" ]]; then
  echo "Database $APP_DB_NAME is already initialized (public.users exists); skipping schema and seed."
  exit 0
fi

psql \
  -v ON_ERROR_STOP=1 \
  -h "$PGHOST" \
  -p "$PGPORT" \
  -U "$PGUSER" \
  -d "$APP_DB_NAME" \
  -f "$ROOT_DIR/db/init/01-schema.sql"

psql \
  -v ON_ERROR_STOP=1 \
  -h "$PGHOST" \
  -p "$PGPORT" \
  -U "$PGUSER" \
  -d "$APP_DB_NAME" \
  -f "$ROOT_DIR/db/init/02-seed.sql"
