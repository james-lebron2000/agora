import { useEffect, useMemo, useState } from 'react'
import { resolveRelayUrl } from '../lib/relayUrl'

type AlertItem = {
  code: string
  severity: 'high' | 'medium' | 'low' | string
  message: string
  value: number
  threshold: number
}

type OpsDashboardPayload = {
  generated_at: string
  escrow?: {
    treasury_key_configured?: boolean
  }
  payments: {
    attempts: number
    verified: number
    failed: number
    success_rate: number | null
  }
  http: {
    total_requests: number
    total_5xx: number
    error_rate_5xx: number
    p95_latency_ms: number | null
    long_poll_requests?: number
    long_poll_p95_latency_ms?: number | null
  }
  reconciliation: {
    payment_records: number
    settlements: number
    diff_count: number
    diff_amount: number
    stale_held_count: number
  }
  compensation: {
    running: boolean
    last_started_at: string | null
    last_finished_at: string | null
    last_summary: {
      enqueued?: number
      processed?: number
      succeeded?: number
      failed?: number
    } | null
  }
  latest_reconciliation_report?: {
    report_id: string | null
    generated_at: string | null
    period: string | null
    mismatch_count: number
    mismatch_amount: number
  } | null
  alerts: AlertItem[]
}

type OpsResponse = {
  ok: boolean
  dashboard?: OpsDashboardPayload
  error?: string
  message?: string
}

type CompensationJob = {
  job_id: string
  request_id: string
  reason: string
  status: string
  attempts: number
  max_attempts: number
  run_after: string
  updated_at: string
  completed_at: string | null
  last_error: string | null
  metadata?: any
}

type CompensationJobsResponse = {
  ok: boolean
  total?: number
  jobs?: CompensationJob[]
  error?: string
  message?: string
}

type OpsActionResponse = {
  ok: boolean
  error?: string
  message?: string
}

const percent = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
const TOKEN_STORAGE_KEY = 'agora_ops_admin_token'

function formatPercent(value: number | null): string {
  if (value == null || Number.isNaN(value)) return 'N/A'
  return percent.format(value)
}

function severityClass(severity: string) {
  if (severity === 'high') return 'bg-red-50 border-red-200 text-red-700'
  if (severity === 'medium') return 'bg-yellow-50 border-yellow-200 text-yellow-700'
  return 'bg-blue-50 border-blue-200 text-blue-700'
}

