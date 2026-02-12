CREATE TABLE IF NOT EXISTS ledger_journal_entries (
  entry_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_postings (
  posting_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settlements (
  request_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compensation_jobs (
  job_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ops_metric_samples (
  sample_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_transactions (
  tx_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliation_reports (
  report_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ledger_journal_entries_request_idx
  ON ledger_journal_entries ((data->>'request_id'));

CREATE INDEX IF NOT EXISTS ledger_postings_request_idx
  ON ledger_postings ((data->>'request_id'));

CREATE INDEX IF NOT EXISTS ledger_postings_account_idx
  ON ledger_postings ((data->>'account_id'));

CREATE INDEX IF NOT EXISTS compensation_jobs_status_idx
  ON compensation_jobs ((data->>'status'));

CREATE INDEX IF NOT EXISTS compensation_jobs_request_idx
  ON compensation_jobs ((data->>'request_id'));

CREATE INDEX IF NOT EXISTS settlements_status_idx
  ON settlements ((data->>'status'));

CREATE INDEX IF NOT EXISTS ops_metric_samples_ts_idx
  ON ops_metric_samples ((data->>'ts'));

CREATE INDEX IF NOT EXISTS reconciliation_reports_generated_idx
  ON reconciliation_reports ((data->>'generated_at'));
