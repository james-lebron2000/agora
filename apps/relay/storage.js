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
  };
}
