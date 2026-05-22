#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/glycopilot-app}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/}"
EXPECTED_HTTP_CODE="${EXPECTED_HTTP_CODE:-200}"
FAILURES_BEFORE_RESTART="${FAILURES_BEFORE_RESTART:-2}"
FAILURES_BEFORE_REBOOT="${FAILURES_BEFORE_REBOOT:-4}"
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-5}"
CURL_MAX_TIME="${CURL_MAX_TIME:-15}"
COMPOSE_SERVICES="${COMPOSE_SERVICES:-redis_aws backend_aws ai_service_aws medication_scheduler_aws nginx}"
STATE_DIR="${STATE_DIR:-/var/lib/glycopilot-healthcheck}"
FAILURE_FILE="${STATE_DIR}/failures"
LOG_TAG="glycopilot-healthcheck"

log() {
  logger -t "$LOG_TAG" "$*"
  printf '%s\n' "$*"
}

mkdir -p "$STATE_DIR"

http_code="$(
  curl \
    --silent \
    --show-error \
    --insecure \
    --output /dev/null \
    --write-out '%{http_code}' \
    --connect-timeout "$CURL_CONNECT_TIMEOUT" \
    --max-time "$CURL_MAX_TIME" \
    "$HEALTHCHECK_URL" 2>/tmp/glycopilot-healthcheck-curl.err || true
)"

if [ "$http_code" = "$EXPECTED_HTTP_CODE" ]; then
  printf '0\n' > "$FAILURE_FILE"
  log "healthy url=${HEALTHCHECK_URL} http_code=${http_code}"
  exit 0
fi

previous_failures="0"
if [ -s "$FAILURE_FILE" ]; then
  previous_failures="$(cat "$FAILURE_FILE")"
fi

if ! [[ "$previous_failures" =~ ^[0-9]+$ ]]; then
  previous_failures="0"
fi

failures=$((previous_failures + 1))
printf '%s\n' "$failures" > "$FAILURE_FILE"

curl_error=""
if [ -s /tmp/glycopilot-healthcheck-curl.err ]; then
  curl_error="$(tr '\n' ' ' </tmp/glycopilot-healthcheck-curl.err)"
fi

log "unhealthy url=${HEALTHCHECK_URL} http_code=${http_code:-none} failures=${failures} curl_error=${curl_error}"

if [ "$failures" -eq "$FAILURES_BEFORE_RESTART" ]; then
  log "restart threshold reached; restarting Docker Compose services"
  cd "$APP_DIR"

  if ! docker info >/dev/null 2>&1; then
    log "Docker daemon is not healthy; restarting docker.service"
    systemctl restart docker
  fi

  docker compose --profile aws up -d --no-build $COMPOSE_SERVICES
fi

if [ "$failures" -ge "$FAILURES_BEFORE_REBOOT" ]; then
  log "reboot threshold reached; rebooting EC2 instance"
  sync
  systemctl reboot
fi
