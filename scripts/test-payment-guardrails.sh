#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5096}"
BASE="http://127.0.0.1:${PORT}"
LOG="./logs/test-payment-guardrails-relay.log"
mkdir -p ./logs

AGORA_REQUIRE_PAYMENT_VERIFY=0 \
AGORA_PAYMENT_ALLOWED_TOKENS="USDC,ETH" \
AGORA_PAYMENT_ALLOWED_NETWORKS="base,base-sepolia" \
AGORA_PAYMENT_MIN_USDC=0.01 \
AGORA_PAYMENT_MAX_USDC=10000 \
AGORA_PAYMENT_MIN_ETH=0.00001 \
AGORA_PAYMENT_MAX_ETH=1 \
PORT="$PORT" node apps/relay/server.js >"$LOG" 2>&1 &
PID=$!
cleanup(){
  kill "$PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in {1..40}; do
  if curl -fsS "$BASE/health" >/dev/null 2>&1; then break; fi
  sleep 0.25
done
curl -fsS "$BASE/health" >/dev/null

REQ_ID="req_guard_$(date +%s)"
BUYER="0xe3da83de08139316b0b74fdddab220debc49d029"
SELLER="0x883a19c56e8294fb4e37e028467932568be3676a"

curl -fsS -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_req_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"REQUEST\",\"sender\":{\"id\":\"web:user\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"intent\":\"dev.code\",\"params\":{\"task\":\"guard\"}}}}" >/tmp/guard_req.json

# token not allowed
set +e
CODE1=$(curl -sS -o /tmp/guard_bad_token.json -w "%{http_code}" -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_acc_bad_token_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"ACCEPT\",\"sender\":{\"id\":\"eip155:84532:$BUYER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"offer_id\":\"o1\",\"payment_tx\":\"relay:held:${REQ_ID}:1\",\"payer\":\"$BUYER\",\"payee\":\"$SELLER\",\"chain\":\"base-sepolia\",\"token\":\"DAI\",\"amount\":1}}}")

# amount too low
CODE2=$(curl -sS -o /tmp/guard_bad_amount.json -w "%{http_code}" -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_acc_bad_amount_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"ACCEPT\",\"sender\":{\"id\":\"eip155:84532:$BUYER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"offer_id\":\"o1\",\"payment_tx\":\"relay:held:${REQ_ID}:2\",\"payer\":\"$BUYER\",\"payee\":\"$SELLER\",\"chain\":\"base-sepolia\",\"token\":\"USDC\",\"amount\":0.0001}}}")

# precision too high for USDC
CODE3=$(curl -sS -o /tmp/guard_bad_precision.json -w "%{http_code}" -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_acc_bad_precision_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"ACCEPT\",\"sender\":{\"id\":\"eip155:84532:$BUYER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"offer_id\":\"o1\",\"payment_tx\":\"relay:held:${REQ_ID}:3\",\"payer\":\"$BUYER\",\"payee\":\"$SELLER\",\"chain\":\"base-sepolia\",\"token\":\"USDC\",\"amount\":0.1234567}}}")

# valid ETH payment
CODE4=$(curl -sS -o /tmp/guard_good_eth.json -w "%{http_code}" -X POST "$BASE/v1/messages" -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_acc_good_eth_${REQ_ID}\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"ACCEPT\",\"sender\":{\"id\":\"eip155:84532:$BUYER\"},\"payload\":{\"request_id\":\"$REQ_ID\",\"offer_id\":\"o1\",\"payment_tx\":\"relay:held:${REQ_ID}:4\",\"payer\":\"$BUYER\",\"payee\":\"$SELLER\",\"chain\":\"base-sepolia\",\"token\":\"ETH\",\"amount\":0.0001}}}")
set -e

if [[ "$CODE1" != "400" || "$CODE2" != "400" || "$CODE3" != "400" || "$CODE4" != "200" ]]; then
  echo "unexpected codes: CODE1=$CODE1 CODE2=$CODE2 CODE3=$CODE3 CODE4=$CODE4"
  cat /tmp/guard_bad_token.json || true
  cat /tmp/guard_bad_amount.json || true
  cat /tmp/guard_bad_precision.json || true
  cat /tmp/guard_good_eth.json || true
  exit 1
fi

echo "guardrails_bad_token_http=$CODE1"
echo "guardrails_bad_amount_http=$CODE2"
echo "guardrails_bad_precision_http=$CODE3"
echo "guardrails_good_eth_http=$CODE4"

echo "--- relay log tail ---"
tail -n 60 "$LOG"
