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
