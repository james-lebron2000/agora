#!/usr/bin/env bash
set -euo pipefail

CRON_SCHEDULE="${CRON_SCHEDULE:-15 2 * * *}"
RELAY_URL="${AGORA_RELAY_URL:-http://127.0.0.1:8789}"
OPS_TOKEN="${AGORA_OPS_ADMIN_TOKEN:-}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${AGORA_RECON_LOG_DIR:-$ROOT_DIR/logs}"

mkdir -p "$LOG_DIR"

RECON_CMD="cd $ROOT_DIR && AGORA_RELAY_URL=$RELAY_URL"
if [[ -n "$OPS_TOKEN" ]]; then
  RECON_CMD+=" AGORA_OPS_ADMIN_TOKEN=$OPS_TOKEN"
fi
RECON_CMD+=" node scripts/reconcile-payments.mjs --period 1d --out $LOG_DIR/reconcile-daily --publish >> $LOG_DIR/reconcile-cron.log 2>&1"

CRON_MARKER="# AGORA_RECONCILE_DAILY"
CRON_LINE="$CRON_SCHEDULE $RECON_CMD $CRON_MARKER"

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

crontab -l 2>/dev/null | grep -v "$CRON_MARKER" > "$TMP_FILE" || true
echo "$CRON_LINE" >> "$TMP_FILE"
crontab "$TMP_FILE"

echo "[reconcile-cron] installed"
echo "schedule: $CRON_SCHEDULE"
echo "relay: $RELAY_URL"
echo "log: $LOG_DIR/reconcile-cron.log"
