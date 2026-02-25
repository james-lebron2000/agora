# Claude Code Follow-up Tasks (Agora)

## Context
This list continues after the completed items: agent init CLI, market-rate API, request/response schema validation, escrow lifecycle callbacks, and web analytics de-mocking.

## P0 - Sandboxed Execution for Agent Jobs
- Goal: Let registered agents execute task code safely beyond plain HTTP callbacks.
- Scope:
  - Add `apps/sandbox-runner/` service with strict resource limits (CPU/mem/time), read-only FS by default, explicit writable temp dir.
  - Add relay endpoint `POST /v1/execute` to submit signed execution jobs for whitelisted agents.
  - Attach execution result metadata to `RESULT` payload (`stdout`, `stderr`, `exit_code`, `artifacts`).
- Constraints:
  - No host shell escape.
  - Network egress disabled by default; per-task allowlist.
- Acceptance:
  - E2E script proves untrusted code cannot access host secrets/files outside sandbox.
  - Timeout and memory kill paths covered by tests.

## P1 - Agent Directory Productization
- Goal: Turn current directory API into a full “yellow pages” UX.
- Scope:
  - Web page `/agents` with filters (`intent`, `q`, `status`, price range).
  - Agent profile detail page showing portfolio URL, pricing cards, reputation history.
  - Relay: add pagination cursor for `/v1/directory` (`cursor`, `next_cursor`).
- Acceptance:
  - Can find `OpenClawAssistant` by keyword + intent.
  - List rendering stable with >1k agents (mock dataset).

## P1 - Pricing Intelligence Upgrade
- Goal: Make `market-rate` actionable for agent operators.
- Scope:
  - Add weighted stats by recency and sample confidence score.
  - SDK helper `suggestPrice(intent, targetQuantile)` based on `/v1/market-rate`.
  - CLI command `agora market-rate --intent code.review --currency USDC --period 30d`.
- Acceptance:
  - Unit tests for quantile math and confidence scoring.
  - CLI output includes recommendation and confidence.

## P2 - Feedback Loop Hardening
- Goal: Close loop from delivery quality to discover ranking.
- Scope:
  - Add mandatory post-completion feedback window (`rating`, `review`, optional tags).
  - Anti-spam controls: one rating per request, signer consistency checks.
  - Feed rating signal back into directory ranking weights.
- Acceptance:
  - Replay attacks rejected.
  - Directory ranking changes after rating updates in integration test.

## P2 - Protocol Test Pack
- Goal: Prevent regressions across relay/sdk/web.
- Scope:
  - Add contract tests for: schema rejection, escrow event order, directory filters, market-rate aggregation.
  - Add smoke script for Base Sepolia ETH + USDC dual-payment UI path.
- Acceptance:
  - Single CI command runs all protocol tests and outputs pass/fail summary.

## Branching + Delivery Rules
- Branch prefix: `codex/`.
- One PR per task above.
- Each PR must include:
  - change summary
  - API compatibility notes
  - rollback plan
