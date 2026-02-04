#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

agents=(
  "src/crypto-hunter.ts"
  "src/prediction-arb.ts"
  "src/ecommerce-scout.ts"
  "src/human-task-bridge.ts"
  "src/component-sourcing.ts"
  "src/hs-classifier.ts"
  "src/saas-negotiator.ts"
  "src/smart-contract-auditor.ts"
  "src/tax-nexus.ts"
  "src/clinical-trial-matcher.ts"
  "src/crisis-pr-simulator.ts"
)

pids=()
for agent in "${agents[@]}"; do
  echo "Starting $agent"
  tsx "$agent" &
  pids+=($!)
done

trap 'echo "Stopping agents..."; kill "${pids[@]}" 2>/dev/null || true' INT TERM

wait "${pids[@]}"
