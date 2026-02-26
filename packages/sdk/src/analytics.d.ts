/**
 * Analytics Module
 * Comprehensive analytics tracking for events, metrics, and performance monitoring
 */
import { EventEmitter } from 'events';
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
    data: Array<{
        timestamp: number;
        value: number;
        labels?: Record<string, string>;
    }>;
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
export declare class EventTracker extends EventEmitter {
    private config;
    private events;
    private privacyContext;
    private isRunning;
    private eventCounts;
    private static readonly PRIVACY_CATEGORIES;
    private static readonly SENSITIVE_FIELDS;
    constructor(config?: AnalyticsConfig);
    start(): void;
    stop(): void;
    getIsRunning(): boolean;
    private generateId;
    private shouldSample;
    private isCategoryAllowed;
    private sanitizeMetadata;
    private createEvent;
    trackEvent(category: string, action: string, options?: {
        metadata?: Record<string, unknown>;
        userId?: string;
        agentId?: string;
        sessionId?: string;
    }): AnalyticsEvent | null;
    trackPageView(path: string, options?: {
        userId?: string;
        title?: string;
        metadata?: Record<string, unknown>;
    }): AnalyticsEvent | null;
    trackInteraction(type: string, element: string, options?: {
        userId?: string;
        value?: number;
        metadata?: Record<string, unknown>;
    }): AnalyticsEvent | null;
    trackAgentEvent(agentId: string, action: string, options?: {
        metadata?: Record<string, unknown>;
        sessionId?: string;
    }): AnalyticsEvent | null;
    trackTransaction(type: string, value: number, currency: string, options?: {
        userId?: string;
        metadata?: Record<string, unknown>;
    }): AnalyticsEvent | null;
    trackError(error: Error, category?: string, options?: {
        userId?: string;
        metadata?: Record<string, unknown>;
    }): AnalyticsEvent | null;
    getRecentEvents(limit: number, category?: string): AnalyticsEvent[];
    getEventCounts(): Map<string, number>;
    flush(): AnalyticsEvent[];
    getPrivacyContext(): PrivacyContext;
    updatePrivacyContext(context: Partial<PrivacyContext>): void;
}
export declare class MetricsCollector extends EventEmitter {
    private config;
    private metrics;
    private timeSeries;
    constructor(config?: {
        maxBufferSize?: number;
        retentionDays?: number;
    });
    private getMetricKey;
    private getOrCreateTimeSeries;
    private addTimeSeriesPoint;
    increment(name: string, value?: number, labels?: Record<string, string>): void;
    gauge(name: string, value: number, labels?: Record<string, string>, description?: string, unit?: string): void;
    observe(name: string, value: number, labels?: Record<string, string>, buckets?: number[]): void;
    recordTimer(name: string, duration: number, labels?: Record<string, string>): void;
    startTimer(name: string): (labels?: Record<string, string>) => number;
    getMetrics(): Map<string, MetricValue>;
    getMetricsByName(name: string): MetricValue[];
    getTimeSeries(name: string): TimeSeriesData | undefined;
    getAllTimeSeries(): Map<string, TimeSeriesData>;
    aggregate(timeWindow: string, metricNames: string[]): AggregatedMetrics[];
    private percentile;
    reset(): void;
    pruneOldData(): number;
}
export declare class AnalyticsManager extends EventEmitter {
    private config;
    private eventTracker;
    private metricsCollector;
    private sessions;
    private alerts;
    private dashboardTimer?;
    private isRunning;
    constructor(config?: AnalyticsConfig);
    start(): void;
    stop(): void;
    getIsRunning(): boolean;
    getEventTracker(): EventTracker;
    getMetricsCollector(): MetricsCollector;
    trackEvent(category: string, action: string, options?: {
        metadata?: Record<string, unknown>;
        userId?: string;
        agentId?: string;
        sessionId?: string;
    }): AnalyticsEvent | null;
    trackPageView(path: string, options?: {
        userId?: string;
        title?: string;
        metadata?: Record<string, unknown>;
    }): AnalyticsEvent | null;
    trackInteraction(type: string, element: string, options?: {
        userId?: string;
        value?: number;
        metadata?: Record<string, unknown>;
    }): AnalyticsEvent | null;
    trackError(error: Error, category?: string, options?: {
        userId?: string;
        metadata?: Record<string, unknown>;
    }): AnalyticsEvent | null;
    increment(name: string, value?: number, labels?: Record<string, string>): void;
    gauge(name: string, value: number, labels?: Record<string, string>, description?: string, unit?: string): void;
    observe(name: string, value: number, labels?: Record<string, string>, buckets?: number[]): void;
    recordTimer(name: string, duration: number, labels?: Record<string, string>): void;
    startTimer(name: string): (labels?: Record<string, string>) => number;
    startSession(sessionId: string, metadata?: {
        userId?: string;
        [key: string]: unknown;
    }): void;
    endSession(sessionId: string): void;
    touchSession(sessionId: string): void;
    getActiveSessionCount(): number;
    createAlert(severity: AlertSeverity, message: string, metricName?: string, threshold?: number, currentValue?: number): Alert;
    getAlerts(includeAcknowledged?: boolean): Alert[];
    acknowledgeAlert(alertId: string): boolean;
    trackAgentPerformance(metrics: AgentPerformance): void;
    trackUserEngagement(metrics: UserEngagement): void;
    trackRevenue(metrics: RevenueMetrics): void;
    trackSystemHealth(metrics: SystemHealth): void;
    generateDashboardSnapshot(): DashboardSnapshot;
    startDashboard(options?: {
        updateIntervalMs?: number;
    }): void;
    stopDashboard(): void;
    export(options: ExportOptions): string;
    private getFilteredEvents;
    private exportToCsv;
    getConfig(): Required<AnalyticsConfig>;
}
export declare function getOrCreateAnalyticsManager(agentId: string, config?: AnalyticsConfig): AnalyticsManager;
export declare function getAnalyticsManager(agentId: string): AnalyticsManager | undefined;
export declare function removeAnalyticsManager(agentId: string): boolean;
export declare function createPerformanceMonitor(operationName: string, analytics: AnalyticsManager): PerformanceMonitor;
//# sourceMappingURL=analytics.d.ts.map