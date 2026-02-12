#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

function parsePeriodToMs(period) {
  const text = String(period || '').trim().toLowerCase();
  const match = text.match(/^(\d+)([hdw])$/);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 'h') return amount * 60 * 60 * 1000;
  if (unit === 'd') return amount * 24 * 60 * 60 * 1000;
  if (unit === 'w') return amount * 7 * 24 * 60 * 60 * 1000;
  return null;
}

function parseArgs(argv) {
  const args = {
    relay: process.env.AGORA_RELAY_URL || 'http://127.0.0.1:8789',
    period: '1d',
    out: '',
    limit: 1000,
    publish: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--relay') args.relay = argv[++i];
    else if (token === '--period') args.period = argv[++i];
    else if (token === '--out') args.out = argv[++i];
    else if (token === '--limit') args.limit = Number(argv[++i] || 1000);
    else if (token === '--publish') args.publish = true;
    else if (token === '--help' || token === '-h') {
      console.log('Usage: node scripts/reconcile-payments.mjs [--relay URL] [--period 1d] [--out path] [--limit 1000] [--publish]');
      process.exit(0);
    }
  }
  return args;
}

function safe(value) {
  if (value == null) return '';
  return String(value).replace(/"/g, '""');
}

async function fetchJson(url, init = undefined) {
  const response = await fetch(url, init);
  const json = await response.json();
  return { ok: response.ok, status: response.status, json };
}

function compareAmount(a, b) {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return Math.abs(left - right) < 0.000001;
}

async function main() {
  const args = parseArgs(process.argv);
  const periodMs = parsePeriodToMs(args.period);
  if (!periodMs) {
    console.error(`Invalid --period "${args.period}". Expected values like 24h, 1d, 7d.`);
    process.exit(1);
  }

  const now = Date.now();
  const sinceIso = new Date(now - periodMs).toISOString();
  const relayBase = args.relay.replace(/\/$/, '');

  const recordsUrl = new URL(`${relayBase}/v1/payments/records`);
  recordsUrl.searchParams.set('since', sinceIso);
  recordsUrl.searchParams.set('limit', String(args.limit));

  const recordsResp = await fetchJson(recordsUrl.toString());
  if (!recordsResp.ok || !recordsResp.json?.ok) {
    console.error('Failed to fetch payment records:', JSON.stringify(recordsResp.json));
    process.exit(1);
  }

  const records = Array.isArray(recordsResp.json.records) ? recordsResp.json.records : [];
  const rows = [];
  let matched = 0;
  let pending = 0;
  let mismatched = 0;
  let failed = 0;
  let mismatchAmount = 0;

  for (const record of records) {
    const verifyPayload = {
      tx_hash: record.tx_hash,
      chain: record.chain,
      token: record.token,
      payer: record.payer,
      payee: record.payee,
      amount: record.amount,
    };

    const verifyResp = await fetchJson(`${relayBase}/v1/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyPayload),
    });

    const row = {
      request_id: record.request_id,
      tx_hash: record.tx_hash,
      expected_token: record.token,
      expected_chain: record.chain,
      expected_amount: record.amount,
      expected_payer: record.payer,
      expected_payee: record.payee,
      verify_ok: Boolean(verifyResp.json?.ok),
      verify_error: verifyResp.json?.error || '',
      verify_message: verifyResp.json?.message || '',
      verdict: 'FAILED',
    };

    if (!verifyResp.ok || !verifyResp.json?.ok) {
      if (verifyResp.json?.pending) {
        row.verdict = 'PENDING';
        pending += 1;
      } else {
        row.verdict = 'FAILED';
        failed += 1;
      }
      rows.push(row);
      continue;
    }

    const payment = verifyResp.json.payment || {};
    const isSynthetic = String(payment.status || '').toUpperCase() === 'VERIFIED_SYNTHETIC';
    const isMatch = isSynthetic
      ? String(payment.tx_hash || '').toLowerCase() === String(record.tx_hash || '').toLowerCase()
      : (
        String(payment.token || '').toUpperCase() === String(record.token || '').toUpperCase()
        && String(payment.chain || '').toLowerCase() === String(record.chain || '').toLowerCase()
        && String(payment.payer || '').toLowerCase() === String(record.payer || '').toLowerCase()
        && String(payment.payee || '').toLowerCase() === String(record.payee || '').toLowerCase()
        && compareAmount(payment.amount, record.amount)
      );

    if (isMatch) {
      row.verdict = 'MATCHED';
      matched += 1;
    } else {
      row.verdict = 'MISMATCHED';
      row.verify_amount = payment.amount ?? '';
      row.verify_payer = payment.payer ?? '';
      row.verify_payee = payment.payee ?? '';
      mismatched += 1;
      mismatchAmount += Number(record.amount || 0);
    }
    rows.push(row);
  }

  const report = {
    generated_at: new Date(now).toISOString(),
    relay: relayBase,
    period: args.period,
    since: sinceIso,
    totals: {
      records: records.length,
      matched,
      mismatched,
      pending,
      failed,
      mismatch_amount: mismatchAmount,
    },
    rows,
  };

  const ts = new Date(now).toISOString().replace(/[:.]/g, '-');
  const outBase = args.out || path.join('logs', `reconcile-${ts}`);
  const jsonPath = outBase.endsWith('.json') ? outBase : `${outBase}.json`;
  const csvPath = outBase.endsWith('.csv') ? outBase : `${outBase}.csv`;

  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  const header = [
    'request_id',
    'tx_hash',
    'expected_token',
    'expected_chain',
    'expected_amount',
    'expected_payer',
    'expected_payee',
    'verify_ok',
    'verify_error',
    'verify_message',
    'verdict',
  ];
  const csvLines = [header.join(',')];
  for (const row of rows) {
    csvLines.push(header.map((key) => `"${safe(row[key])}"`).join(','));
  }
  await fs.writeFile(csvPath, `${csvLines.join('\n')}\n`, 'utf-8');

  if (args.publish) {
    const publishResp = await fetchJson(`${relayBase}/v1/ops/reconciliation/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generated_at: report.generated_at,
        relay: relayBase,
        period: args.period,
        mismatch_count: mismatched + failed,
        mismatch_amount: mismatchAmount,
        counts: report.totals,
        data: {
          since: report.since,
          rows: report.rows,
        },
      }),
    });
    if (!publishResp.ok || !publishResp.json?.ok) {
      console.error('[reconcile] failed to publish report:', JSON.stringify(publishResp.json));
    } else {
      console.log(`[reconcile] published report_id=${publishResp.json.report?.report_id || 'unknown'}`);
    }
  }

  console.log('[reconcile] done');
  console.log(`[reconcile] records=${records.length} matched=${matched} mismatched=${mismatched} pending=${pending} failed=${failed}`);
  console.log(`[reconcile] json=${jsonPath}`);
  console.log(`[reconcile] csv=${csvPath}`);
}

main().catch((error) => {
  console.error('[reconcile] failed:', error?.stack || String(error));
  process.exit(1);
});