export function OpsMonitoringPanel() {
  const relayUrl = useMemo(() => resolveRelayUrl(), [])
  const [dashboard, setDashboard] = useState<OpsDashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [opsToken, setOpsToken] = useState('')
  const [tokenTouched, setTokenTouched] = useState(false)
  const [jobs, setJobs] = useState<CompensationJob[]>([])
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY) || ''
    if (stored) setOpsToken(stored)
  }, [])

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    const headers: Record<string, string> = {}
    if (opsToken.trim()) {
      headers.Authorization = `Bearer ${opsToken.trim()}`
    }

    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${relayUrl}/v1/ops/dashboard`, { headers })
        const json = (await res.json()) as OpsResponse
        if (!res.ok || !json.ok || !json.dashboard) {
          throw new Error(json.message || json.error || `Failed to load ops dashboard (${res.status})`)
        }
        if (!active) return
        setDashboard(json.dashboard)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (active) setLoading(false)
      }
    }

    const fetchJobs = async () => {
      try {
        const res = await fetch(`${relayUrl}/v1/ops/compensation/jobs?limit=20`, { headers })
        const json = (await res.json()) as CompensationJobsResponse
        if (!res.ok || !json.ok) {
          throw new Error(json.message || json.error || `Failed to load compensation jobs (${res.status})`)
        }
        if (!active) return
        setJobs(Array.isArray(json.jobs) ? json.jobs : [])
        setJobsError(null)
      } catch (err) {
        if (!active) return
        setJobs([])
        setJobsError(err instanceof Error ? err.message : 'Failed to load compensation jobs')
      }
    }

    fetchDashboard().catch(() => {})
    fetchJobs().catch(() => {})
    timer = setInterval(() => {
      fetchDashboard().catch(() => {})
      fetchJobs().catch(() => {})
    }, 8000)

    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [opsToken, relayUrl])

  const runCompensation = async () => {
    setActionBusy(true)
    setActionStatus(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (opsToken.trim()) headers.Authorization = `Bearer ${opsToken.trim()}`
      const res = await fetch(`${relayUrl}/v1/ops/compensation/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ trigger: 'web_ops' }),
      })
      const json = (await res.json()) as OpsActionResponse
      if (!res.ok || !json.ok) throw new Error(json.message || json.error || `Failed (${res.status})`)
      setActionStatus('Compensation worker triggered.')
    } catch (err) {
      setActionStatus(err instanceof Error ? err.message : 'Compensation trigger failed')
    } finally {
      setActionBusy(false)
    }
  }

  const generateReconciliationReport = async () => {
    setActionBusy(true)
    setActionStatus(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (opsToken.trim()) headers.Authorization = `Bearer ${opsToken.trim()}`
      const res = await fetch(`${relayUrl}/v1/ops/reconciliation/report`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ period: '24h' }),
      })
      const json = (await res.json()) as OpsActionResponse
      if (!res.ok || !json.ok) throw new Error(json.message || json.error || `Failed (${res.status})`)
      setActionStatus('Reconciliation report generated.')
    } catch (err) {
      setActionStatus(err instanceof Error ? err.message : 'Reconciliation report failed')
    } finally {
      setActionBusy(false)
    }
  }

  const saveToken = () => {
    if (typeof window === 'undefined') return
    const trimmed = opsToken.trim()
    if (trimmed) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, trimmed)
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
    setTokenTouched(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-bold text-agora-900">Ops Monitoring</h3>
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={opsToken}
            onChange={(event) => setOpsToken(event.target.value)}
            placeholder="Ops admin token"
            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-agora-200/60"
          />
          <button
            onClick={saveToken}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-300 hover:bg-gray-50"
          >
            Save Token
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-4 bg-white rounded-2xl border border-gray-200 text-sm text-gray-500">
          Loading ops dashboard...
        </div>
      ) : null}

      {error ? (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-sm text-red-700">
          Ops dashboard unavailable: {error}
          {tokenTouched ? null : (
            <div className="text-xs mt-1 text-red-600">If ops auth is enabled, save `AGORA_OPS_ADMIN_TOKEN` above.</div>
          )}
        </div>
      ) : null}

      {!dashboard || error ? null : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Updated {new Date(dashboard.generated_at).toLocaleTimeString()}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={actionBusy}
              onClick={() => runCompensation().catch(() => {})}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Run Compensation
            </button>
            <button
              disabled={actionBusy}
              onClick={() => generateReconciliationReport().catch(() => {})}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Generate Reconciliation
            </button>
            {typeof dashboard.escrow?.treasury_key_configured === 'boolean' ? (
              <span className={`px-3 py-1.5 text-xs rounded-md border ${dashboard.escrow.treasury_key_configured ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                treasury key: {dashboard.escrow.treasury_key_configured ? 'configured' : 'missing'}
              </span>
            ) : null}
            {actionStatus ? (
              <span className="text-xs text-gray-600">{actionStatus}</span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">Payment Success</div>
              <div className="text-xl font-semibold text-gray-900">{formatPercent(dashboard.payments.success_rate)}</div>
              <div className="text-xs text-gray-500 mt-1">
                attempts {dashboard.payments.attempts} · failed {dashboard.payments.failed}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">HTTP 5xx Rate</div>
              <div className="text-xl font-semibold text-gray-900">{formatPercent(dashboard.http.error_rate_5xx)}</div>
              <div className="text-xs text-gray-500 mt-1">
                5xx {dashboard.http.total_5xx} / {dashboard.http.total_requests}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">HTTP p95</div>
              <div className="text-xl font-semibold text-gray-900">{dashboard.http.p95_latency_ms ?? 'N/A'}ms</div>
              <div className="text-xs text-gray-500 mt-1">
                long-poll p95 {dashboard.http.long_poll_p95_latency_ms ?? 'N/A'}ms
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">Reconciliation Diff</div>
              <div className="text-xl font-semibold text-gray-900">{dashboard.reconciliation.diff_count}</div>
              <div className="text-xs text-gray-500 mt-1">
                amount {money.format(dashboard.reconciliation.diff_amount)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Compensation Worker</div>
              <div className="text-sm text-gray-800">state: {dashboard.compensation.running ? 'running' : 'idle'}</div>
              <div className="text-xs text-gray-500 mt-1">
                last run: {dashboard.compensation.last_finished_at ? new Date(dashboard.compensation.last_finished_at).toLocaleString() : 'never'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                processed {dashboard.compensation.last_summary?.processed ?? 0} · succeeded {dashboard.compensation.last_summary?.succeeded ?? 0} · failed {dashboard.compensation.last_summary?.failed ?? 0}
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Latest Reconciliation Report</div>
              {dashboard.latest_reconciliation_report ? (
                <>
                  <div className="text-sm text-gray-800">report: {dashboard.latest_reconciliation_report.report_id || 'N/A'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    generated: {dashboard.latest_reconciliation_report.generated_at ? new Date(dashboard.latest_reconciliation_report.generated_at).toLocaleString() : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    mismatch {dashboard.latest_reconciliation_report.mismatch_count} · amount {money.format(dashboard.latest_reconciliation_report.mismatch_amount)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">No report published yet</div>
              )}
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Alerts</div>
            <div className="space-y-2">
              {dashboard.alerts.length === 0 ? (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  No active alerts
                </div>
              ) : dashboard.alerts.map((alert) => (
                <div key={alert.code} className={`text-sm border rounded-md px-3 py-2 ${severityClass(alert.severity)}`}>
                  {alert.message} ({alert.code})
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">Recent Compensation Jobs</div>
              <div className="text-[11px] text-gray-400">/v1/ops/compensation/jobs</div>
            </div>
            {jobsError ? (
              <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                Failed to load jobs: {jobsError}
              </div>
            ) : null}
            {jobs.length === 0 && !jobsError ? (
              <div className="mt-2 text-sm text-gray-500">No jobs yet</div>
            ) : null}
            {jobs.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-3">status</th>
                      <th className="py-2 pr-3">reason</th>
                      <th className="py-2 pr-3">request</th>
                      <th className="py-2 pr-3">attempts</th>
                      <th className="py-2 pr-3">run_after</th>
                      <th className="py-2 pr-3">tx</th>
                      <th className="py-2 pr-3">error</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-800">
                    {jobs.map((job) => (
                      <tr key={job.job_id} className="border-t border-gray-100">
                        <td className="py-2 pr-3 font-semibold">{job.status}</td>
                        <td className="py-2 pr-3">{job.reason}</td>
                        <td className="py-2 pr-3 font-mono">{job.request_id}</td>
                        <td className="py-2 pr-3">{job.attempts}/{job.max_attempts}</td>
                        <td className="py-2 pr-3">{job.run_after ? new Date(job.run_after).toLocaleString() : 'N/A'}</td>
                        <td className="py-2 pr-3 font-mono">{job.metadata?.tx_hash ? String(job.metadata.tx_hash).slice(0, 10) + '…' : ''}</td>
                        <td className="py-2 pr-3 text-gray-500">{job.last_error || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
