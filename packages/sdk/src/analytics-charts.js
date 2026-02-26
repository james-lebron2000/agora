/**
 * Analytics Charts Module
 * Chart data visualization helpers for the Agora SDK Analytics module
 * Compatible with Recharts, Chart.js, and other popular chart libraries
 */
// ============================================================================
// Color Palettes
// ============================================================================
export const DEFAULT_COLOR_PALETTE = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
];
// ============================================================================
// Date Formatting Utilities
// ============================================================================
function formatDate(timestamp, format) {
    const date = new Date(timestamp);
    if (typeof format === 'function') {
        return format(date);
    }
    switch (format) {
        case 'iso':
            return date.toISOString();
        case 'locale':
            return date.toLocaleDateString();
        case 'timestamp':
            return timestamp;
        default:
            return date.toLocaleDateString();
    }
}
function getLabelFromPoint(point, format) {
    if (point.labels?.date) {
        return point.labels.date;
    }
    return formatDate(point.timestamp, format);
}
// ============================================================================
// Chart Formatters
// ============================================================================
/**
 * Format time-series data for line charts
 * Compatible with Recharts and Chart.js
 */
export function toLineChartData(timeSeriesData, options = {}) {
    const { dateFormat = 'locale', colorPalette = DEFAULT_COLOR_PALETTE, tension = 0.3, strokeWidth = 2, } = options;
    const datasets = [];
    const allLabels = new Set();
    const dataArray = Array.isArray(timeSeriesData) ? timeSeriesData : [timeSeriesData];
    // Collect all unique labels
    dataArray.forEach(series => {
        series.data.forEach(point => {
            allLabels.add(getLabelFromPoint(point, dateFormat));
        });
    });
    const sortedLabels = Array.from(allLabels).sort((a, b) => {
        if (a instanceof Date && b instanceof Date)
            return a.getTime() - b.getTime();
        if (typeof a === 'number' && typeof b === 'number')
            return a - b;
        return String(a).localeCompare(String(b));
    });
    // Build datasets
    dataArray.forEach((series, index) => {
        const dataMap = new Map(series.data.map(p => [String(getLabelFromPoint(p, dateFormat)), p.value]));
        datasets.push({
            label: series.metricName,
            data: sortedLabels.map(label => dataMap.get(String(label)) ?? 0),
            borderColor: colorPalette[index % colorPalette.length],
            backgroundColor: colorPalette[index % colorPalette.length] + '20', // Add transparency
            fill: false,
            tension,
            strokeWidth,
        });
    });
    return {
        labels: sortedLabels,
        datasets,
    };
}
/**
 * Format aggregated data for bar charts
 * Compatible with Recharts and Chart.js
 */
export function toBarChartData(aggregatedData, options = {}) {
    const { colorPalette = DEFAULT_COLOR_PALETTE, } = options;
    const dataArray = Array.isArray(aggregatedData[0])
        ? aggregatedData
        : [aggregatedData];
    const labels = dataArray[0].map(d => d.label);
    const datasets = dataArray.map((series, index) => ({
        label: series[0]?.category || `Series ${index + 1}`,
        data: series.map(d => d.value),
        backgroundColor: series.map((d, i) => d.color || colorPalette[(index * series.length + i) % colorPalette.length]),
        borderWidth: 1,
    }));
    return { labels, datasets };
}
/**
 * Format category data for pie/donut charts
 * Compatible with Recharts and Chart.js
 */
export function toPieChartData(categoryData, options = {}) {
    const { colorPalette = DEFAULT_COLOR_PALETTE, } = options;
    return {
        labels: categoryData.map(d => d.category),
        datasets: [{
                data: categoryData.map(d => d.value),
                backgroundColor: categoryData.map((d, i) => d.color || colorPalette[i % colorPalette.length]),
                borderColor: '#ffffff',
                borderWidth: 2,
            }],
    };
}
/**
 * Format time-series data for area charts
 * Compatible with Recharts and Chart.js
 */
export function toAreaChartData(timeSeriesData, options = {}) {
    const { dateFormat = 'locale', colorPalette = DEFAULT_COLOR_PALETTE, tension = 0.4, strokeWidth = 2, } = options;
    const lineData = toLineChartData(timeSeriesData, {
        dateFormat,
        colorPalette,
        tension,
        strokeWidth,
    });
    return {
        ...lineData,
        datasets: lineData.datasets.map((dataset, index) => ({
            ...dataset,
            fill: true,
            backgroundColor: colorPalette[index % colorPalette.length] + '40', // More transparency for area
        })),
    };
}
// ============================================================================
// KPI Comparison Utilities
// ============================================================================
/**
 * Calculate week-over-week change
 */
export function calculateWoW(current, previous) {
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    return {
        change,
        changePercent,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    };
}
/**
 * Calculate month-over-month change
 */
