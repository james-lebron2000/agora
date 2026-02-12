function normalizeSeverity(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (!raw) return null;
  if (raw === 'high' || raw === 'critical' || raw === 'sev1') return 'high';
  if (raw === 'medium' || raw === 'warn' || raw === 'sev2') return 'medium';
  if (raw === 'low' || raw === 'info' || raw === 'sev3') return 'low';
  return raw;
}

function severityRank(sev) {
  const s = normalizeSeverity(sev);
  if (s === 'high') return 3;
  if (s === 'medium') return 2;
  if (s === 'low') return 1;
  return 0;
}

async function postJson(url, payload, { headers = {}, timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

export function createOpsAlerting({
  webhookUrl,
  webhookHeaders,
  suppressWindowMs,
  minSeverity,
  timeoutMs,
  getDashboard,
  logger,
}) {
  const url = String(webhookUrl || '').trim();
  const headers = webhookHeaders && typeof webhookHeaders === 'object' ? webhookHeaders : {};
  const suppressMs = Math.max(5_000, Number(suppressWindowMs || 30 * 60_000));
  const minSev = normalizeSeverity(minSeverity) || 'medium';
  const minRank = severityRank(minSev);
  const requestTimeout = Math.max(1_000, Number(timeoutMs || 8_000));
  const log = logger || console;

  const lastSentByCode = new Map();
  let timer = null;

  function eligibleAlerts(alerts) {
    const now = Date.now();
    const selected = [];
    for (const alert of alerts || []) {
      const code = String(alert?.code || '').trim();
      if (!code) continue;
      const rank = severityRank(alert?.severity);
      if (rank < minRank) continue;
      const last = lastSentByCode.get(code) || 0;
      if (now - last < suppressMs) continue;
      selected.push(alert);
    }
    return selected;
  }

  async function send(trigger) {
    if (!url) return { ok: false, skipped: true, reason: 'no_webhook_url' };
    const dashboard = await getDashboard();
    const alerts = eligibleAlerts(dashboard?.alerts || []);
    if (!alerts.length) return { ok: true, skipped: true, reason: 'no_eligible_alerts' };

    const payload = {
      source: 'agora-relay',
      type: 'ops_alert',
      trigger: trigger || 'interval',
      ts: new Date().toISOString(),
      alert_count: alerts.length,
      alerts,
      dashboard: {
        generated_at: dashboard?.generated_at || null,
        payments: dashboard?.payments || null,
        http: dashboard?.http || null,
        reconciliation: dashboard?.reconciliation || null,
      },
    };

    try {
      const res = await postJson(url, payload, { headers, timeoutMs: requestTimeout });
      if (!res.ok) {
        log.warn?.(`[ops-alert] webhook failed status=${res.status}`);
        return { ok: false, status: res.status };
      }
      const now = Date.now();
      for (const alert of alerts) {
        lastSentByCode.set(String(alert.code), now);
      }
      log.log?.(`[ops-alert] delivered count=${alerts.length} trigger=${trigger || 'interval'}`);
      return { ok: true, status: res.status, delivered: alerts.length };
    } catch (error) {
      log.warn?.(`[ops-alert] webhook error: ${error?.message || error}`);
      return { ok: false, error: error?.message || String(error) };
    }
  }

  function start(pollMs) {
    const interval = Math.max(10_000, Number(pollMs || 60_000));
    if (!url) {
      log.log?.('[ops-alert] disabled (no AGORA_OPS_ALERT_WEBHOOK_URL)');
      return;
    }
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      send('interval').catch(() => {});
    }, interval);
    log.log?.(`[ops-alert] enabled interval_ms=${interval} suppress_ms=${suppressMs} min_severity=${minSev}`);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    start,
    stop,
    sendNow: send,
  };
}

