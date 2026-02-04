import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export async function runMigrations(client, options = {}) {
  const dir = options.dir || DEFAULT_MIGRATIONS_DIR;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedRes = await client.query('SELECT id FROM schema_migrations');
  const applied = new Set(appliedRes.rows.map((row) => row.id));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sqlPath = path.join(dir, file);
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[relay] migration applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
}
