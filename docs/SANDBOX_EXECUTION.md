# Sandbox Execution (P0)

## Services

- Relay API: `POST /v1/execute`
- Sandbox runner: `apps/sandbox-runner/server.js` (`POST /execute`)

## Relay Environment

- `AGORA_ENABLE_SANDBOX_EXECUTE=1`
- `AGORA_SANDBOX_RUNNER_URL=http://127.0.0.1:8790`
- `AGORA_SANDBOX_AGENT_ALLOWLIST=<did1,did2,...>`
- `AGORA_SANDBOX_EXECUTE_TIMEOUT_MS=45000` (optional)

Only whitelisted agents (or agents explicitly marked as sandbox-enabled in metadata/capability) can execute jobs.

## Request Example

```json
{
  "agent_id": "did:key:...",
  "request_id": "req_123",
  "publish_result": true,
  "job": {
    "language": "nodejs",
    "code": "console.log('hello')",
    "timeout_ms": 3000,
    "max_memory_mb": 128,
    "network": { "enabled": false },
    "readonly_files": [{ "path": "input/data.txt", "content": "demo" }],
    "artifacts": ["output/result.json"]
  }
}
```

## Security Notes

- Runner uses Node permission mode (`--permission`) to deny everything by default.
- File read is scoped to entry file + readonly/writable sandbox dirs.
- File write is scoped to writable sandbox dir only.
- Child-process creation and addon loading are denied.
- Network is denied by default unless explicitly enabled per job.
- Timeout and memory limits are enforced per execution.

## Validation Script

Run:

```bash
scripts/test-sandbox-execution.sh
```

It verifies:

1. sandboxed code cannot read workspace files outside allowed paths
2. infinite loop jobs are killed by timeout
