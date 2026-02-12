import { Client } from 'pg';
import { runMigrations } from './migrations.js';

export async function createStorage({ databaseUrl }) {
  if (!databaseUrl) {
    return createMemoryStorage();
  }

  try {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    await runMigrations(client);
    return createPostgresStorage(client);
  } catch (err) {
    console.warn('[relay] Failed to connect to DATABASE_URL, falling back to memory storage.', err?.message || err);
    return createMemoryStorage();
  }
}

function createMemoryStorage() {
  const reputations = new Map();
  const escrows = new Map();
  const ledger = new Map();
  const orders = new Map();
  const paymentByRequestAndTx = new Map();
  const paymentByTx = new Map();
  const idempotency = new Map();
  const ledgerJournalEntries = new Map();
  const ledgerPostings = new Map();
  const settlements = new Map();
  const compensationJobs = new Map();
  const opsMetricSamples = new Map();
  const reconciliationReports = new Map();

  return {
    mode: 'memory',
    async getReputation(agentId) {
      return reputations.get(agentId) || null;
    },
    async saveReputation(rep) {
      reputations.set(rep.agent_id, rep);
      return rep;
    },
    async listReputations() {
      return Array.from(reputations.values());
    },
    async getEscrow(requestId) {
      return escrows.get(requestId) || null;
    },
    async saveEscrow(record) {
      escrows.set(record.request_id, record);
      return record;
    },
    async listEscrows() {
      return Array.from(escrows.values());
    },
    async getLedgerAccount(id) {
      return ledger.get(id) || null;
    },
    async saveLedgerAccount(account) {
      ledger.set(account.id, account);
      return account;
    },
    async listLedgerAccounts() {
      return Array.from(ledger.values());
    },
    async getOrder(requestId) {
      return orders.get(requestId) || null;
    },
    async saveOrder(order) {
      orders.set(order.request_id, order);
      return order;
    },
    async listOrders() {
      return Array.from(orders.values());
    },
    async getPaymentRecord(requestId, txHash) {
      return paymentByRequestAndTx.get(`${requestId}:${txHash}`) || null;
    },
    async getPaymentRecordByTxHash(txHash) {
      return paymentByTx.get(txHash) || null;
    },
    async createPaymentRecord(record) {
      const compositeKey = `${record.request_id}:${record.tx_hash}`;
      const existingByComposite = paymentByRequestAndTx.get(compositeKey);
      if (existingByComposite) {
        return { ok: false, conflict: 'request_tx', existing: existingByComposite };
      }
      const existingByTx = paymentByTx.get(record.tx_hash);
      if (existingByTx) {
        return { ok: false, conflict: 'tx_hash', existing: existingByTx };
      }
      paymentByRequestAndTx.set(compositeKey, record);
      paymentByTx.set(record.tx_hash, record);
      return { ok: true, record };
    },
    async listPaymentRecords() {
      return Array.from(paymentByRequestAndTx.values());
    },
    async getIdempotencyRecord(idempotencyKey) {
      return idempotency.get(idempotencyKey) || null;
    },
    async saveIdempotencyRecord(record) {
      idempotency.set(record.idempotency_key, record);
      return record;
    },
    async getLedgerJournalEntry(entryId) {
      return ledgerJournalEntries.get(entryId) || null;
    },
    async saveLedgerJournalEntry(entry) {
      ledgerJournalEntries.set(entry.entry_id, entry);
      return entry;
    },
    async listLedgerJournalEntries(filters = {}) {
      const requestId = filters.request_id || filters.requestId || null;
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 200;
      const rows = Array.from(ledgerJournalEntries.values())
        .filter((entry) => !requestId || String(entry.request_id || '') === String(requestId))
        .sort((a, b) => Date.parse(b.created_at || b.updated_at || 0) - Date.parse(a.created_at || a.updated_at || 0))
        .slice(0, limit);
      return rows;
    },
    async saveLedgerPosting(posting) {
      ledgerPostings.set(posting.posting_id, posting);
      return posting;
    },
    async listLedgerPostings(filters = {}) {
      const requestId = filters.request_id || filters.requestId || null;
      const entryId = filters.entry_id || filters.entryId || null;
      const accountId = filters.account_id || filters.accountId || null;
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 500;
      const rows = Array.from(ledgerPostings.values())
        .filter((posting) => (!requestId || String(posting.request_id || '') === String(requestId)))
        .filter((posting) => (!entryId || String(posting.entry_id || '') === String(entryId)))
        .filter((posting) => (!accountId || String(posting.account_id || '') === String(accountId)))
        .sort((a, b) => Date.parse(b.created_at || b.updated_at || 0) - Date.parse(a.created_at || a.updated_at || 0))
        .slice(0, limit);
      return rows;
    },
    async getSettlement(requestId) {
      return settlements.get(requestId) || null;
    },
    async saveSettlement(record) {
      settlements.set(record.request_id, record);
      return record;
    },
    async listSettlements(filters = {}) {
      const status = filters.status ? String(filters.status).toUpperCase() : null;
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 500;
      return Array.from(settlements.values())
        .filter((record) => !status || String(record.status || '').toUpperCase() === status)
        .sort((a, b) => Date.parse(b.updated_at || 0) - Date.parse(a.updated_at || 0))
        .slice(0, limit);
    },
    async getCompensationJob(jobId) {
      return compensationJobs.get(jobId) || null;
    },
    async saveCompensationJob(job) {
      compensationJobs.set(job.job_id, job);
      return job;
    },
    async listCompensationJobs(filters = {}) {
      const status = filters.status ? String(filters.status).toUpperCase() : null;
      const requestId = filters.request_id || filters.requestId || null;
      const dueBefore = filters.due_before || filters.dueBefore || null;
      const dueBeforeTs = dueBefore ? Date.parse(String(dueBefore)) : null;
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 500;
      return Array.from(compensationJobs.values())
        .filter((job) => !status || String(job.status || '').toUpperCase() === status)
        .filter((job) => !requestId || String(job.request_id || '') === String(requestId))
        .filter((job) => {
          if (!Number.isFinite(dueBeforeTs)) return true;
          const runAfterTs = Date.parse(job.run_after || '');
          return Number.isFinite(runAfterTs) && runAfterTs <= dueBeforeTs;
        })
        .sort((a, b) => Date.parse(a.run_after || 0) - Date.parse(b.run_after || 0))
        .slice(0, limit);
    },
    async saveOpsMetricSample(sample) {
      opsMetricSamples.set(sample.sample_id, sample);
      return sample;
    },
    async listOpsMetricSamples(filters = {}) {
      const type = filters.type ? String(filters.type) : null;
      const since = filters.since ? Date.parse(String(filters.since)) : null;
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 1000;
      return Array.from(opsMetricSamples.values())
        .filter((sample) => !type || sample.type === type)
        .filter((sample) => {
          if (!Number.isFinite(since)) return true;
          const ts = Date.parse(sample.ts || sample.updated_at || '');
          return Number.isFinite(ts) && ts >= since;
        })
        .sort((a, b) => Date.parse(b.ts || b.updated_at || 0) - Date.parse(a.ts || a.updated_at || 0))
        .slice(0, limit);
    },
    async saveReconciliationReport(report) {
      reconciliationReports.set(report.report_id, report);
      return report;
    },
    async listReconciliationReports(filters = {}) {
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 200;
      return Array.from(reconciliationReports.values())
        .sort((a, b) => Date.parse(b.generated_at || b.updated_at || 0) - Date.parse(a.generated_at || a.updated_at || 0))
        .slice(0, limit);
    },
  };
}

