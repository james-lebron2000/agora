#!/usr/bin/env bash
set -euo pipefail

BASE="${RELAY_URL:-http://127.0.0.1:8789}"
OPS_TOKEN="${AGORA_OPS_ADMIN_TOKEN:-}"

if [[ -z "$OPS_TOKEN" ]]; then
  echo "AGORA_OPS_ADMIN_TOKEN is required for /v1/ops/* endpoints" >&2
  exit 1
fi

TMP_JSON="/tmp/agora_finance_export.json"
TMP_CSV="/tmp/agora_finance_export.csv"

curl -fsS "$BASE/v1/ops/finance/export?format=json&limit=5000" \
  -H "Authorization: Bearer $OPS_TOKEN" >"$TMP_JSON"

python3 - <<'PY'
import json
payload=json.load(open("/tmp/agora_finance_export.json","r",encoding="utf-8"))
assert payload.get("ok") is True
exp=payload.get("export") or {}
assert "totals" in exp and "rows" in exp and "daily" in exp
tot=exp["totals"]
for k in ["platform_fee_revenue","seller_payout","refunds","held","released_count","refunded_count","held_count"]:
  assert k in tot
print("finance_export_json_ok rows=", len(exp.get("rows",[])), "days=", len(exp.get("daily",[])))
PY

curl -fsS "$BASE/v1/ops/finance/export?format=csv&limit=5000" \
  -H "Authorization: Bearer $OPS_TOKEN" >"$TMP_CSV"

python3 - <<'PY'
path="/tmp/agora_finance_export.csv"
with open(path,"r",encoding="utf-8") as f:
  header=(f.readline() or "").strip()
assert header.startswith("request_id,status,currency,amount_gross,amount_seller,amount_fee,fee_bps"), header
print("finance_export_csv_ok header_ok")
PY

echo "[test-finance-export] PASS base=$BASE"
