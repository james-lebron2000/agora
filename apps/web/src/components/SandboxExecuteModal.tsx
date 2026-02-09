import { useMemo, useState } from 'react'

type ExecuteResponse = {
  ok: boolean
  error?: string
  message?: string
  details?: unknown
  execution?: {
    status?: string
    exit_code?: number | null
    signal?: string | null
    duration_ms?: number
    stdout?: string
    stderr?: string
    artifacts?: Array<Record<string, unknown>>
  }
  event_id?: string | null
  event_published?: boolean
}

export function SandboxExecuteModal({
  isOpen,
  onClose,
  relayUrl,
  agentId,
  requestId,
  intent,
}: {
  isOpen: boolean
  onClose: () => void
  relayUrl: string
  agentId: string
  requestId: string
  intent?: string
}) {
  const [code, setCode] = useState<string>(
    `// Sandbox demo: write an artifact and print output.\nimport fs from 'node:fs/promises'\n\nawait fs.writeFile('artifact.txt', 'hello from agora sandbox', 'utf-8')\nconsole.log('OK: artifact written')\n`,
  )
  const [timeoutMs, setTimeoutMs] = useState('4000')
  const [maxMemoryMb, setMaxMemoryMb] = useState('128')
  const [allowNetwork, setAllowNetwork] = useState(false)
  const [artifacts, setArtifacts] = useState('artifact.txt')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<ExecuteResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const payload = useMemo(() => {
    const artifactList = artifacts
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean)

    return {
      agent_id: agentId,
      request_id: requestId,
      intent,
      thread_id: requestId,
      publish_result: true,
      job: {
        language: 'nodejs',
        code,
        timeout_ms: Number(timeoutMs),
        max_memory_mb: Number(maxMemoryMb),
        network: { enabled: allowNetwork },
        artifacts: artifactList,
      },
    }
  }, [agentId, requestId, intent, code, timeoutMs, maxMemoryMb, allowNetwork, artifacts])

  if (!isOpen) return null

  async function run() {
    setIsRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${relayUrl.replace(/\/$/, '')}/v1/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as ExecuteResponse
      if (!res.ok || !json.ok) {
        setError(json.message || json.error || 'Sandbox execution failed')
      }
      setResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={() => {
            if (!isRunning) onClose()
          }}
          disabled={isRunning}
          className="absolute right-4 top-4 text-agora-400 hover:text-agora-600 disabled:opacity-50"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-agora-900">Sandbox Execute</h2>
          <p className="mt-1 text-sm text-agora-500">
            Runs code via relay `POST /v1/execute` and publishes a `RESULT` event back to the feed.
          </p>
          <div className="mt-2 text-xs text-agora-500 font-mono break-all">
            agent_id: {agentId} · request_id: {requestId}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-agora-700">Code (Node.js)</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={14}
              className="w-full rounded-xl border border-agora-200 px-4 py-3 text-xs font-mono focus:border-base-blue focus:outline-none focus:ring-2 focus:ring-base-blue/20"
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-agora-200 bg-agora-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-agora-500">Limits</div>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-agora-700">Timeout (ms)</label>
                  <input
                    type="number"
                    value={timeoutMs}
                    min={100}
                    step={100}
                    onChange={(e) => setTimeoutMs(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-agora-200 px-3 py-2 text-sm focus:border-base-blue focus:outline-none focus:ring-2 focus:ring-base-blue/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-agora-700">Max memory (MB)</label>
                  <input
                    type="number"
                    value={maxMemoryMb}
                    min={32}
                    step={32}
                    onChange={(e) => setMaxMemoryMb(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-agora-200 px-3 py-2 text-sm focus:border-base-blue focus:outline-none focus:ring-2 focus:ring-base-blue/20"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-agora-700">
                  <input
                    type="checkbox"
                    checked={allowNetwork}
                    onChange={(e) => setAllowNetwork(e.target.checked)}
                    className="h-4 w-4 rounded border-agora-300 text-base-blue focus:ring-base-blue/30"
                  />
                  Allow network
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-agora-200 bg-white p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-agora-500">
                Artifacts (one per line)
              </label>
              <textarea
                value={artifacts}
                onChange={(e) => setArtifacts(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-agora-200 px-3 py-2 text-xs font-mono focus:border-base-blue focus:outline-none focus:ring-2 focus:ring-base-blue/20"
              />
              <div className="mt-2 text-xs text-agora-500">
                Artifacts are collected from sandbox writable dir and recorded in the RESULT payload.
              </div>
            </div>

            <button
              onClick={run}
              disabled={isRunning || !code.trim()}
              className="w-full rounded-xl bg-agora-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-agora-800 disabled:opacity-50"
            >
              {isRunning ? 'Running…' : 'Run in Sandbox'}
            </button>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        {result?.execution && (
          <div className="mt-5 rounded-2xl border border-agora-200 bg-agora-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-agora-900">
                Execution: {result.execution.status || 'UNKNOWN'}
              </div>
              <div className="text-xs text-agora-500">
                {typeof result.execution.duration_ms === 'number' ? `${result.execution.duration_ms} ms` : null}
                {result.event_published ? ` · RESULT: ${result.event_id || 'published'}` : null}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-agora-500">stdout</div>
                <pre className="mt-1 max-h-56 overflow-auto rounded-xl bg-agora-950 p-3 text-xs text-agora-100">
                  {result.execution.stdout || ''}
                </pre>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-agora-500">stderr</div>
                <pre className="mt-1 max-h-56 overflow-auto rounded-xl bg-agora-950 p-3 text-xs text-agora-100">
                  {result.execution.stderr || ''}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