function createPostgresStorage(client) {
  return {
    mode: 'postgres',
    async getReputation(agentId) {
      const res = await client.query('SELECT data FROM reputations WHERE agent_id = $1', [agentId]);
      return res.rows[0]?.data || null;
    },
    async saveReputation(rep) {
      await client.query(
        `INSERT INTO reputations (agent_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (agent_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [rep.agent_id, rep]
      );
      return rep;
    },
    async listReputations() {
      const res = await client.query('SELECT data FROM reputations ORDER BY updated_at DESC');
      return res.rows.map((row) => row.data);
    },
    async getEscrow(requestId) {
      const res = await client.query('SELECT data FROM escrows WHERE request_id = $1', [requestId]);
      return res.rows[0]?.data || null;
    },
    async saveEscrow(record) {
      await client.query(
        `INSERT INTO escrows (request_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (request_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [record.request_id, record]
      );
      return record;
    },
    async listEscrows() {
      const res = await client.query('SELECT data FROM escrows ORDER BY updated_at DESC');
      return res.rows.map((row) => row.data);
    },
    async getLedgerAccount(id) {
      const res = await client.query('SELECT data FROM ledger_accounts WHERE id = $1', [id]);
      return res.rows[0]?.data || null;
    },
    async saveLedgerAccount(account) {
      await client.query(
        `INSERT INTO ledger_accounts (id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [account.id, account]
      );
      return account;
    },
    async listLedgerAccounts() {
      const res = await client.query('SELECT data FROM ledger_accounts ORDER BY updated_at DESC');
      return res.rows.map((row) => row.data);
    },
    async getOrder(requestId) {
      const res = await client.query('SELECT data FROM orders WHERE request_id = $1', [requestId]);
      return res.rows[0]?.data || null;
    },
    async saveOrder(order) {
      await client.query(
        `INSERT INTO orders (request_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (request_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [order.request_id, order]
      );
      return order;
    },
    async listOrders() {
      const res = await client.query('SELECT data FROM orders ORDER BY updated_at DESC');
      return res.rows.map((row) => row.data);
    },
    async getPaymentRecord(requestId, txHash) {
      const res = await client.query(
        'SELECT data FROM payment_records WHERE request_id = $1 AND tx_hash = $2',
        [requestId, txHash]
      );
      return res.rows[0]?.data || null;
    },
    async getPaymentRecordByTxHash(txHash) {
      const res = await client.query('SELECT data FROM payment_records WHERE tx_hash = $1', [txHash]);
      return res.rows[0]?.data || null;
    },
    async createPaymentRecord(record) {
      try {
        await client.query(
          `INSERT INTO payment_records (request_id, tx_hash, data, updated_at)
           VALUES ($1, $2, $3, NOW())`,
          [record.request_id, record.tx_hash, record]
        );
        return { ok: true, record };
      } catch (err) {
        if (err?.code === '23505') {
          const existing = await this.getPaymentRecordByTxHash(record.tx_hash);
          return { ok: false, conflict: 'tx_hash', existing };
        }
        throw err;
      }
    },
    async listPaymentRecords() {
      const res = await client.query('SELECT data FROM payment_records ORDER BY updated_at DESC');
      return res.rows.map((row) => row.data);
    },
    async getIdempotencyRecord(idempotencyKey) {
      const res = await client.query(
        'SELECT data FROM idempotency_records WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      return res.rows[0]?.data || null;
    },
    async saveIdempotencyRecord(record) {
      await client.query(
        `INSERT INTO idempotency_records (idempotency_key, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (idempotency_key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [record.idempotency_key, record]
      );
      return record;
    },
    async getLedgerJournalEntry(entryId) {
      const res = await client.query('SELECT data FROM ledger_journal_entries WHERE entry_id = $1', [entryId]);
      return res.rows[0]?.data || null;
    },
    async saveLedgerJournalEntry(entry) {
      await client.query(
        `INSERT INTO ledger_journal_entries (entry_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (entry_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [entry.entry_id, entry]
      );
      return entry;
    },
    async listLedgerJournalEntries(filters = {}) {
      const requestId = filters.request_id || filters.requestId || null;
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 200;
      const values = [];
      const where = [];
      if (requestId) {
        values.push(String(requestId));
        where.push(`data->>'request_id' = $${values.length}`);
      }
      values.push(limit);
      const sql = `
        SELECT data
        FROM ledger_journal_entries
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY updated_at DESC
        LIMIT $${values.length}
      `;
      const res = await client.query(sql, values);
      return res.rows.map((row) => row.data);
    },
    async saveLedgerPosting(posting) {
      await client.query(
        `INSERT INTO ledger_postings (posting_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (posting_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [posting.posting_id, posting]
      );
      return posting;
    },
    async listLedgerPostings(filters = {}) {
      const requestId = filters.request_id || filters.requestId || null;
      const entryId = filters.entry_id || filters.entryId || null;
      const accountId = filters.account_id || filters.accountId || null;
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 500;
      const values = [];
      const where = [];
      if (requestId) {
        values.push(String(requestId));
        where.push(`data->>'request_id' = $${values.length}`);
      }
      if (entryId) {
        values.push(String(entryId));
        where.push(`data->>'entry_id' = $${values.length}`);
      }
      if (accountId) {
        values.push(String(accountId));
        where.push(`data->>'account_id' = $${values.length}`);
      }
      values.push(limit);
      const sql = `
        SELECT data
        FROM ledger_postings
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY updated_at DESC
        LIMIT $${values.length}
      `;
      const res = await client.query(sql, values);
      return res.rows.map((row) => row.data);
    },
    async getSettlement(requestId) {
      const res = await client.query('SELECT data FROM settlements WHERE request_id = $1', [requestId]);
      return res.rows[0]?.data || null;
    },
    async saveSettlement(record) {
      await client.query(
        `INSERT INTO settlements (request_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (request_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [record.request_id, record]
      );
      return record;
    },
    async listSettlements(filters = {}) {
      const status = filters.status ? String(filters.status).toUpperCase() : null;
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 500;
      const values = [];
      const where = [];
      if (status) {
        values.push(status);
        where.push(`UPPER(COALESCE(data->>'status', '')) = $${values.length}`);
      }
      values.push(limit);
      const sql = `
        SELECT data
        FROM settlements
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY updated_at DESC
        LIMIT $${values.length}
      `;
      const res = await client.query(sql, values);
      return res.rows.map((row) => row.data);
    },
    async getCompensationJob(jobId) {
      const res = await client.query('SELECT data FROM compensation_jobs WHERE job_id = $1', [jobId]);
      return res.rows[0]?.data || null;
    },
    async saveCompensationJob(job) {
      await client.query(
        `INSERT INTO compensation_jobs (job_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (job_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [job.job_id, job]
      );
      return job;
    },
    async listCompensationJobs(filters = {}) {
      const status = filters.status ? String(filters.status).toUpperCase() : null;
      const requestId = filters.request_id || filters.requestId || null;
      const dueBefore = filters.due_before || filters.dueBefore || null;
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 500;
      const values = [];
      const where = [];
      if (status) {
        values.push(status);
        where.push(`UPPER(COALESCE(data->>'status', '')) = $${values.length}`);
      }
      if (requestId) {
        values.push(String(requestId));
        where.push(`data->>'request_id' = $${values.length}`);
      }
      if (dueBefore) {
        values.push(String(dueBefore));
        where.push(`COALESCE(data->>'run_after', '') <= $${values.length}`);
      }
      values.push(limit);
      const sql = `
        SELECT data
        FROM compensation_jobs
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY updated_at DESC
        LIMIT $${values.length}
      `;
      const res = await client.query(sql, values);
      return res.rows.map((row) => row.data);
    },
    async saveOpsMetricSample(sample) {
      await client.query(
        `INSERT INTO ops_metric_samples (sample_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (sample_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [sample.sample_id, sample]
      );
      return sample;
    },
    async listOpsMetricSamples(filters = {}) {
      const type = filters.type ? String(filters.type) : null;
      const since = filters.since ? String(filters.since) : null;
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 1000;
      const values = [];
      const where = [];
      if (type) {
        values.push(type);
        where.push(`data->>'type' = $${values.length}`);
      }
      if (since) {
        values.push(since);
        where.push(`COALESCE(data->>'ts', '') >= $${values.length}`);
      }
      values.push(limit);
      const sql = `
        SELECT data
        FROM ops_metric_samples
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY updated_at DESC
        LIMIT $${values.length}
      `;
      const res = await client.query(sql, values);
      return res.rows.map((row) => row.data);
    },
    async saveReconciliationReport(report) {
      await client.query(
        `INSERT INTO reconciliation_reports (report_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (report_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [report.report_id, report]
      );
      return report;
    },
    async listReconciliationReports(filters = {}) {
      const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 200;
      const res = await client.query(
        'SELECT data FROM reconciliation_reports ORDER BY updated_at DESC LIMIT $1',
        [limit]
      );
      return res.rows.map((row) => row.data);
    },
  };
}
