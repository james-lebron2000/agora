/**
 * Analytics Module
 * Comprehensive analytics tracking for events, metrics, and performance monitoring
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type PrivacyLevel = 'strict' | 'balanced' | 'permissive';
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';
export type Severity = 'error' | 'warning' | 'info';
export type AlertSeverity = 'error' | 'warning' | 'info';

export interface AnalyticsConfig {
  autoStart?: boolean;
  debug?: boolean;
  sampleRate?: number;
  privacyLevel?: PrivacyLevel;
  maxBufferSize?: number;
  retentionDays?: number;
  updateIntervalMs?: number;
}

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  category: string;
  action: string;
  metadata: Record<string, unknown>;
  userId?: string;
  agentId?: string;
  sessionId?: string;
  severity?: Severity;
  value?: number;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  startTime?: number;
  endTime?: number;
  categories?: string[];
}

export interface PrivacyContext {
  userConsent: boolean;
  anonymizeIp: boolean;
  allowedCategories: string[];
}

export interface MetricValue {
  name: string;
  value: number;
  type: MetricType;
  labels: Record<string, string>;
  timestamp: number;
  description?: string;
  unit?: string;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesData {
  metricName: string;
  metricType: MetricType;
  data: Array<{ timestamp: number; value: number; labels?: Record<string, string> }>;
}

export interface AggregatedMetrics {
  metricName: string;
  avg: number;
  min: number;
  max: number;
  sum: number;
  count: number;
  p50?: number;
  p90?: number;
  p95?: number;
  p99?: number;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  metricName?: string;
  threshold?: number;
  currentValue?: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface Session {
  id: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  metadata?: Record<string, unknown>;
}

export interface AgentPerformance {
  agentId: string;
  timestamp: number;
  tasksCompleted: number;
  tasksFailed: number;
  averageTaskDuration: number;
  successRate: number;
  responseTime: number;
  throughput: number;
}

export interface UserEngagement {
  userId: string;
  timestamp: number;
  sessionDuration: number;
  interactions: number;
  featuresUsed: string[];
}

export interface RevenueMetrics {
  timestamp: number;
  totalRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  currency: string;
  byCategory: Map<string, number>;
}

export interface SystemHealth {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  errorRate: number;
  uptime: number;
}

export interface DashboardSnapshot {
  timestamp: number;
  kpis: Record<string, number>;
  recentEvents: AnalyticsEvent[];
  activeSessions: number;
  alerts: Alert[];
  metrics: Map<string, MetricValue[]>;
}

export interface PerformanceMonitor {
  start: () => void;
  end: () => number;
}

// ============================================================================
// EventTracker Class
// ============================================================================

export class EventTracker extends EventEmitter {
  private config: Required<AnalyticsConfig>;
  private events: AnalyticsEvent[] = [];
  private privacyContext: PrivacyContext;
  private isRunning = false;
  private eventCounts: Map<string, number> = new Map();

  private static readonly PRIVACY_CATEGORIES: Record<PrivacyLevel, string[]> = {
    strict: ['system', 'performance', 'security'],
    balanced: ['system', 'performance', 'security', 'error', 'agent', 'user', 'transaction'],
    permissive: ['system', 'performance', 'security', 'error', 'agent', 'user', 'transaction'],
  };

  private static readonly SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

  constructor(config: AnalyticsConfig = {}) {
    super();
    this.config = {
      autoStart: config.autoStart ?? false,
      debug: config.debug ?? false,
      sampleRate: config.sampleRate ?? 1,
      privacyLevel: config.privacyLevel ?? 'balanced',
      maxBufferSize: config.maxBufferSize ?? 1000,
      retentionDays: config.retentionDays ?? 30,
      updateIntervalMs: config.updateIntervalMs ?? 60000,
    };
    this.privacyContext = {
      userConsent: true,
      anonymizeIp: true,
      allowedCategories: EventTracker.PRIVACY_CATEGORIES[this.config.privacyLevel],
    };
    if (this.config.autoStart) {
      this.start();
    }
  }

  start(): void {
    this.isRunning = true;
    this.emit('started');
  }

  stop(): void {
    this.isRunning = false;
    this.emit('stopped');
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private isCategoryAllowed(category: string): boolean {
    return this.privacyContext.allowedCategories.includes(category);
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...metadata };
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (EventTracker.SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[FILTERED]';
      }
    }
    return sanitized;
  }

  private createEvent(
    category: string,
    action: string,
    options: {
      metadata?: Record<string, unknown>;
      userId?: string;
      agentId?: string;
      sessionId?: string;
      severity?: Severity;
      value?: number;
    } = {}
  ): AnalyticsEvent | null {
    if (!this.isCategoryAllowed(category)) {
      return null;
    }

    if (!this.shouldSample()) {
      return null;
    }

    const event: AnalyticsEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      category,
      action,
      metadata: this.sanitizeMetadata(options.metadata || {}),
      userId: options.userId,
      agentId: options.agentId,
      sessionId: options.sessionId,
      severity: options.severity,
      value: options.value,
    };

    // Update event counts
    const key = `${category}:${action}`;
    this.eventCounts.set(key, (this.eventCounts.get(key) || 0) + 1);

    this.events.push(event);

    // Enforce buffer size limit
    if (this.events.length > this.config.maxBufferSize) {
      this.events = this.events.slice(-this.config.maxBufferSize);
    }

    return event;
  }

  trackEvent(
    category: string,
    action: string,
    options?: {
      metadata?: Record<string, unknown>;
      userId?: string;
      agentId?: string;
      sessionId?: string;
    }
  ): AnalyticsEvent | null {
    return this.createEvent(category, action, options);
  }

  trackPageView(
    path: string,
    options?: {
      userId?: string;
      title?: string;
      metadata?: Record<string, unknown>;
    }
  ): AnalyticsEvent | null {
    return this.createEvent('user', 'page_view', {
      ...options,
      metadata: { ...options?.metadata, path, title: options?.title },
    });
  }

  trackInteraction(
    type: string,
    element: string,
    options?: {
      userId?: string;
      value?: number;
      metadata?: Record<string, unknown>;
    }
  ): AnalyticsEvent | null {
    return this.createEvent('user', `interaction_${type}`, {
      ...options,
      metadata: { ...options?.metadata, element, value: options?.value },
    });
  }

  trackAgentEvent(
    agentId: string,
    action: string,
    options?: {
      metadata?: Record<string, unknown>;
      sessionId?: string;
    }
  ): AnalyticsEvent | null {
    return this.createEvent('agent', action, { ...options, agentId });
  }

  trackTransaction(
    type: string,
    value: number,
    currency: string,
    options?: {
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ): AnalyticsEvent | null {
    return this.createEvent('transaction', type, {
      ...options,
      value,
      metadata: { ...options?.metadata, value, currency },
    });
  }

  trackError(
    error: Error,
    category: string = 'error',
    options?: {
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ): AnalyticsEvent | null {
    return this.createEvent(category, 'error', {
      ...options,
      severity: 'error',
      metadata: {
        ...options?.metadata,
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
      },
    });
  }

  getRecentEvents(limit: number, category?: string): AnalyticsEvent[] {
    let events = [...this.events];
    if (category) {
      events = events.filter(e => e.category === category);
    }
    return events.slice(-limit);
  }

  getEventCounts(): Map<string, number> {
    return new Map(this.eventCounts);
  }

  flush(): AnalyticsEvent[] {
    const flushed = [...this.events];
    this.events = [];
    this.emit('flush', flushed);
    return flushed;
  }

  getPrivacyContext(): PrivacyContext {
    return { ...this.privacyContext };
  }

  updatePrivacyContext(context: Partial<PrivacyContext>): void {
    this.privacyContext = { ...this.privacyContext, ...context };
  }
}

// ============================================================================
// MetricsCollector Class
// ============================================================================

export class MetricsCollector extends EventEmitter {
  private config: { maxBufferSize: number; retentionDays: number };
  // Store by unique key (name + sorted labels)
  private metrics: Map<string, MetricValue> = new Map();
  private timeSeries: Map<string, TimeSeriesData> = new Map();

  constructor(config: { maxBufferSize?: number; retentionDays?: number } = {}) {
    super();
    this.config = {
      maxBufferSize: config.maxBufferSize ?? 10000,
      retentionDays: config.retentionDays ?? 30,
    };
  }

  private getMetricKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  private getOrCreateTimeSeries(name: string, type: MetricType): TimeSeriesData {
    if (!this.timeSeries.has(name)) {
      this.timeSeries.set(name, {
        metricName: name,
        metricType: type,
        data: [],
      });
    }
    return this.timeSeries.get(name)!;
  }

  private addTimeSeriesPoint(name: string, type: MetricType, value: number, labels?: Record<string, string>): void {
    const ts = this.getOrCreateTimeSeries(name, type);
    ts.data.push({ timestamp: Date.now(), value, labels });

    // Enforce buffer size
    if (ts.data.length > this.config.maxBufferSize) {
      ts.data = ts.data.slice(-this.config.maxBufferSize);
    }
  }

  increment(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing && existing.type === 'counter') {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      this.metrics.set(key, {
        name,
        value,
        type: 'counter',
        labels,
        timestamp: Date.now(),
      });
    }

    this.addTimeSeriesPoint(name, 'counter', this.metrics.get(key)!.value, labels);
    this.emit('counterIncremented', { name, value, labels });
  }

  gauge(name: string, value: number, labels: Record<string, string> = {}, description?: string, unit?: string): void {
    const key = this.getMetricKey(name, labels);

    this.metrics.set(key, {
      name,
      value,
      type: 'gauge',
      labels,
      timestamp: Date.now(),
      description,
      unit,
    });

    this.addTimeSeriesPoint(name, 'gauge', value, labels);
    this.emit('gaugeSet', { name, value, labels });
  }

  observe(name: string, value: number, labels: Record<string, string> = {}, buckets?: number[]): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing && existing.type === 'histogram') {
      // Update histogram statistics
      const currentCount = (existing.metadata?.count as number) || 0;
      const currentSum = (existing.metadata?.sum as number) || 0;
      existing.value = value;
      existing.timestamp = Date.now();
      existing.metadata = {
        ...existing.metadata,
        count: currentCount + 1,
        sum: currentSum + value,
        buckets,
      };
    } else {
      this.metrics.set(key, {
        name,
        value,
        type: 'histogram',
        labels,
        timestamp: Date.now(),
        metadata: { count: 1, sum: value, buckets },
      });
    }

    this.addTimeSeriesPoint(name, 'histogram', value, labels);
  }

  recordTimer(name: string, duration: number, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);

    this.metrics.set(key, {
      name,
      value: duration,
      type: 'timer',
      labels,
      timestamp: Date.now(),
      unit: 'ms',
    });

    this.addTimeSeriesPoint(name, 'timer', duration, labels);
  }

  startTimer(name: string): (labels?: Record<string, string>) => number {
    const startTime = performance.now();

    return (labels?: Record<string, string>) => {
      const duration = Math.round(performance.now() - startTime);
      this.recordTimer(name, duration, labels);
      return duration;
    };
  }

  getMetrics(): Map<string, MetricValue> {
    return new Map(this.metrics);
  }

  getMetricsByName(name: string): MetricValue[] {
    const result: MetricValue[] = [];
    for (const [key, metric] of this.metrics.entries()) {
      // Check if the key starts with the name followed by '{' or exact match
      if (key === name || key.startsWith(`${name}{`)) {
        result.push(metric);
      }
    }
    return result;
  }

  getTimeSeries(name: string): TimeSeriesData | undefined {
    return this.timeSeries.get(name);
  }

  getAllTimeSeries(): Map<string, TimeSeriesData> {
    return new Map(this.timeSeries);
  }

  aggregate(timeWindow: string, metricNames: string[]): AggregatedMetrics[] {
    const result: AggregatedMetrics[] = [];

    for (const name of metricNames) {
      const ts = this.timeSeries.get(name);
      if (!ts || ts.data.length === 0) continue;

      const values = ts.data.map(d => d.value);
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);

      result.push({
        metricName: name,
        avg: sum / values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        sum,
        count: values.length,
        p50: this.percentile(sorted, 0.5),
        p90: this.percentile(sorted, 0.9),
        p95: this.percentile(sorted, 0.95),
        p99: this.percentile(sorted, 0.99),
      });
    }

    return result;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  reset(): void {
    this.metrics.clear();
    this.timeSeries.clear();
  }

  pruneOldData(): number {
    const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    let pruned = 0;

    for (const [name, ts] of this.timeSeries) {
      const originalLength = ts.data.length;
      ts.data = ts.data.filter(d => d.timestamp >= cutoff);
      pruned += originalLength - ts.data.length;
    }

    return pruned;
  }
}

// ============================================================================
// AnalyticsManager Class
// ============================================================================

export class AnalyticsManager extends EventEmitter {
  private config: Required<AnalyticsConfig>;
  private eventTracker: EventTracker;
  private metricsCollector: MetricsCollector;
  private sessions: Map<string, Session> = new Map();
  private alerts: Alert[] = [];
  private dashboardTimer?: ReturnType<typeof setInterval>;
  private isRunning = false;

  constructor(config: AnalyticsConfig = {}) {
    super();
    this.config = {
      autoStart: config.autoStart ?? true,
      debug: config.debug ?? false,
      sampleRate: config.sampleRate ?? 1,
      privacyLevel: config.privacyLevel ?? 'balanced',
      maxBufferSize: config.maxBufferSize ?? 1000,
      retentionDays: config.retentionDays ?? 30,
      updateIntervalMs: config.updateIntervalMs ?? 60000,
    };

    this.eventTracker = new EventTracker({
      autoStart: false,
      debug: this.config.debug,
      sampleRate: this.config.sampleRate,
      privacyLevel: this.config.privacyLevel,
      maxBufferSize: this.config.maxBufferSize,
    });

    this.metricsCollector = new MetricsCollector({
      maxBufferSize: this.config.maxBufferSize * 10,
      retentionDays: this.config.retentionDays,
    });

    // Forward events
    this.eventTracker.on('flush', (events) => this.emit('flush', events));

    if (this.config.autoStart) {
      this.start();
    }
  }

  start(): void {
    this.isRunning = true;
    this.eventTracker.start();
  }

  stop(): void {
    this.isRunning = false;
    this.eventTracker.stop();
    this.stopDashboard();
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getEventTracker(): EventTracker {
    return this.eventTracker;
  }

  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  // Event tracking proxies
  trackEvent(
    category: string,
    action: string,
    options?: {
      metadata?: Record<string, unknown>;
      userId?: string;
      agentId?: string;
      sessionId?: string;
    }
  ): AnalyticsEvent | null {
    const event = this.eventTracker.trackEvent(category, action, options);
    if (event) {
      this.emit('eventTracked', event);
    }
    return event;
  }

  trackPageView(
    path: string,
    options?: {
      userId?: string;
      title?: string;
      metadata?: Record<string, unknown>;
    }
  ): AnalyticsEvent | null {
    const event = this.eventTracker.trackPageView(path, options);
    if (event) {
      this.emit('eventTracked', event);
    }
    return event;
  }

  trackInteraction(
    type: string,
    element: string,
    options?: {
      userId?: string;
      value?: number;
      metadata?: Record<string, unknown>;
    }
  ): AnalyticsEvent | null {
    const event = this.eventTracker.trackInteraction(type, element, options);
    if (event) {
      this.emit('eventTracked', event);
    }
    return event;
  }

  trackError(
    error: Error,
    category?: string,
    options?: {
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ): AnalyticsEvent | null {
    const event = this.eventTracker.trackError(error, category, options);
    if (event) {
      this.emit('eventTracked', event);
    }
    return event;
  }

  // Metrics proxies
  increment(name: string, value?: number, labels?: Record<string, string>): void {
    this.metricsCollector.increment(name, value, labels);
  }

  gauge(name: string, value: number, labels?: Record<string, string>, description?: string, unit?: string): void {
    this.metricsCollector.gauge(name, value, labels, description, unit);
  }

  observe(name: string, value: number, labels?: Record<string, string>, buckets?: number[]): void {
    this.metricsCollector.observe(name, value, labels, buckets);
  }

  recordTimer(name: string, duration: number, labels?: Record<string, string>): void {
    this.metricsCollector.recordTimer(name, duration, labels);
  }

  startTimer(name: string): (labels?: Record<string, string>) => number {
    return this.metricsCollector.startTimer(name);
  }

  // Session management
  startSession(sessionId: string, metadata?: { userId?: string; [key: string]: unknown }): void {
    this.sessions.set(sessionId, {
      id: sessionId,
      userId: metadata?.userId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      metadata,
    });
  }

  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  touchSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  // Alerts
  createAlert(
    severity: AlertSeverity,
    message: string,
    metricName?: string,
    threshold?: number,
    currentValue?: number
  ): Alert {
    const alert: Alert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      message,
      metricName,
      threshold,
      currentValue,
      timestamp: Date.now(),
      acknowledged: false,
    };
    this.alerts.push(alert);
    this.emit('alert', alert);
    return alert;
  }

  getAlerts(includeAcknowledged = true): Alert[] {
    if (includeAcknowledged) {
      return [...this.alerts];
    }
    return this.alerts.filter(a => !a.acknowledged);
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // Performance tracking
  trackAgentPerformance(metrics: AgentPerformance): void {
    this.metricsCollector.gauge(`agent_${metrics.agentId}_success_rate`, metrics.successRate);
    this.metricsCollector.gauge(`agent_${metrics.agentId}_response_time`, metrics.responseTime);
    this.metricsCollector.recordTimer(`agent_${metrics.agentId}_task_duration`, metrics.averageTaskDuration);
  }

  trackUserEngagement(metrics: UserEngagement): void {
    this.metricsCollector.gauge(`user_${metrics.userId}_interactions`, metrics.interactions);
    this.metricsCollector.recordTimer(`user_${metrics.userId}_session_duration`, metrics.sessionDuration);
  }

  trackRevenue(metrics: RevenueMetrics): void {
    this.gauge('revenue_total', metrics.totalRevenue, { currency: metrics.currency });
    this.gauge('revenue_transaction_count', metrics.transactionCount);
    this.gauge('revenue_average_value', metrics.averageTransactionValue, { currency: metrics.currency });

    for (const [category, value] of metrics.byCategory) {
      this.gauge(`revenue_category_${category}`, value);
    }
  }

  trackSystemHealth(metrics: SystemHealth): void {
    this.gauge('system_cpu_usage', metrics.cpuUsage);
    this.gauge('system_memory_usage', metrics.memoryUsage);
    this.gauge('system_disk_usage', metrics.diskUsage);
    this.gauge('system_network_latency', metrics.networkLatency);
    this.gauge('system_error_rate', metrics.errorRate);
    this.gauge('system_uptime', metrics.uptime);
  }

  // Dashboard
  generateDashboardSnapshot(): DashboardSnapshot {
    return {
      timestamp: Date.now(),
      kpis: {
        activeSessions: this.sessions.size,
        totalEvents: this.eventTracker.getRecentEvents(1000).length,
        unacknowledgedAlerts: this.alerts.filter(a => !a.acknowledged).length,
      },
      recentEvents: this.eventTracker.getRecentEvents(50),
      activeSessions: this.sessions.size,
      alerts: [...this.alerts],
      metrics: this.metricsCollector.getAllTimeSeries() as unknown as Map<string, MetricValue[]>,
    };
  }

  startDashboard(options?: { updateIntervalMs?: number }): void {
    const interval = options?.updateIntervalMs ?? this.config.updateIntervalMs;
    this.stopDashboard();
    this.dashboardTimer = setInterval(() => {
      const snapshot = this.generateDashboardSnapshot();
      this.emit('dashboardUpdate', snapshot);
    }, interval);
  }

  stopDashboard(): void {
    if (this.dashboardTimer) {
      clearInterval(this.dashboardTimer);
      this.dashboardTimer = undefined;
    }
  }

  // Export
  export(options: ExportOptions): string {
    const events = this.getFilteredEvents(options);
    const metrics = Array.from(this.metricsCollector.getMetrics().values());

    if (options.format === 'csv') {
      return this.exportToCsv(events);
    }

    return JSON.stringify({
      events,
      metrics,
      exportedAt: Date.now(),
    });
  }

  private getFilteredEvents(options: ExportOptions): AnalyticsEvent[] {
    let events = this.eventTracker.getRecentEvents(10000);

    if (options.startTime) {
      events = events.filter(e => e.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      events = events.filter(e => e.timestamp <= options.endTime!);
    }
    if (options.categories) {
      events = events.filter(e => options.categories!.includes(e.category));
    }

    return events;
  }

  private exportToCsv(events: AnalyticsEvent[]): string {
    const headers = ['timestamp', 'category', 'action', 'id'];
    const rows = events.map(e => `${e.timestamp},${e.category},${e.action},${e.id}`);
    return [headers.join(','), ...rows].join('\n');
  }

  getConfig(): Required<AnalyticsConfig> {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

const managers = new Map<string, AnalyticsManager>();

export function getOrCreateAnalyticsManager(agentId: string, config?: AnalyticsConfig): AnalyticsManager {
  if (!managers.has(agentId)) {
    managers.set(agentId, new AnalyticsManager(config));
  }
  return managers.get(agentId)!;
}

export function getAnalyticsManager(agentId: string): AnalyticsManager | undefined {
  return managers.get(agentId);
}

export function removeAnalyticsManager(agentId: string): boolean {
  const manager = managers.get(agentId);
  if (manager) {
    manager.stop();
    managers.delete(agentId);
    return true;
  }
  return false;
}

export function createPerformanceMonitor(operationName: string, analytics: AnalyticsManager): PerformanceMonitor {
  let endFn: (() => number) | null = null;

  return {
    start: () => {
      endFn = analytics.startTimer(operationName);
    },
    end: () => {
      if (endFn) {
        return endFn();
      }
      return 0;
    },
  };
}
