/**
 * ProfileTaskChart Component
 * Mini bar chart for task statistics
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { spacing, SCREEN_WIDTH } from '../../utils/responsive';

export interface ProfileTaskChartProps {
  posted: number;
  completed: number;
  inProgress: number;
  cancelled: number;
}

const CHART_HEIGHT = 110;
const PADDING = { top: 10, right: 10, bottom: 30, left: 30 };

export const ProfileTaskChart = memo(function ProfileTaskChart({
  posted,
  completed,
  inProgress,
  cancelled,
}: ProfileTaskChartProps) {
  const data = useMemo(() => [
    { label: 'Posted', value: posted, color: '#6366f1' },
    { label: 'Done', value: completed, color: '#10b981' },
    { label: 'Active', value: inProgress, color: '#f59e0b' },
    { label: 'Cancelled', value: cancelled, color: '#ef4444' },
  ], [posted, completed, inProgress, cancelled]);

  const maxValue = useMemo(() => Math.max(posted, completed, inProgress, cancelled, 1), 
    [posted, completed, inProgress, cancelled]);

  const chartWidth = SCREEN_WIDTH - 80;
  const barWidth = (chartWidth - PADDING.left - PADDING.right) / data.length - 10;
  const scaleY = (CHART_HEIGHT - PADDING.top - PADDING.bottom) / maxValue;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Task Overview</Text>
      
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={CHART_HEIGHT + 20}>
          {/* Y-axis line */}
          <Line 
            x1={PADDING.left} 
            y1={PADDING.top} 
            x2={PADDING.left} 
            y2={CHART_HEIGHT - PADDING.bottom} 
            stroke="#e5e7eb" 
            strokeWidth={1} 
          />
          
          {/* X-axis line */}
          <Line 
            x1={PADDING.left} 
            y1={CHART_HEIGHT - PADDING.bottom} 
            x2={chartWidth - PADDING.right} 
            y2={CHART_HEIGHT - PADDING.bottom} 
            stroke="#e5e7eb" 
            strokeWidth={1} 
          />

          {data.map((item, index) => {
            const x = PADDING.left + 10 + index * (barWidth + 15);
            const barHeight = item.value * scaleY;
            const y = CHART_HEIGHT - PADDING.bottom - barHeight;

            return (
              <React.Fragment key={item.label}>
                {/* Bar */}
                <Rect 
                  x={x} 
                  y={y} 
                  width={barWidth} 
                  height={barHeight} 
                  rx={4} 
                  fill={item.color} 
                />
                
                {/* Value label */}
                <SvgText 
                  x={x + barWidth / 2} 
                  y={y - 6} 
                  fontSize={11} 
                  fill="#374151" 
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {item.value}
                </SvgText>
                
                {/* X-axis label */}
                <SvgText 
                  x={x + barWidth / 2} 
                  y={CHART_HEIGHT - 8} 
                  fontSize={10} 
                  fill="#6b7280" 
                  textAnchor="middle"
                >
                  {item.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {data.map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default ProfileTaskChart;
