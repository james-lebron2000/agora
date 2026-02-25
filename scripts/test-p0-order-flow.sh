#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5093}"
BASE="http://127.0.0.1:${PORT}"
LOG="./logs/test-p0-order-flow-relay.log"
mkdir -p ./logs

AGORA_REQUIRE_PAYMENT_VERIFY=1 PORT="$PORT" node apps/relay/server.js >"$LOG" 2>&1 &
PID=$!
cleanup() {
  kill "$PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in {1..40}; do
  if curl -fsS "$BASE/health" >/dev/null 2>&1; then break; fi
  sleep 0.25
done
curl -fsS "$BASE/health" >/dev/null

REQ_ID="req_p0_$(date +%s)"
OFFER_ID="off_p0_1"
TX="relay:held:${REQ_ID}"
BUYER="0xe3da83de08139316b0b74fdddab220debc49d029"
SELLER="0x883a19c56e8294fb4e37e028467932568be3676a"

# 1) RESULT before REQUEST must fail on state machine.
set +e
PRE_RESULT=$(curl -sS -o /tmp/p0_pre_result.json -w "%{http_code}" -X POST "$BASE/v1/messages" \
  -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"res_pre_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"RESULT\",\"sender\":{\"id\":\"agent:test\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"status\":\"success\"}}}")
set -e
if [ "$PRE_RESULT" != "404" ]; then
  echo "expected pre-result status 404, got $PRE_RESULT"
  cat /tmp/p0_pre_result.json
  exit 1
fi

# 2) REQUEST -> CREATED
curl -fsS -X POST "$BASE/v1/messages" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: req-$REQ_ID" \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_req_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"REQUEST\",\"sender\":{\"id\":\"web:user\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"intent\":\"dev.code\",\"params\":{\"task\":\"hello\"}}}}" >/tmp/p0_request.json

# 3) OFFER -> OFFERED
curl -fsS -X POST "$BASE/v1/messages" \
  -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_offer_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"OFFER\",\"sender\":{\"id\":\"$SELLER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"offer_id\":\"$OFFER_ID\",\"amount\":1,\"token\":\"USDC\"}}}" >/tmp/p0_offer.json

# 4) ACCEPT with synthetic verified tx -> FUNDED
curl -fsS -X POST "$BASE/v1/messages" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: acc-$REQ_ID" \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_accept_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"ACCEPT\",\"sender\":{\"id\":\"eip155:84532:$BUYER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"offer_id\":\"$OFFER_ID\",\"payment_tx\":\"$TX\",\"payer\":\"$BUYER\",\"payee\":\"$SELLER\",\"chain\":\"base-sepolia\",\"token\":\"USDC\",\"amount\":1}}}" >/tmp/p0_accept.json

# 5) Duplicate ACCEPT should be idempotent success.
curl -fsS -X POST "$BASE/v1/messages" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: acc-$REQ_ID" \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_accept_dup_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"ACCEPT\",\"sender\":{\"id\":\"eip155:84532:$BUYER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"offer_id\":\"$OFFER_ID\",\"payment_tx\":\"$TX\",\"payer\":\"$BUYER\",\"payee\":\"$SELLER\",\"chain\":\"base-sepolia\",\"token\":\"USDC\",\"amount\":1}}}" >/tmp/p0_accept_dup.json

# 6) RESULT -> DELIVERED
curl -fsS -X POST "$BASE/v1/messages" \
  -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_result_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"RESULT\",\"sender\":{\"id\":\"$SELLER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"status\":\"success\",\"output\":{\"done\":true}}}}" >/tmp/p0_result.json

# 7) hold/release -> RELEASED
curl -fsS -X POST "$BASE/v1/escrow/hold" \
  -H 'Content-Type: application/json' \
  -d "{\"request_id\":\"$REQ_ID\",\"payer\":\"$BUYER\",\"payee\":\"$SELLER\",\"amount\":1,\"currency\":\"USDC\"}" >/tmp/p0_hold.json

curl -fsS -X POST "$BASE/v1/escrow/release" \
  -H 'Content-Type: application/json' \
  -d "{\"request_id\":\"$REQ_ID\",\"resolution\":\"success\"}" >/tmp/p0_release.json

curl -fsS "$BASE/v1/orders/$REQ_ID" >/tmp/p0_order.json
curl -fsS "$BASE/v1/payments/records?limit=20" >/tmp/p0_payments.json

python3 - <<'PY'
import json

order = json.load(open('/tmp/p0_order.json'))
payments = json.load(open('/tmp/p0_payments.json'))
acc_dup = json.load(open('/tmp/p0_accept_dup.json'))

assert order['ok'] is True
state = order['order']['state']
assert state == 'RELEASED', state

records = payments.get('records', [])
assert any(r.get('verification_status') in ('VERIFIED_SYNTHETIC', 'VERIFIED') for r in records), records

assert acc_dup.get('idempotent_replay') is True, acc_dup
print('p0_state=', state)
print('payments_count=', len(records))
print('duplicate_accept_idempotent=', acc_dup.get('idempotent_replay'))
PY

echo "--- relay log tail ---"
tail -n 40 "$LOG"