export function calculateMoM(current, previous) {
    // Same calculation as WoW, but semantically different
    return calculateWoW(current, previous);
}
/**
 * Calculate year-over-year change
 */
export function calculateYoY(current, previous) {
    // Same calculation as WoW, but semantically different
    return calculateWoW(current, previous);
}
/**
 * Format percentage change with indicators
 */
export function formatPercentageChange(value, options = {}) {
    const { includeSign = true, includeArrow = true, decimalPlaces = 1, useUnicodeArrows = true, } = options;
    const isPositive = value > 0;
    const isNegative = value < 0;
    const isZero = value === 0;
    let result = '';
    if (includeArrow) {
        if (isPositive) {
            result += useUnicodeArrows ? '▲ ' : '+ ';
        }
        else if (isNegative) {
            result += useUnicodeArrows ? '▼ ' : '- ';
        }
        else {
            result += useUnicodeArrows ? '● ' : '= ';
        }
    }
    const absValue = Math.abs(value);
    const formattedValue = absValue.toFixed(decimalPlaces);
    // Only add sign when not using ASCII arrows (which already include the sign)
    if (includeSign && isPositive && (useUnicodeArrows || !includeArrow)) {
        result += '+';
    }
    else if (isNegative && (useUnicodeArrows || !includeArrow)) {
        result += '-';
    }
    result += formattedValue + '%';
    return result;
}
// ============================================================================
// Dashboard Widget Transformers
// ============================================================================
/**
 * Format metrics for KPI cards
 */
export function toKpiCardData(metrics, options) {
    const { title, period = 'Current Period', includePrevious = true, precision = 2, } = options;
    const formattedMetrics = metrics.map(metric => {
        const kpiMetric = {
            label: metric.label,
            value: Number(metric.current.toFixed(precision)),
            unit: metric.unit,
        };
        if (includePrevious && metric.previous !== undefined) {
            const comparison = calculateWoW(metric.current, metric.previous);
            kpiMetric.previousValue = Number(metric.previous.toFixed(precision));
            kpiMetric.trend = comparison.trend;
            kpiMetric.change = Number(comparison.changePercent.toFixed(precision));
            kpiMetric.changeFormatted = formatPercentageChange(comparison.changePercent, {
                includeArrow: true,
                useUnicodeArrows: true,
            });
        }
        return kpiMetric;
    });
    return {
        title,
        metrics: formattedMetrics,
        period,
        timestamp: Date.now(),
    };
}
/**
 * Format time-series data for sparkline (mini chart)
 */
export function toSparklineData(timeSeriesData) {
    let dataPoints;
    if ('metricName' in timeSeriesData) {
        dataPoints = timeSeriesData.data;
    }
    else {
        dataPoints = timeSeriesData;
    }
    const values = dataPoints.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const current = values[values.length - 1] ?? 0;
    const first = values[0] ?? 0;
    const trend = current > first
        ? 'up'
        : current < first
            ? 'down'
            : 'neutral';
    return {
        data: values,
        labels: dataPoints.map(p => p.timestamp),
        min,
        max,
        current,
        trend,
    };
}
/**
 * Format events data for heatmap visualization
 */
export function toHeatmapData(events, timeField, categoryField, valueField) {
    const xSet = new Set();
    const ySet = new Set();
    const cellMap = new Map();
    events.forEach(event => {
        const timeValue = event[timeField];
        const categoryValue = event[categoryField];
        if (timeValue === undefined || categoryValue === undefined)
            return;
        const xKey = typeof timeValue === 'string' || typeof timeValue === 'number'
            ? timeValue
            : String(timeValue);
        const yKey = typeof categoryValue === 'string' || typeof categoryValue === 'number'
            ? categoryValue
            : String(categoryValue);
        xSet.add(xKey);
        ySet.add(yKey);
        const cellKey = `${xKey}|${yKey}`;
        const existing = cellMap.get(cellKey);
        if (valueField && event[valueField] !== undefined) {
            const val = typeof event[valueField] === 'number' ? event[valueField] : 1;
            if (existing) {
                existing.count += 1;
                existing.values.push(val);
            }
            else {
                cellMap.set(cellKey, { count: 1, values: [val] });
            }
        }
        else {
            if (existing) {
                existing.count += 1;
            }
            else {
                cellMap.set(cellKey, { count: 1, values: [] });
            }
        }
    });
    const xLabels = Array.from(xSet).sort((a, b) => String(a).localeCompare(String(b)));
    const yLabels = Array.from(ySet).sort((a, b) => String(a).localeCompare(String(b)));
    const data = [];
    let min = Infinity;
    let max = -Infinity;
    xLabels.forEach(x => {
        yLabels.forEach(y => {
            const cellKey = `${x}|${y}`;
            const cell = cellMap.get(cellKey);
            if (cell) {
                const value = cell.values.length > 0
                    ? cell.values.reduce((a, b) => a + b, 0) / cell.values.length
                    : cell.count;
                min = Math.min(min, value);
                max = Math.max(max, value);
                data.push({
                    x,
                    y,
                    value,
                    label: `${cell.count} events`,
                });
            }
        });
    });
    return {
        xLabels,
        yLabels,
        data,
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 0 : max,
    };
}
// ============================================================================
// Metric Value Transformers
// ============================================================================
/**
 * Convert MetricValue array to time-series format
 */
