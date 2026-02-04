#!/usr/bin/env node
import { Client } from 'pg';
import { runMigrations } from './migrations.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[relay] DATABASE_URL is required for migrations.');
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await runMigrations(client);
  console.log('[relay] migrations completed.');
} catch (err) {
  console.error('[relay] migration failed:', err?.message || err);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
