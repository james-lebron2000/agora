#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5094}"
BASE="http://127.0.0.1:${PORT}"
LOG="./logs/test-p0-ledger-ops-relay.log"
mkdir -p ./logs

AGORA_REQUIRE_PAYMENT_VERIFY=1 \
AGORA_COMPENSATION_POLL_MS=500 \
AGORA_ORDER_TIMEOUT_MS=1200 \
PORT="$PORT" node apps/relay/server.js >"$LOG" 2>&1 &
PID=$!
cleanup() {
  kill "$PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in {1..50}; do
  if curl -fsS "$BASE/health" >/dev/null 2>&1; then break; fi
  sleep 0.2
done
curl -fsS "$BASE/health" >/dev/null

BUYER="0xe3da83de08139316b0b74fdddab220debc49d029"
SELLER="0x883a19c56e8294fb4e37e028467932568be3676a"

REQ_RELEASE="req_p0_release_$(date +%s)"
REQ_REFUND="req_p0_refund_$(date +%s)"

# Release flow
curl -fsS -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_req_${REQ_RELEASE}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"REQUEST\",\"sender\":{\"id\":\"web:user\"},\"payload\":{\"request_id\":\"$REQ_RELEASE\",\"intent\":\"dev.code\",\"params\":{\"task\":\"release\"}}}}" >/tmp/p0_lo_req1.json
curl -fsS -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_offer_${REQ_RELEASE}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"OFFER\",\"sender\":{\"id\":\"$SELLER\"},\"payload\":{\"request_id\":\"$REQ_RELEASE\",\"offer_id\":\"offer_release\",\"amount\":1,\"token\":\"USDC\"}}}" >/tmp/p0_lo_offer1.json
curl -fsS -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_accept_${REQ_RELEASE}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"ACCEPT\",\"sender\":{\"id\":\"eip155:84532:$BUYER\"},\"payload\":{\"request_id\":\"$REQ_RELEASE\",\"offer_id\":\"offer_release\",\"payment_tx\":\"relay:held:${REQ_RELEASE}\",\"payer\":\"$BUYER\",\"payee\":\"$SELLER\",\"chain\":\"base-sepolia\",\"token\":\"USDC\",\"amount\":1}}}" >/tmp/p0_lo_accept1.json
curl -fsS -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_result_${REQ_RELEASE}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"RESULT\",\"sender\":{\"id\":\"$SELLER\"},\"payload\":{\"request_id\":\"$REQ_RELEASE\",\"status\":\"success\",\"output\":{\"ok\":true}}}}" >/tmp/p0_lo_result1.json
curl -fsS -X POST "$BASE/v1/escrow/release" -H 'Content-Type: application/json' \
  -d "{\"request_id\":\"$REQ_RELEASE\",\"resolution\":\"success\"}" >/tmp/p0_lo_release1.json

# Refund flow (timeout)
curl -fsS -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_req_${REQ_REFUND}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"REQUEST\",\"sender\":{\"id\":\"web:user\"},\"payload\":{\"request_id\":\"$REQ_REFUND\",\"intent\":\"dev.code\",\"params\":{\"task\":\"refund\"}}}}" >/tmp/p0_lo_req2.json
curl -fsS -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_offer_${REQ_REFUND}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"OFFER\",\"sender\":{\"id\":\"$SELLER\"},\"payload\":{\"request_id\":\"$REQ_REFUND\",\"offer_id\":\"offer_refund\",\"amount\":2,\"token\":\"USDC\"}}}" >/tmp/p0_lo_offer2.json
curl -fsS -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_accept_${REQ_REFUND}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"ACCEPT\",\"sender\":{\"id\":\"eip155:84532:$BUYER\"},\"payload\":{\"request_id\":\"$REQ_REFUND\",\"offer_id\":\"offer_refund\",\"payment_tx\":\"relay:held:${REQ_REFUND}\",\"payer\":\"$BUYER\",\"payee\":\"$SELLER\",\"chain\":\"base-sepolia\",\"token\":\"USDC\",\"amount\":2}}}" >/tmp/p0_lo_accept2.json

# Wait for timeout compensation loop
sleep 3

curl -fsS "$BASE/v1/settlements/$REQ_RELEASE" >/tmp/p0_lo_settlement1.json
curl -fsS "$BASE/v1/settlements/$REQ_REFUND" >/tmp/p0_lo_settlement2.json
curl -fsS "$BASE/v1/ledger/entries?request_id=$REQ_RELEASE" >/tmp/p0_lo_entries1.json
curl -fsS "$BASE/v1/ops/compensation/jobs?request_id=$REQ_REFUND" >/tmp/p0_lo_jobs.json
curl -fsS "$BASE/v1/ops/dashboard" >/tmp/p0_lo_dashboard.json

python3 - <<'PY'
import json

s1 = json.load(open('/tmp/p0_lo_settlement1.json'))['settlement']
s2 = json.load(open('/tmp/p0_lo_settlement2.json'))['settlement']
entries = json.load(open('/tmp/p0_lo_entries1.json'))['entries']
jobs = json.load(open('/tmp/p0_lo_jobs.json'))['jobs']
dashboard = json.load(open('/tmp/p0_lo_dashboard.json'))['dashboard']

assert s1['status'] == 'RELEASED', s1
assert s2['status'] == 'REFUNDED', s2
assert len(entries) >= 3, entries
assert any(j['status'] == 'SUCCEEDED' for j in jobs), jobs
assert dashboard['payments']['attempts'] >= 2, dashboard
assert 'http' in dashboard and 'reconciliation' in dashboard, dashboard

print('settlement_release_status=', s1['status'])
print('settlement_refund_status=', s2['status'])
print('ledger_entries_release=', len(entries))
print('compensation_jobs=', len(jobs))
print('dashboard_payment_attempts=', dashboard['payments']['attempts'])
PY

echo "--- relay log tail ---"
tail -n 80 "$LOG"