export function metricsToTimeSeries(metrics) {
    return {
        metricName: metrics[0]?.name || 'unknown',
        metricType: metrics[0]?.type || 'gauge',
        data: metrics.map(m => ({
            timestamp: m.timestamp,
            value: m.value,
            labels: m.labels,
        })),
    };
}
/**
 * Group time-series data by labels
 */
export function groupTimeSeriesByLabel(timeSeries, labelKey) {
    const grouped = {};
    timeSeries.data.forEach(point => {
        const labelValue = point.labels?.[labelKey] || 'default';
        if (!grouped[labelValue]) {
            grouped[labelValue] = {
                metricName: `${timeSeries.metricName}_${labelValue}`,
                metricType: timeSeries.metricType,
                data: [],
            };
        }
        grouped[labelValue].data.push(point);
    });
    return grouped;
}
/**
 * Normalize time-series data to a common time range
 */
export function normalizeTimeSeries(timeSeriesData, options = {}) {
    const { startTime, endTime, intervalMs = 60000 } = options;
    const result = new Map();
    timeSeriesData.forEach(series => {
        const normalizedData = [];
        // Filter by time range
        let filtered = series.data;
        if (startTime) {
            filtered = filtered.filter(p => p.timestamp >= startTime);
        }
        if (endTime) {
            filtered = filtered.filter(p => p.timestamp <= endTime);
        }
        // Group by interval and average
        const buckets = new Map();
        filtered.forEach(point => {
            const bucketKey = Math.floor(point.timestamp / intervalMs) * intervalMs;
            const existing = buckets.get(bucketKey);
            if (existing) {
                existing.sum += point.value;
                existing.count += 1;
                existing.timestamps.push(point.timestamp);
            }
            else {
                buckets.set(bucketKey, { sum: point.value, count: 1, timestamps: [point.timestamp] });
            }
        });
        // Convert buckets back to data points - use min timestamp from bucket for single points
        Array.from(buckets.entries())
            .sort(([a], [b]) => a - b)
            .forEach(([bucketKey, { sum, count, timestamps }]) => {
            // For single-point buckets, use original timestamp; for multi-point, use bucket key
            const timestamp = count === 1 ? timestamps[0] : bucketKey;
            normalizedData.push({
                timestamp,
                value: sum / count,
            });
        });
        result.set(series.metricName, {
            metricName: series.metricName,
            metricType: series.metricType,
            data: normalizedData,
        });
    });
    return result;
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Merge multiple time-series datasets
 */
export function mergeTimeSeries(datasets, mergeStrategy = 'sum') {
    const allTimestamps = new Set();
    datasets.forEach(ds => ds.data.forEach(p => allTimestamps.add(p.timestamp)));
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    const mergedData = sortedTimestamps.map(timestamp => {
        const values = datasets
            .map(ds => ds.data.find(p => p.timestamp === timestamp)?.value)
            .filter((v) => v !== undefined);
        let mergedValue;
        switch (mergeStrategy) {
            case 'average':
                mergedValue = values.reduce((a, b) => a + b, 0) / values.length;
                break;
            case 'first':
                mergedValue = values[0] ?? 0;
                break;
            case 'sum':
            default:
                mergedValue = values.reduce((a, b) => a + b, 0);
                break;
        }
        return { timestamp, value: mergedValue };
    });
    return {
        metricName: datasets.map(d => d.metricName).join('_'),
        metricType: datasets[0]?.metricType || 'gauge',
        data: mergedData,
    };
}
/**
 * Calculate moving average for time-series data
 */
export function calculateMovingAverage(timeSeries, windowSize) {
    const averagedData = [];
    for (let i = 0; i < timeSeries.data.length; i++) {
        const window = timeSeries.data.slice(Math.max(0, i - windowSize + 1), i + 1);
        const sum = window.reduce((acc, p) => acc + p.value, 0);
        averagedData.push({
            timestamp: timeSeries.data[i].timestamp,
            value: sum / window.length,
            labels: timeSeries.data[i].labels,
        });
    }
    return {
        metricName: `${timeSeries.metricName}_ma${windowSize}`,
        metricType: timeSeries.metricType,
        data: averagedData,
    };
}
//# sourceMappingURL=analytics-charts.js.map