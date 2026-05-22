#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/glycopilot-app}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/glycopilot-backups}"
S3_BACKUP_PREFIX="${S3_BACKUP_PREFIX:-s3://glycopilot-aws-s3-bucket-img-artifacts/database-backups}"
RETENTION_COUNT="${RETENTION_COUNT:-7}"
DB_CLIENT_SERVICE="${DB_CLIENT_SERVICE:-database_aws}"

TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_NAME="DATA_GLYCO_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

cleanup() {
  rm -f "$BACKUP_PATH"
}
trap cleanup EXIT

log() {
  printf '%s\n' "$*"
  logger -t glycopilot-db-backup "$*"
}

require_value() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    log "missing required value: ${name}"
    exit 1
  fi
}

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

DB_HOST="${DB_HOST:-database_aws}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-}}"
DB_USER="${DB_USER:-${POSTGRES_USER:-}}"
DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"

if [ -f backend/.env.prod ]; then
  while IFS='=' read -r key value; do
    case "$key" in
      DB_NAME) DB_NAME="$value" ;;
      DB_USER) DB_USER="$value" ;;
      DB_PASSWORD) DB_PASSWORD="$value" ;;
      POSTGRES_DB) DB_NAME="${DB_NAME:-$value}" ;;
      POSTGRES_USER) DB_USER="${DB_USER:-$value}" ;;
      POSTGRES_PASSWORD) DB_PASSWORD="${DB_PASSWORD:-$value}" ;;
    esac
  done < <(grep -E '^(DB_NAME|DB_USER|DB_PASSWORD|POSTGRES_DB|POSTGRES_USER|POSTGRES_PASSWORD)=' backend/.env.prod || true)
fi

DB_NAME="${DB_NAME:-glycopilot_prod_db}"
DB_USER="${DB_USER:-glycopilot_prod_user}"
DB_SSLMODE="${DB_SSLMODE:-prefer}"

if [ "$DB_HOST" != "database_aws" ] && [ "$DB_SSLMODE" = "prefer" ]; then
  DB_SSLMODE="require"
fi

require_value DB_HOST "$DB_HOST"
require_value DB_PORT "$DB_PORT"
require_value DB_NAME "$DB_NAME"
require_value DB_USER "$DB_USER"
require_value DB_PASSWORD "$DB_PASSWORD"

log "starting backup host=${DB_HOST} db=${DB_NAME} user=${DB_USER}"

docker compose --profile aws exec -T \
  -e PGPASSWORD="$DB_PASSWORD" \
  -e PGSSLMODE="$DB_SSLMODE" \
  "$DB_CLIENT_SERVICE" \
  pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
  | gzip -9 > "$BACKUP_PATH"

test -s "$BACKUP_PATH"

aws s3 cp "$BACKUP_PATH" "${S3_BACKUP_PREFIX}/${BACKUP_NAME}" --sse AES256
log "backup uploaded: ${S3_BACKUP_PREFIX}/${BACKUP_NAME}"

aws s3 ls "${S3_BACKUP_PREFIX}/" \
  | awk '{print $4}' \
  | grep '^DATA_GLYCO_.*\.sql\.gz$' \
  | sort \
  | head -n "-${RETENTION_COUNT}" \
  | while read -r old_backup; do
      aws s3 rm "${S3_BACKUP_PREFIX}/${old_backup}"
      log "removed old backup: ${old_backup}"
    done
