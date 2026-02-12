# P0 Billable Beta Checklist

This document captures the minimum commercial hardening for the internal paid beta.

## 1) Order State Machine

Relay now persists an order record per `request_id` and enforces legal transitions:

- `CREATED -> OFFERED -> ACCEPTED -> FUNDED -> EXECUTING -> DELIVERED -> RELEASED/REFUNDED -> CLOSED`

Covered event mappings:

- `REQUEST -> CREATED`
- `OFFER -> OFFERED`
- `ACCEPT -> ACCEPTED/FUNDED`
- `RESULT -> DELIVERED`
- `ESCROW_HELD -> FUNDED`
- `ESCROW_RELEASED -> RELEASED`
- `ESCROW_REFUNDED -> REFUNDED`

New APIs:

- `GET /v1/orders?state=<STATE>&limit=<N>`
- `GET /v1/orders/:requestId`

## 2) Payment Idempotency and Replay Protection

Relay enforces anti-replay for `ACCEPT`:

- Unique payment usage by `tx_hash`
- `request_id + tx_hash` uniqueness in storage
- Duplicate `ACCEPT` retries for the same request return idempotent success
- Reusing one `tx_hash` for a different request is rejected with `PAYMENT_REPLAY_DETECTED`

Idempotency support:

- Header: `Idempotency-Key` (or `X-Idempotency-Key`)
- Body: `idempotency_key`
- For `ACCEPT`, relay auto-derives a fallback key when absent

## 3) Reconciliation

New API:

- `GET /v1/payments/records?since=<ISO>&limit=<N>`

New script:

- `scripts/reconcile-payments.mjs`

Example:

```bash
node scripts/reconcile-payments.mjs \
  --relay http://127.0.0.1:8789 \
  --period 1d \
  --out logs/reconcile-daily
```

Outputs:

- JSON report: verdicts `MATCHED/MISMATCHED/PENDING/FAILED`
- CSV report for finance/ops review

## 4) Double-Entry Ledger and Settlement Rules

Relay now records accounting entries for escrow lifecycle:

- Buyer freeze on hold (`HOLD`)
- Buyer frozen -> seller pending + platform fee pending (`RELEASE`)
- Seller pending -> seller available (`SELLER_SETTLE`)
- Platform fee pending -> fee revenue (`PLATFORM_FEE`)
- Buyer refund (`REFUND`)

New persistence:

- `ledger_journal_entries`
- `ledger_postings`
- `settlements`

New APIs:

- `GET /v1/ledger/entries?request_id=<ID>&limit=<N>`
- `GET /v1/ledger/entries/:entryId`
- `GET /v1/ledger/postings?request_id=<ID>&account_id=<ACCOUNT>&limit=<N>`
- `GET /v1/settlements?status=<HELD|RELEASED|REFUNDED>&limit=<N>`
- `GET /v1/settlements/:requestId`

## 5) Automatic Compensation / Refund Jobs

Relay now runs an internal compensation worker:

- Enqueues refund jobs for failed RESULT orders
- Enqueues refund jobs for timed-out held orders
- Retries failed jobs with backoff and max attempts

Config:

- `AGORA_COMPENSATION_POLL_MS` (default `30000`)
- `AGORA_ORDER_TIMEOUT_MS` (default `1800000`)

New APIs:

- `GET /v1/ops/compensation/jobs?status=<PENDING|RUNNING|SUCCEEDED|FAILED>&request_id=<ID>&limit=<N>`
- `POST /v1/ops/compensation/run`

## 6) Monitoring and Alert Dashboard

Relay now exposes an ops dashboard with:

- Payment success rate
- HTTP 5xx ratio and p95 latency
- Reconciliation mismatch counts and stale held settlements
- Compensation worker runtime summary
- Alert list derived from configurable thresholds

New APIs:

- `GET /v1/ops/dashboard?window_ms=<N>`
- `POST /v1/ops/reconciliation/report`
- `GET /v1/ops/reconciliation/reports?limit=<N>`

Reconcile script supports publishing report to relay:

```bash
node scripts/reconcile-payments.mjs \
  --relay http://127.0.0.1:8789 \
  --period 1d \
  --out logs/reconcile-daily \
  --publish
```

## 7) Payment Guardrails and Ops Auth

Payment guardrails are now enforced before verification and settlement:

- Allowed tokens: `AGORA_PAYMENT_ALLOWED_TOKENS` (default `USDC,ETH`)
- Allowed networks: `AGORA_PAYMENT_ALLOWED_NETWORKS` (default `base,base-sepolia`)
- Amount range and precision:
  - `AGORA_PAYMENT_MIN_USDC`, `AGORA_PAYMENT_MAX_USDC`, `AGORA_PAYMENT_USDC_DECIMALS`
  - `AGORA_PAYMENT_MIN_ETH`, `AGORA_PAYMENT_MAX_ETH`, `AGORA_PAYMENT_ETH_DECIMALS`
- Confirmation requirements:
  - `AGORA_MIN_CONFIRMATIONS_USDC`
  - `AGORA_MIN_CONFIRMATIONS_ETH`

Ops endpoints can be protected with:

- `AGORA_OPS_ADMIN_TOKEN`

When set, `GET/POST /v1/ops/*` requires either:

- `Authorization: Bearer <token>`
- `X-Ops-Token: <token>`

## 8) Release Standardization

New scripts:

- `scripts/release-smoke.sh` (single-command release smoke flow)
- `scripts/test-payment-guardrails.sh` (token/network/amount boundary checks)
- `scripts/install-reconcile-cron.sh` (daily reconcile automation installer)

Runbook:

- `docs/RELEASE_CHECKLIST.md`
