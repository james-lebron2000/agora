#!/usr/bin/env bash
set -euo pipefail

RELAY_URL="${RELAY_URL:-${AGORA_RELAY_URL:-http://127.0.0.1:8789}}"
OPS_TOKEN="${AGORA_OPS_ADMIN_TOKEN:-}"
BUYER="${AGORA_PAYMENT_BUYER_ADDRESS:-0xe3da83de08139316b0b74fdddab220debc49d029}"
SELLER="${AGORA_PAYMENT_SELLER_ADDRESS:-0x883a19c56e8294fb4e37e028467932568be3676a}"
REQ_ID="smoke_$(date +%s)"

curl -fsS "$RELAY_URL/health" >/tmp/smoke_health.json

curl -fsS -X POST "$RELAY_URL/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_req_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"REQUEST\",\"sender\":{\"id\":\"web:user\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"intent\":\"dev.code\",\"params\":{\"task\":\"release smoke\"}}}}" >/tmp/smoke_req.json

curl -fsS -X POST "$RELAY_URL/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_offer_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"OFFER\",\"sender\":{\"id\":\"$SELLER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"offer_id\":\"offer_smoke\",\"amount\":0.0001,\"token\":\"ETH\"}}}" >/tmp/smoke_offer.json

curl -fsS -X POST "$RELAY_URL/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_accept_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"ACCEPT\",\"sender\":{\"id\":\"eip155:84532:$BUYER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"offer_id\":\"offer_smoke\",\"payment_tx\":\"relay:held:$REQ_ID\",\"payer\":\"$BUYER\",\"payee\":\"$SELLER\",\"chain\":\"base-sepolia\",\"token\":\"ETH\",\"amount\":0.0001}}}" >/tmp/smoke_accept.json

curl -fsS -X POST "$RELAY_URL/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_result_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"RESULT\",\"sender\":{\"id\":\"$SELLER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"status\":\"success\",\"output\":{\"ok\":true}}}}" >/tmp/smoke_result.json

curl -fsS -X POST "$RELAY_URL/v1/escrow/release" -H 'Content-Type: application/json' \
  -d "{\"request_id\":\"$REQ_ID\",\"resolution\":\"success\"}" >/tmp/smoke_release.json

curl -fsS "$RELAY_URL/v1/settlements/$REQ_ID" >/tmp/smoke_settlement.json
curl -fsS "$RELAY_URL/v1/ledger/entries?request_id=$REQ_ID" >/tmp/smoke_ledger_entries.json
if [[ -n "$OPS_TOKEN" ]]; then
  curl -fsS -H "Authorization: Bearer $OPS_TOKEN" "$RELAY_URL/v1/ops/dashboard" >/tmp/smoke_ops_dashboard.json
else
  curl -fsS "$RELAY_URL/v1/ops/dashboard" >/tmp/smoke_ops_dashboard.json
fi

python3 - <<'PY'
import json
settlement = json.load(open('/tmp/smoke_settlement.json'))['settlement']
entries = json.load(open('/tmp/smoke_ledger_entries.json'))
dashboard = json.load(open('/tmp/smoke_ops_dashboard.json'))
assert settlement['status'] == 'RELEASED', settlement
assert entries.get('total', 0) >= 3, entries
assert dashboard.get('ok') is True, dashboard
print('smoke_request_id=', settlement['request_id'])
print('smoke_settlement_status=', settlement['status'])
print('smoke_ledger_entries=', entries.get('total'))
PY

echo "[release-smoke] PASS relay=$RELAY_URL request_id=$REQ_ID"
