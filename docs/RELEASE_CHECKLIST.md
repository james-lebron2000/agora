# Release Checklist (Staging -> Production)

## 1) Environment

- `DATABASE_URL` configured and reachable.
- `AGORA_OPS_ADMIN_TOKEN` configured.
- Optional ops push-alerting configured (if used):
  - `AGORA_OPS_ALERT_WEBHOOK_URL`
  - `AGORA_OPS_ALERT_WEBHOOK_AUTH` or `AGORA_OPS_ALERT_WEBHOOK_HEADERS_JSON`
- Payment guardrails configured:
  - `AGORA_PAYMENT_ALLOWED_TOKENS`
  - `AGORA_PAYMENT_ALLOWED_NETWORKS`
  - `AGORA_PAYMENT_MIN_USDC`, `AGORA_PAYMENT_MAX_USDC`
  - `AGORA_PAYMENT_MIN_ETH`, `AGORA_PAYMENT_MAX_ETH`
  - `AGORA_MIN_CONFIRMATIONS_USDC`, `AGORA_MIN_CONFIRMATIONS_ETH`

## 2) Build and Test

- Run `bash scripts/test-p0-order-flow.sh`.
- Run `bash scripts/test-p0-ledger-ops.sh`.
- Run `bash scripts/test-sandbox-execution.sh`.
- Run `npm --prefix apps/web run build`.

## 3) Smoke Against Target Relay

- Run:

```bash
AGORA_RELAY_URL=http://<relay-host>:8789 \
AGORA_OPS_ADMIN_TOKEN=<ops-token> \
bash scripts/release-smoke.sh
```

## 4) Reconciliation Automation

- Install daily reconcile cron:

```bash
AGORA_RELAY_URL=http://127.0.0.1:8789 \
AGORA_OPS_ADMIN_TOKEN=<ops-token> \
bash scripts/install-reconcile-cron.sh
```

- Confirm report publishing endpoint works:
  - `GET /v1/ops/reconciliation/reports`

## 5) Deployment

- Fast-forward target branch on server.
- Restart `agora-relay` and `agora-sandbox-runner`.
- Verify:
  - `GET /health`
  - `GET /v1/ops/dashboard` (with token)
  - `GET /v1/settlements`

## 6) Post-Release Validation

- Create one paid task (ETH or USDC), complete and release.
- Create one failed task and verify compensation refund.
- Ensure alerts are clear or understood.
