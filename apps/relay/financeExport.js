function parseIsoDate(value) {
  if (!value) return null;
  const ts = Date.parse(String(value));
  return Number.isFinite(ts) ? ts : null;
}

function formatDay(ts) {
  const date = new Date(ts);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickTimestamp(settlement) {
  const status = String(settlement?.status || '').toUpperCase();
  const candidates = [];
  if (status === 'RELEASED') candidates.push(settlement?.released_at);
  if (status === 'REFUNDED') candidates.push(settlement?.refunded_at);
  candidates.push(settlement?.held_at, settlement?.updated_at, settlement?.created_at);
  for (const value of candidates) {
    const ts = Date.parse(String(value || ''));
    if (Number.isFinite(ts)) return ts;
  }
  return null;
}

export function buildFinanceExport({ settlements, fromTs, toTs, currency }) {
  const from = Number.isFinite(fromTs) ? fromTs : Date.now() - 7 * 24 * 60 * 60 * 1000;
  const to = Number.isFinite(toTs) ? toTs : Date.now();
  const currencyFilter = currency ? String(currency).toUpperCase() : null;

  const rows = [];
  for (const settlement of settlements || []) {
    const ts = pickTimestamp(settlement);
    if (!Number.isFinite(ts)) continue;
    if (ts < from || ts > to) continue;
    if (currencyFilter && String(settlement?.currency || '').toUpperCase() !== currencyFilter) continue;

    rows.push({
      request_id: settlement.request_id,
      status: settlement.status,
      currency: settlement.currency,
      amount_gross: safeNumber(settlement.amount_gross ?? settlement.amount),
      amount_seller: safeNumber(settlement.amount_seller ?? settlement.payout),
      amount_fee: safeNumber(settlement.amount_fee ?? settlement.fee),
      fee_bps: safeNumber(settlement.fee_bps),
      payer: settlement.payer || null,
      payee: settlement.payee || null,
      held_at: settlement.held_at || null,
      released_at: settlement.released_at || null,
      refunded_at: settlement.refunded_at || null,
      updated_at: settlement.updated_at || null,
    });
  }

  rows.sort((a, b) => {
    const ta = Date.parse(String(a.updated_at || a.held_at || a.released_at || a.refunded_at || '')) || 0;
    const tb = Date.parse(String(b.updated_at || b.held_at || b.released_at || b.refunded_at || '')) || 0;
    return tb - ta;
  });

  const totals = {
    platform_fee_revenue: 0,
    seller_payout: 0,
    refunds: 0,
    held: 0,
    released_count: 0,
    refunded_count: 0,
    held_count: 0,
  };

  const daily = new Map();
  const ensureDaily = (day) => {
    const existing = daily.get(day);
    if (existing) return existing;
    const init = {
      day,
      platform_fee_revenue: 0,
      seller_payout: 0,
      refunds: 0,
      held: 0,
      released_count: 0,
      refunded_count: 0,
      held_count: 0,
    };
    daily.set(day, init);
    return init;
  };

  for (const row of rows) {
    const status = String(row.status || '').toUpperCase();
    const ts = pickTimestamp(row);
    const day = Number.isFinite(ts) ? formatDay(ts) : null;
    const bucket = day ? ensureDaily(day) : null;

    if (status === 'RELEASED') {
      totals.platform_fee_revenue += safeNumber(row.amount_fee);
      totals.seller_payout += safeNumber(row.amount_seller);
      totals.released_count += 1;
      if (bucket) {
        bucket.platform_fee_revenue += safeNumber(row.amount_fee);
        bucket.seller_payout += safeNumber(row.amount_seller);
        bucket.released_count += 1;
      }
    } else if (status === 'REFUNDED') {
      totals.refunds += safeNumber(row.amount_gross);
      totals.refunded_count += 1;
      if (bucket) {
        bucket.refunds += safeNumber(row.amount_gross);
        bucket.refunded_count += 1;
      }
    } else if (status === 'HELD') {
      totals.held += safeNumber(row.amount_gross);
      totals.held_count += 1;
      if (bucket) {
        bucket.held += safeNumber(row.amount_gross);
        bucket.held_count += 1;
      }
    }
  }

  const days = Array.from(daily.values()).sort((a, b) => (a.day < b.day ? -1 : 1));
  return {
    generated_at: new Date().toISOString(),
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    currency: currencyFilter,
    totals: {
      ...totals,
      platform_fee_revenue: Number(totals.platform_fee_revenue.toFixed(6)),
      seller_payout: Number(totals.seller_payout.toFixed(6)),
      refunds: Number(totals.refunds.toFixed(6)),
      held: Number(totals.held.toFixed(6)),
    },
    daily: days.map((item) => ({
      ...item,
      platform_fee_revenue: Number(item.platform_fee_revenue.toFixed(6)),
      seller_payout: Number(item.seller_payout.toFixed(6)),
      refunds: Number(item.refunds.toFixed(6)),
      held: Number(item.held.toFixed(6)),
    })),
    rows,
  };
}

function csvEscape(value) {
  const raw = value == null ? '' : String(value);
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
    return `"${raw.replace(/\"/g, '""')}"`;
  }
  return raw;
}

export function financeExportToCsv(exportPayload) {
  const rows = exportPayload?.rows || [];
  const header = [
    'request_id',
    'status',
    'currency',
    'amount_gross',
    'amount_seller',
    'amount_fee',
    'fee_bps',
    'payer',
    'payee',
    'held_at',
    'released_at',
    'refunded_at',
    'updated_at',
  ];
  const lines = [header.join(',')];
  for (const row of rows) {
    const line = header.map((key) => csvEscape(row[key])).join(',');
    lines.push(line);
  }
  return lines.join('\n');
}

export function parseFinanceExportQuery(query) {
  const fromTs = parseIsoDate(query?.from || query?.start || query?.since);
  const toTs = parseIsoDate(query?.to || query?.end || query?.until);
  const currency = query?.currency ? String(query.currency) : null;
  const format = query?.format ? String(query.format).toLowerCase() : 'json';
  return { fromTs, toTs, currency, format };
}

