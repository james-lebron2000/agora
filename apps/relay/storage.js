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
  };
}
