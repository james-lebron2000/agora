/**
 * Analytics Charts Module
 * Chart data visualization helpers for the Agora SDK Analytics module
 * Compatible with Recharts, Chart.js, and other popular chart libraries
 */
import type { TimeSeriesData, MetricValue } from './analytics.js';
export interface ChartDataPoint {
    x: string | number | Date;
    y: number;
    [key: string]: unknown;
}
export interface LineChartSeries {
    name: string;
    data: ChartDataPoint[];
    color?: string;
    strokeWidth?: number;
}
export interface LineChartData {
    labels: (string | number | Date)[];
    datasets: Array<{
        label: string;
        data: number[];
        borderColor?: string;
        backgroundColor?: string;
        fill?: boolean;
        tension?: number;
        strokeWidth?: number;
    }>;
}
export interface BarChartData {
    labels: string[];
    datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        borderWidth?: number;
    }>;
}
export interface PieChartData {
    labels: string[];
    datasets: Array<{
        data: number[];
        backgroundColor?: string[];
        borderColor?: string | string[];
        borderWidth?: number;
    }>;
}
export interface AreaChartData extends LineChartData {
    datasets: Array<{
        label: string;
        data: number[];
        borderColor?: string;
        backgroundColor?: string;
        fill: true;
        tension?: number;
        strokeWidth?: number;
    }>;
}
export interface KpiMetric {
    label: string;
    value: number;
    previousValue?: number;
    unit?: string;
    trend?: 'up' | 'down' | 'neutral';
    change?: number;
    changeFormatted?: string;
}
export interface KpiCardData {
    title: string;
    metrics: KpiMetric[];
    period?: string;
    timestamp: number;
}
export interface SparklineData {
    data: number[];
    labels?: (string | number | Date)[];
    min: number;
    max: number;
    current: number;
    trend: 'up' | 'down' | 'neutral';
}
export interface HeatmapCell {
    x: string | number;
    y: string | number;
    value: number;
    label?: string;
}
export interface HeatmapData {
    xLabels: (string | number)[];
    yLabels: (string | number)[];
    data: HeatmapCell[];
    min: number;
    max: number;
}
export interface ChartFormatterOptions {
    dateFormat?: 'iso' | 'locale' | 'timestamp' | ((date: Date) => string);
    valueFormatter?: (value: number) => string;
    colorPalette?: string[];
    fillArea?: boolean;
    tension?: number;
    strokeWidth?: number;
}
export interface KpiCardOptions {
    title: string;
    period?: string;
    includePrevious?: boolean;
    unit?: string;
    precision?: number;
}
export interface PercentageChangeOptions {
    includeSign?: boolean;
    includeArrow?: boolean;
    decimalPlaces?: number;
    useUnicodeArrows?: boolean;
}
export type TimeSeriesPoint = {
    timestamp: number;
    value: number;
    labels?: Record<string, string>;
};
export type AggregatedDataPoint = {
    label: string;
    value: number;
    category?: string;
    color?: string;
};
export type CategoryDataPoint = {
    category: string;
    value: number;
    color?: string;
};
export type GenericEvent = {
    [key: string]: unknown;
    timestamp?: number;
};
export declare const DEFAULT_COLOR_PALETTE: string[];
/**
 * Format time-series data for line charts
 * Compatible with Recharts and Chart.js
 */
export declare function toLineChartData(timeSeriesData: TimeSeriesData | TimeSeriesData[], options?: ChartFormatterOptions): LineChartData;
/**
 * Format aggregated data for bar charts
 * Compatible with Recharts and Chart.js
 */
export declare function toBarChartData(aggregatedData: AggregatedDataPoint[] | AggregatedDataPoint[][], options?: ChartFormatterOptions): BarChartData;
/**
 * Format category data for pie/donut charts
 * Compatible with Recharts and Chart.js
 */
export declare function toPieChartData(categoryData: CategoryDataPoint[], options?: ChartFormatterOptions): PieChartData;
/**
 * Format time-series data for area charts
 * Compatible with Recharts and Chart.js
 */
export declare function toAreaChartData(timeSeriesData: TimeSeriesData | TimeSeriesData[], options?: ChartFormatterOptions): AreaChartData;
/**
 * Calculate week-over-week change
 */
export declare function calculateWoW(current: number, previous: number): {
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'neutral';
};
/**
 * Calculate month-over-month change
 */
export declare function calculateMoM(current: number, previous: number): {
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'neutral';
};
/**
 * Calculate year-over-year change
 */
export declare function calculateYoY(current: number, previous: number): {
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'neutral';
};
/**
 * Format percentage change with indicators
 */
export declare function formatPercentageChange(value: number, options?: PercentageChangeOptions): string;
/**
 * Format metrics for KPI cards
 */
export declare function toKpiCardData(metrics: Array<{
    label: string;
    current: number;
    previous?: number;
    unit?: string;
}>, options: KpiCardOptions): KpiCardData;
/**
 * Format time-series data for sparkline (mini chart)
 */
export declare function toSparklineData(timeSeriesData: TimeSeriesData | {
    timestamp: number;
    value: number;
}[]): SparklineData;
/**
 * Format events data for heatmap visualization
 */
export declare function toHeatmapData<T extends GenericEvent>(events: T[], timeField: keyof T, categoryField: keyof T, valueField?: keyof T): HeatmapData;
/**
 * Convert MetricValue array to time-series format
 */
export declare function metricsToTimeSeries(metrics: MetricValue[]): TimeSeriesData;
/**
 * Group time-series data by labels
 */
export declare function groupTimeSeriesByLabel(timeSeries: TimeSeriesData, labelKey: string): Record<string, TimeSeriesData>;
/**
 * Normalize time-series data to a common time range
 */
export declare function normalizeTimeSeries(timeSeriesData: TimeSeriesData[], options?: {
    startTime?: number;
    endTime?: number;
    intervalMs?: number;
}): Map<string, TimeSeriesData>;
/**
 * Merge multiple time-series datasets
 */
export declare function mergeTimeSeries(datasets: TimeSeriesData[], mergeStrategy?: 'sum' | 'average' | 'first'): TimeSeriesData;
/**
 * Calculate moving average for time-series data
 */
export declare function calculateMovingAverage(timeSeries: TimeSeriesData, windowSize: number): TimeSeriesData;
//# sourceMappingURL=analytics-charts.d.ts.map