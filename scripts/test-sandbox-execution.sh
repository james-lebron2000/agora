#!/bin/zsh
set -euo pipefail

RELAY_PORT="${RELAY_PORT:-5092}"
RUNNER_PORT="${RUNNER_PORT:-8790}"
BASE_RELAY="http://127.0.0.1:${RELAY_PORT}"
BASE_RUNNER="http://127.0.0.1:${RUNNER_PORT}"
LOG_DIR="${LOG_DIR:-./logs}"
mkdir -p "$LOG_DIR"

RUNNER_LOG="$LOG_DIR/sandbox_runner.log"
RELAY_LOG="$LOG_DIR/sandbox_relay.log"
AGENT_DID="did:key:z6MkqSandboxExecAgent111111111111111111111111111111"

cleanup() {
  [[ -n "${RUNNER_PID:-}" ]] && kill "$RUNNER_PID" >/dev/null 2>&1 || true
  [[ -n "${RELAY_PID:-}" ]] && kill "$RELAY_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

PORT="$RUNNER_PORT" node apps/sandbox-runner/server.js >"$RUNNER_LOG" 2>&1 &
RUNNER_PID=$!

AGORA_ENABLE_SANDBOX_EXECUTE=1 \
AGORA_SANDBOX_RUNNER_URL="$BASE_RUNNER" \
AGORA_SANDBOX_AGENT_ALLOWLIST="$AGENT_DID" \
PORT="$RELAY_PORT" \
node apps/relay/server.js >"$RELAY_LOG" 2>&1 &
RELAY_PID=$!

for i in {1..40}; do
  if curl -fsS "$BASE_RUNNER/health" >/dev/null 2>&1 && curl -fsS "$BASE_RELAY/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
curl -fsS "$BASE_RUNNER/health" >/dev/null
curl -fsS "$BASE_RELAY/health" >/dev/null

# Register whitelisted agent
curl -fsS -X POST "$BASE_RELAY/v1/agents" \
  -H 'Content-Type: application/json' \
  -d "{\"agent\":{\"id\":\"$AGENT_DID\",\"name\":\"Sandbox Exec Agent\"},\"capabilities\":[{\"id\":\"cap_sandbox\",\"intents\":[{\"id\":\"dev.code\"}],\"input_schema\":{\"type\":\"object\",\"additionalProperties\":true},\"output_schema\":{\"type\":\"object\",\"additionalProperties\":true}}]}" >/dev/null

# Seed request index
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -fsS -X POST "$BASE_RELAY/v1/messages" \
  -H 'Content-Type: application/json' \
  -d "{\"envelope\":{\"version\":\"1.0\",\"id\":\"msg_req_exec\",\"ts\":\"$TS\",\"type\":\"REQUEST\",\"sender\":{\"id\":\"user:test\"},\"payload\":{\"request_id\":\"req_exec_1\",\"intent\":\"dev.code\",\"params\":{\"task\":\"sandbox test\"}}}}" >/dev/null

CODE_DENY=$(cat <<'JSCODE'
import fs from 'node:fs/promises';
try {
  await fs.readFile('/Users/lijinming/agora/README.md', 'utf-8');
  console.log('UNEXPECTED_READ_SUCCESS');
} catch (error) {
  console.error('READ_DENIED', String(error.message || error));
}
await fs.writeFile('artifact.txt', 'sandbox-ok', 'utf-8');
console.log('EXEC_DONE');
JSCODE
)

PAYLOAD1=$(python3 - <<PY
import json
code = '''$CODE_DENY'''
payload = {
  'agent_id': '$AGENT_DID',
  'request_id': 'req_exec_1',
  'publish_result': True,
  'job': {
    'language': 'nodejs',
    'code': code,
    'timeout_ms': 4000,
    'max_memory_mb': 96,
    'artifacts': ['artifact.txt']
  }
}
print(json.dumps(payload))
PY
)

EXEC1=$(curl -fsS -X POST "$BASE_RELAY/v1/execute" -H 'Content-Type: application/json' -d "$PAYLOAD1")

CODE_TIMEOUT=$(cat <<'JSCODE'
while (true) {
  // Intentional infinite loop to validate timeout guard.
}
JSCODE
)

PAYLOAD2=$(python3 - <<PY
import json
code = '''$CODE_TIMEOUT'''
payload = {
  'agent_id': '$AGENT_DID',
  'request_id': 'req_exec_1',
  'publish_result': False,
  'job': {
    'language': 'nodejs',
    'code': code,
    'timeout_ms': 1200,
    'max_memory_mb': 96,
  }
}
print(json.dumps(payload))
PY
)

EXEC2=$(curl -fsS -X POST "$BASE_RELAY/v1/execute" -H 'Content-Type: application/json' -d "$PAYLOAD2")

EXEC1_JSON="$EXEC1" EXEC2_JSON="$EXEC2" python3 - <<'PY'
import json
import os
exec1=json.loads(os.environ['EXEC1_JSON'])
exec2=json.loads(os.environ['EXEC2_JSON'])
assert exec1.get('ok') is True, exec1
assert exec1['execution']['status'] == 'SUCCESS', exec1
stderr=exec1['execution'].get('stderr','')
assert 'READ_DENIED' in stderr, exec1
artifacts=exec1['execution'].get('artifacts') or []
assert any(a.get('path')=='artifact.txt' for a in artifacts), exec1
assert exec2.get('ok') is True, exec2
assert exec2['execution']['status'] == 'TIMEOUT', exec2
print('sandbox_access_denied_check=PASS')
print('sandbox_timeout_check=PASS')
print('execution1_status=', exec1['execution']['status'])
print('execution2_status=', exec2['execution']['status'])
PY

echo "--- relay log tail ---"
tail -n 30 "$RELAY_LOG"
echo "--- sandbox runner log tail ---"
tail -n 30 "$RUNNER_LOG"
