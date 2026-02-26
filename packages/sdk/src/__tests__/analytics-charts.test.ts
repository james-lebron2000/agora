/**
 * Analytics Charts Module Tests
 * Comprehensive test suite for chart data visualization helpers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  toLineChartData,
  toBarChartData,
  toPieChartData,
  toAreaChartData,
  calculateWoW,
  calculateMoM,
  calculateYoY,
  formatPercentageChange,
  toKpiCardData,
  toSparklineData,
  toHeatmapData,
  metricsToTimeSeries,
  groupTimeSeriesByLabel,
  normalizeTimeSeries,
  mergeTimeSeries,
  calculateMovingAverage,
  DEFAULT_COLOR_PALETTE,
  type AggregatedDataPoint,
  type CategoryDataPoint,
} from '../analytics-charts.js';
import type { TimeSeriesData, MetricValue } from '../analytics.js';

describe('Analytics Charts Module', () => {
  describe('Chart Formatters', () => {
    describe('toLineChartData', () => {
      const mockTimeSeriesData: TimeSeriesData = {
        metricName: 'revenue',
        metricType: 'gauge',
        data: [
          { timestamp: 1704067200000, value: 100, labels: { region: 'us' } },
          { timestamp: 1704153600000, value: 150, labels: { region: 'us' } },
          { timestamp: 1704240000000, value: 200, labels: { region: 'us' } },
        ],
      };

      it('should format single time-series for line chart', () => {
        const result = toLineChartData(mockTimeSeriesData);
        
        expect(result.labels).toHaveLength(3);
        expect(result.datasets).toHaveLength(1);
        expect(result.datasets[0].label).toBe('revenue');
        expect(result.datasets[0].data).toEqual([100, 150, 200]);
      });

      it('should format multiple time-series for line chart', () => {
        const secondSeries: TimeSeriesData = {
          metricName: 'expenses',
          metricType: 'gauge',
          data: [
            { timestamp: 1704067200000, value: 80 },
            { timestamp: 1704153600000, value: 120 },
            { timestamp: 1704240000000, value: 160 },
          ],
        };

        const result = toLineChartData([mockTimeSeriesData, secondSeries]);
        
        expect(result.datasets).toHaveLength(2);
        expect(result.datasets[0].label).toBe('revenue');
        expect(result.datasets[1].label).toBe('expenses');
      });

      it('should apply custom color palette', () => {
        const customColors = ['#ff0000', '#00ff00'];
        const result = toLineChartData(mockTimeSeriesData, {
          colorPalette: customColors,
        });

        expect(result.datasets[0].borderColor).toBe('#ff0000');
      });

      it('should apply custom tension and stroke width', () => {
        const result = toLineChartData(mockTimeSeriesData, {
          tension: 0.5,
          strokeWidth: 3,
        });

        expect(result.datasets[0].tension).toBe(0.5);
        expect(result.datasets[0].strokeWidth).toBe(3);
      });

      it('should use date labels from labels field when available', () => {
        const dataWithDateLabels: TimeSeriesData = {
          metricName: 'test',
          metricType: 'counter',
          data: [
            { timestamp: 1704067200000, value: 100, labels: { date: '2024-01-01' } },
            { timestamp: 1704153600000, value: 150, labels: { date: '2024-01-02' } },
          ],
        };

        const result = toLineChartData(dataWithDateLabels);
        expect(result.labels).toEqual(['2024-01-01', '2024-01-02']);
      });
    });

    describe('toBarChartData', () => {
      const mockAggregatedData: AggregatedDataPoint[] = [
        { label: 'Q1', value: 1000, category: 'Revenue' },
        { label: 'Q2', value: 1500, category: 'Revenue' },
        { label: 'Q3', value: 1200, category: 'Revenue' },
        { label: 'Q4', value: 2000, category: 'Revenue' },
      ];

      it('should format single series for bar chart', () => {
        const result = toBarChartData(mockAggregatedData);
        
        expect(result.labels).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
        expect(result.datasets).toHaveLength(1);
        expect(result.datasets[0].data).toEqual([1000, 1500, 1200, 2000]);
      });

      it('should format multiple series for bar chart', () => {
        const expensesData: AggregatedDataPoint[] = [
          { label: 'Q1', value: 800, category: 'Expenses' },
          { label: 'Q2', value: 1100, category: 'Expenses' },
          { label: 'Q3', value: 900, category: 'Expenses' },
          { label: 'Q4', value: 1300, category: 'Expenses' },
        ];

        const result = toBarChartData([mockAggregatedData, expensesData]);
        
        expect(result.datasets).toHaveLength(2);
        expect(result.datasets[0].label).toBe('Revenue');
        expect(result.datasets[1].label).toBe('Expenses');
      });

      it('should apply custom colors to bars', () => {
        const customData: AggregatedDataPoint[] = [
          { label: 'A', value: 100, color: '#ff0000' },
          { label: 'B', value: 200, color: '#00ff00' },
        ];

        const result = toBarChartData(customData);
        expect(result.datasets[0].backgroundColor).toEqual(['#ff0000', '#00ff00']);
      });
    });

    describe('toPieChartData', () => {
      const mockCategoryData: CategoryDataPoint[] = [
        { category: 'Desktop', value: 60 },
        { category: 'Mobile', value: 30 },
        { category: 'Tablet', value: 10 },
      ];

      it('should format category data for pie chart', () => {
        const result = toPieChartData(mockCategoryData);
        
        expect(result.labels).toEqual(['Desktop', 'Mobile', 'Tablet']);
        expect(result.datasets).toHaveLength(1);
        expect(result.datasets[0].data).toEqual([60, 30, 10]);
      });

      it('should apply color palette', () => {
        const result = toPieChartData(mockCategoryData);
        
        expect(result.datasets[0].backgroundColor).toHaveLength(3);
        expect(result.datasets[0].backgroundColor?.[0]).toBe(DEFAULT_COLOR_PALETTE[0]);
      });

      it('should use custom colors when provided', () => {
        const customData: CategoryDataPoint[] = [
          { category: 'A', value: 50, color: '#ff0000' },
          { category: 'B', value: 50, color: '#00ff00' },
        ];

        const result = toPieChartData(customData);
        expect(result.datasets[0].backgroundColor).toEqual(['#ff0000', '#00ff00']);
      });
    });

    describe('toAreaChartData', () => {
      const mockTimeSeriesData: TimeSeriesData = {
        metricName: 'users',
        metricType: 'gauge',
        data: [
          { timestamp: 1704067200000, value: 1000 },
          { timestamp: 1704153600000, value: 1200 },
          { timestamp: 1704240000000, value: 1100 },
        ],
      };

      it('should format time-series for area chart', () => {
        const result = toAreaChartData(mockTimeSeriesData);
        
        expect(result.labels).toHaveLength(3);
        expect(result.datasets).toHaveLength(1);
        expect(result.datasets[0].fill).toBe(true);
        expect(result.datasets[0].data).toEqual([1000, 1200, 1100]);
      });

      it('should apply area-specific background color with transparency', () => {
        const result = toAreaChartData(mockTimeSeriesData, {
          colorPalette: ['#3b82f6'],
        });

        expect(result.datasets[0].backgroundColor).toBe('#3b82f640');
      });

      it('should handle multiple series', () => {
        const secondSeries: TimeSeriesData = {
          metricName: 'sessions',
          metricType: 'gauge',
          data: [
            { timestamp: 1704067200000, value: 500 },
            { timestamp: 1704153600000, value: 600 },
            { timestamp: 1704240000000, value: 550 },
          ],
        };

        const result = toAreaChartData([mockTimeSeriesData, secondSeries]);
        
        expect(result.datasets).toHaveLength(2);
        expect(result.datasets[0].fill).toBe(true);
        expect(result.datasets[1].fill).toBe(true);
      });
    });
  });

  describe('KPI Comparison Utilities', () => {
    describe('calculateWoW', () => {
      it('should calculate positive week-over-week change', () => {
        const result = calculateWoW(150, 100);
        
        expect(result.change).toBe(50);
        expect(result.changePercent).toBe(50);
        expect(result.trend).toBe('up');
      });

      it('should calculate negative week-over-week change', () => {
        const result = calculateWoW(80, 100);
        
        expect(result.change).toBe(-20);
        expect(result.changePercent).toBe(-20);
        expect(result.trend).toBe('down');
      });

      it('should handle zero previous value', () => {
        const result = calculateWoW(100, 0);
        
        expect(result.change).toBe(100);
        expect(result.changePercent).toBe(0);
        expect(result.trend).toBe('up');
      });

      it('should handle neutral change', () => {
        const result = calculateWoW(100, 100);
        
        expect(result.change).toBe(0);
        expect(result.changePercent).toBe(0);
        expect(result.trend).toBe('neutral');
      });
    });

    describe('calculateMoM', () => {
      it('should calculate month-over-month change', () => {
        const result = calculateMoM(200, 160);
        
        expect(result.change).toBe(40);
        expect(result.changePercent).toBe(25);
        expect(result.trend).toBe('up');
      });

      it('should delegate to calculateWoW implementation', () => {
        const result = calculateMoM(100, 50);
        const wowResult = calculateWoW(100, 50);
        
        expect(result).toEqual(wowResult);
      });
    });

    describe('calculateYoY', () => {
      it('should calculate year-over-year change', () => {
        const result = calculateYoY(1200, 1000);
        
        expect(result.change).toBe(200);
        expect(result.changePercent).toBe(20);
        expect(result.trend).toBe('up');
      });

      it('should delegate to calculateWoW implementation', () => {
        const result = calculateYoY(100, 50);
        const wowResult = calculateWoW(100, 50);
        
        expect(result).toEqual(wowResult);
      });
    });

    describe('formatPercentageChange', () => {
      it('should format positive change with default options', () => {
        const result = formatPercentageChange(25.5);
        expect(result).toBe('▲ +25.5%');
      });

      it('should format negative change with default options', () => {
        const result = formatPercentageChange(-15.3);
        expect(result).toBe('▼ -15.3%');
      });

      it('should format neutral change', () => {
        const result = formatPercentageChange(0);
        expect(result).toBe('● 0.0%');
      });

      it('should respect decimal places option', () => {
        const result = formatPercentageChange(25.567, { decimalPlaces: 2 });
        expect(result).toBe('▲ +25.57%');
      });

      it('should exclude sign when requested', () => {
        const result = formatPercentageChange(25, { includeSign: false });
        expect(result).toBe('▲ 25.0%');
      });

      it('should exclude arrow when requested', () => {
        const result = formatPercentageChange(25, { includeArrow: false });
        expect(result).toBe('+25.0%');
      });

      it('should use ASCII arrows when unicode disabled', () => {
        const positive = formatPercentageChange(25, { useUnicodeArrows: false });
        expect(positive).toBe('+ 25.0%');

        const negative = formatPercentageChange(-25, { useUnicodeArrows: false });
        expect(negative).toBe('- 25.0%');
      });
    });
  });

  describe('Dashboard Widget Transformers', () => {
    describe('toKpiCardData', () => {
      it('should format metrics for KPI card', () => {
        const metrics = [
          { label: 'Revenue', current: 50000, previous: 45000 },
          { label: 'Users', current: 1200, previous: 1000 },
        ];

        const result = toKpiCardData(metrics, {
          title: 'Key Metrics',
          period: 'This Month',
        });

        expect(result.title).toBe('Key Metrics');
        expect(result.period).toBe('This Month');
        expect(result.metrics).toHaveLength(2);
        expect(result.metrics[0].label).toBe('Revenue');
        expect(result.metrics[0].value).toBe(50000);
      });

      it('should calculate trends when previous values provided', () => {
        const metrics = [
          { label: 'Sales', current: 120, previous: 100 },
        ];

        const result = toKpiCardData(metrics, {
          title: 'Sales Metrics',
          includePrevious: true,
        });

        expect(result.metrics[0].trend).toBe('up');
        expect(result.metrics[0].change).toBe(20);
        expect(result.metrics[0].changeFormatted).toBe('▲ +20.0%');
      });

      it('should handle metrics without previous values', () => {
        const metrics = [
          { label: 'New Metric', current: 100 },
        ];

        const result = toKpiCardData(metrics, {
          title: 'Metrics',
        });

        expect(result.metrics[0].previousValue).toBeUndefined();
        expect(result.metrics[0].trend).toBeUndefined();
      });

      it('should apply precision formatting', () => {
        const metrics = [
          { label: 'Rate', current: 99.9876, previous: 99.1234 },
        ];

        const result = toKpiCardData(metrics, {
          title: 'Rate',
          precision: 2,
        });

        expect(result.metrics[0].value).toBe(99.99);
        expect(result.metrics[0].previousValue).toBe(99.12);
      });

      it('should include timestamp', () => {
        const before = Date.now();
        const result = toKpiCardData([], { title: 'Test' });
        const after = Date.now();

        expect(result.timestamp).toBeGreaterThanOrEqual(before);
        expect(result.timestamp).toBeLessThanOrEqual(after);
      });
    });

    describe('toSparklineData', () => {
      it('should format time-series data for sparkline', () => {
        const timeSeriesData: TimeSeriesData = {
          metricName: 'visits',
          metricType: 'counter',
          data: [
            { timestamp: 1, value: 10 },
            { timestamp: 2, value: 20 },
            { timestamp: 3, value: 30 },
          ],
        };

        const result = toSparklineData(timeSeriesData);

        expect(result.data).toEqual([10, 20, 30]);
        expect(result.labels).toEqual([1, 2, 3]);
        expect(result.min).toBe(10);
        expect(result.max).toBe(30);
        expect(result.current).toBe(30);
        expect(result.trend).toBe('up');
      });

      it('should accept raw data points array', () => {
        const dataPoints = [
          { timestamp: 1, value: 100 },
          { timestamp: 2, value: 80 },
          { timestamp: 3, value: 60 },
        ];

        const result = toSparklineData(dataPoints);

        expect(result.data).toEqual([100, 80, 60]);
        expect(result.trend).toBe('down');
      });

      it('should detect neutral trend', () => {
        const dataPoints = [
          { timestamp: 1, value: 50 },
          { timestamp: 2, value: 50 },
        ];

        const result = toSparklineData(dataPoints);
        expect(result.trend).toBe('neutral');
      });

      it('should handle empty data', () => {
        const dataPoints: { timestamp: number; value: number }[] = [];
        const result = toSparklineData(dataPoints);

        expect(result.data).toEqual([]);
        expect(result.current).toBe(0);
        expect(result.trend).toBe('neutral');
      });
    });

    describe('toHeatmapData', () => {
      it('should format events for heatmap', () => {
        const events = [
          { hour: '00', day: 'Mon', count: 10 },
          { hour: '01', day: 'Mon', count: 5 },
          { hour: '00', day: 'Tue', count: 15 },
        ];

        const result = toHeatmapData(events, 'hour', 'day');

        expect(result.xLabels).toContain('00');
        expect(result.xLabels).toContain('01');
        expect(result.yLabels).toContain('Mon');
        expect(result.yLabels).toContain('Tue');
        expect(result.data).toHaveLength(3);
      });

      it('should calculate values correctly with valueField', () => {
        const events = [
          { time: 'morning', category: 'sales', amount: 100 },
          { time: 'morning', category: 'sales', amount: 200 },
          { time: 'evening', category: 'sales', amount: 150 },
        ];

        const result = toHeatmapData(events, 'time', 'category', 'amount');

        const morningSales = result.data.find(d => d.x === 'morning' && d.y === 'sales');
        expect(morningSales?.value).toBe(150); // Average of 100 and 200
      });

      it('should count events when no valueField provided', () => {
        const events = [
          { time: 'A', type: 'X' },
          { time: 'A', type: 'X' },
          { time: 'A', type: 'Y' },
        ];

        const result = toHeatmapData(events, 'time', 'type');

        const ax = result.data.find(d => d.x === 'A' && d.y === 'X');
        expect(ax?.value).toBe(2);
      });

      it('should calculate min and max values', () => {
        const events = [
          { x: 1, y: 1, v: 10 },
          { x: 2, y: 1, v: 20 },
          { x: 1, y: 2, v: 30 },
        ];

        const result = toHeatmapData(events, 'x', 'y', 'v');

        expect(result.min).toBe(10);
        expect(result.max).toBe(30);
      });
    });
  });

  describe('Metric Value Transformers', () => {
    describe('metricsToTimeSeries', () => {
      it('should convert MetricValue array to TimeSeriesData', () => {
        const metrics: MetricValue[] = [
          { name: 'cpu', value: 50, type: 'gauge', labels: { host: 'server1' }, timestamp: 1000 },
          { name: 'cpu', value: 60, type: 'gauge', labels: { host: 'server1' }, timestamp: 2000 },
        ];

        const result = metricsToTimeSeries(metrics);

        expect(result.metricName).toBe('cpu');
        expect(result.metricType).toBe('gauge');
        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toEqual({
          timestamp: 1000,
          value: 50,
          labels: { host: 'server1' },
        });
      });

      it('should handle empty array', () => {
        const result = metricsToTimeSeries([]);
        expect(result.metricName).toBe('unknown');
        expect(result.data).toEqual([]);
      });
    });

    describe('groupTimeSeriesByLabel', () => {
      it('should group time-series by specified label key', () => {
        const timeSeries: TimeSeriesData = {
          metricName: 'requests',
          metricType: 'counter',
          data: [
            { timestamp: 1, value: 10, labels: { region: 'us', env: 'prod' } },
            { timestamp: 2, value: 20, labels: { region: 'us', env: 'prod' } },
            { timestamp: 1, value: 5, labels: { region: 'eu', env: 'prod' } },
            { timestamp: 2, value: 8, labels: { region: 'eu', env: 'prod' } },
          ],
        };

        const result = groupTimeSeriesByLabel(timeSeries, 'region');

        expect(Object.keys(result)).toContain('us');
        expect(Object.keys(result)).toContain('eu');
        expect(result.us.data).toHaveLength(2);
        expect(result.eu.data).toHaveLength(2);
      });

      it('should use default group for missing labels', () => {
        const timeSeries: TimeSeriesData = {
          metricName: 'test',
          metricType: 'gauge',
          data: [
            { timestamp: 1, value: 10 },
            { timestamp: 2, value: 20 },
          ],
        };

        const result = groupTimeSeriesByLabel(timeSeries, 'region');

        expect(Object.keys(result)).toContain('default');
        expect(result.default.data).toHaveLength(2);
      });
    });

    describe('normalizeTimeSeries', () => {
      it('should normalize time-series to intervals', () => {
        const series1: TimeSeriesData = {
          metricName: 'metric1',
          metricType: 'gauge',
          data: [
            { timestamp: 60000, value: 10 },
            { timestamp: 120000, value: 20 },
          ],
        };

        const result = normalizeTimeSeries([series1], { intervalMs: 60000 });

        expect(result.has('metric1')).toBe(true);
        expect(result.get('metric1')?.data).toHaveLength(2);
      });

      it('should filter by time range', () => {
        const series: TimeSeriesData = {
          metricName: 'test',
          metricType: 'counter',
          data: [
            { timestamp: 1000, value: 10 },
            { timestamp: 2000, value: 20 },
            { timestamp: 3000, value: 30 },
          ],
        };

        const result = normalizeTimeSeries([series], { startTime: 1500, endTime: 2500 });

        expect(result.get('test')?.data).toHaveLength(1);
        expect(result.get('test')?.data[0].timestamp).toBe(2000);
      });

      it('should average values in same bucket', () => {
        const series: TimeSeriesData = {
          metricName: 'test',
          metricType: 'gauge',
          data: [
            { timestamp: 30000, value: 10 },
            { timestamp: 45000, value: 30 }, // Same 60s bucket
            { timestamp: 90000, value: 50 },
          ],
        };

        const result = normalizeTimeSeries([series], { intervalMs: 60000 });

        expect(result.get('test')?.data[0].value).toBe(20); // Average of 10 and 30
      });
    });

    describe('mergeTimeSeries', () => {
      it('should merge multiple series with sum strategy', () => {
        const series1: TimeSeriesData = {
          metricName: 's1',
          metricType: 'gauge',
          data: [
            { timestamp: 1000, value: 10 },
            { timestamp: 2000, value: 20 },
          ],
        };

        const series2: TimeSeriesData = {
          metricName: 's2',
          metricType: 'gauge',
          data: [
            { timestamp: 1000, value: 5 },
            { timestamp: 2000, value: 15 },
          ],
        };

        const result = mergeTimeSeries([series1, series2], 'sum');

        expect(result.data[0].value).toBe(15); // 10 + 5
        expect(result.data[1].value).toBe(35); // 20 + 15
      });

      it('should merge with average strategy', () => {
        const series1: TimeSeriesData = {
          metricName: 's1',
          metricType: 'gauge',
          data: [{ timestamp: 1000, value: 10 }],
        };

        const series2: TimeSeriesData = {
          metricName: 's2',
          metricType: 'gauge',
          data: [{ timestamp: 1000, value: 30 }],
        };

        const result = mergeTimeSeries([series1, series2], 'average');

        expect(result.data[0].value).toBe(20); // (10 + 30) / 2
      });

      it('should handle non-overlapping timestamps', () => {
        const series1: TimeSeriesData = {
          metricName: 's1',
          metricType: 'gauge',
          data: [{ timestamp: 1000, value: 10 }],
        };

        const series2: TimeSeriesData = {
          metricName: 's2',
          metricType: 'gauge',
          data: [{ timestamp: 2000, value: 20 }],
        };

        const result = mergeTimeSeries([series1, series2]);

        expect(result.data).toHaveLength(2);
        expect(result.data[0].value).toBe(10);
        expect(result.data[1].value).toBe(20);
      });
    });

    describe('calculateMovingAverage', () => {
      it('should calculate simple moving average', () => {
        const series: TimeSeriesData = {
          metricName: 'test',
          metricType: 'gauge',
          data: [
            { timestamp: 1, value: 10 },
            { timestamp: 2, value: 20 },
            { timestamp: 3, value: 30 },
            { timestamp: 4, value: 40 },
            { timestamp: 5, value: 50 },
          ],
        };

        const result = calculateMovingAverage(series, 3);

        expect(result.data[0].value).toBe(10); // 10 / 1
        expect(result.data[1].value).toBe(15); // (10 + 20) / 2
        expect(result.data[2].value).toBe(20); // (10 + 20 + 30) / 3
        expect(result.data[4].value).toBe(40); // (30 + 40 + 50) / 3
      });

      it('should preserve labels in output', () => {
        const series: TimeSeriesData = {
          metricName: 'test',
          metricType: 'gauge',
          data: [
            { timestamp: 1, value: 10, labels: { a: '1' } },
            { timestamp: 2, value: 20, labels: { a: '2' } },
          ],
        };

        const result = calculateMovingAverage(series, 2);

        expect(result.data[0].labels).toEqual({ a: '1' });
        expect(result.data[1].labels).toEqual({ a: '2' });
      });

      it('should create new metric name with MA suffix', () => {
        const series: TimeSeriesData = {
          metricName: 'cpu_usage',
          metricType: 'gauge',
          data: [{ timestamp: 1, value: 50 }],
        };

        const result = calculateMovingAverage(series, 2);

        expect(result.metricName).toBe('cpu_usage_ma2');
      });
    });
  });

  describe('Constants', () => {
    it('should export default color palette', () => {
      expect(DEFAULT_COLOR_PALETTE).toBeInstanceOf(Array);
      expect(DEFAULT_COLOR_PALETTE.length).toBeGreaterThan(0);
      expect(DEFAULT_COLOR_PALETTE[0]).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
