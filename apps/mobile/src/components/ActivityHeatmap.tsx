import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export interface ActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ActivityHeatmapProps {
  data: ActivityDay[];
  title?: string;
  style?: any;
}

interface ActivityHeatmapGridProps {
  data: ActivityDay[];
  months?: number;
}

const levelColors = {
  0: '#f1f5f9', // slate-100
  1: '#a7f3d0', // emerald-200
  2: '#34d399', // emerald-400
  3: '#059669', // emerald-600
  4: '#065f46', // emerald-800
};

const levelLabels: Record<number, string> = {
  0: 'No activity',
  1: 'Light activity',
  2: 'Moderate activity',
  3: 'High activity',
  4: 'Very high activity',
};

/**
 * Generate sample activity data for the past year
 */
export function generateActivityData(days: number = 365): ActivityDay[] {
  const data: ActivityDay[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Random activity level with some patterns
    const random = Math.random();
    let level: 0 | 1 | 2 | 3 | 4 = 0;

    if (random > 0.7) level = 1;
    if (random > 0.85) level = 2;
    if (random > 0.95) level = 3;
    if (random > 0.99) level = 4;

    // Higher activity on weekdays
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && level < 4) {
      level = Math.min(4, level + 1) as 0 | 1 | 2 | 3 | 4;
    }

    data.push({
      date: date.toISOString().split('T')[0],
      count: level * Math.floor(Math.random() * 5 + 1),
      level,
    });
  }

  return data;
}

/**
 * Single Day Cell Component
 */
function DayCell({ day, index }: { day: ActivityDay; index: number }) {
  const formattedDate = useMemo(() => {
    const date = new Date(day.date);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [day.date]);

  const activityLabel = levelLabels[day.level];

  return (
    <View
      style={[
        styles.dayCell,
        { backgroundColor: levelColors[day.level] },
      ]}
    />
  );
}

/**
 * Activity Heatmap Component (GitHub-style contribution graph)
 */
export function ActivityHeatmap({
  data,
  title = 'Activity',
  style,
}: ActivityHeatmapProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const totalDays = data.length;
    const activeDays = data.filter(d => d.level > 0).length;
    const totalContributions = data.reduce((sum, d) => sum + d.count, 0);
    const longestStreak = (() => {
      let maxStreak = 0;
      let currentStreak = 0;
      for (const day of data) {
        if (day.level > 0) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }
      return maxStreak;
    })();

    return { totalDays, activeDays, totalContributions, longestStreak };
  }, [data]);

  return (
    <View style={[styles.container, style]}>
      {/* Header with stats */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>{stats.totalContributions} contributions</Text>
          <Text style={styles.statsText}>{stats.longestStreak} day streak</Text>
        </View>
      </View>

      {/* Heatmap grid */}
      <ActivityHeatmapGrid data={data} />

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[styles.legendCell, { backgroundColor: levelColors[level as 0 | 1 | 2 | 3 | 4] }]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

/**
 * Activity Heatmap Grid Component
 */
function ActivityHeatmapGrid({
  data,
  months = 12,
}: ActivityHeatmapGridProps) {
  // Organize data by weeks
  const weeks = useMemo(() => {
    const result: ActivityDay[][] = [];
    let currentWeek: ActivityDay[] = [];

    // Find the first Sunday
    const firstDay = new Date(data[0]?.date || Date.now());
    const dayOfWeek = firstDay.getDay();

    // Add empty cells for days before the first date
    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0, level: 0 });
    }

    for (const day of data) {
      currentWeek.push(day);

      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0, level: 0 });
      }
      result.push(currentWeek);
    }

    return result;
  }, [data]);

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; index: number }[] = [];
    let lastMonth = '';

    weeks.forEach((week, weekIndex) => {
      const dayWithDate = week.find(d => d.date);
      if (dayWithDate) {
        const date = new Date(dayWithDate.date);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        if (month !== lastMonth) {
          labels.push({ month, index: weekIndex });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  // Get last ~12 weeks for mobile display
  const displayWeeks = weeks.slice(-12);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gridScroll}>
      <View style={styles.gridContainer}>
        {/* Day of week labels */}
        <View style={styles.dayLabels}>
          {['M', 'W', 'F'].map((day) => (
            <Text key={day} style={styles.dayLabel}>
              {day}
            </Text>
          ))}
        </View>

        {/* Activity grid */}
        <View style={styles.weeksContainer}>
          {displayWeeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekColumn}>
              {week.map((day, dayIndex) => (
                <View key={dayIndex}>
                  {day.date ? (
                    <DayCell day={day} index={weekIndex * 7 + dayIndex} />
                  ) : (
                    <View style={styles.emptyCell} />
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Compact Activity Heatmap for smaller spaces
 */
export function ActivityHeatmapCompact({
  data,
  style,
}: {
  data: ActivityDay[];
  style?: any;
}) {
  // Get last 30 days
  const recentData = useMemo(() => data.slice(-30), [data]);
  const activeDays = useMemo(
    () => recentData.filter(d => d.level > 0).length,
    [recentData]
  );

  return (
    <View style={[styles.compactContainer, style]}>
      <View style={styles.compactGrid}>
        {recentData.map((day, index) => (
          <View
            key={day.date}
            style={[
              styles.compactCell,
              { backgroundColor: levelColors[day.level] },
            ]}
          />
        ))}
      </View>
      <Text style={styles.compactText}>
        <Text style={styles.compactHighlight}>{activeDays}</Text> active days
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statsText: {
    fontSize: 12,
    color: '#64748b',
  },
  gridScroll: {
    marginHorizontal: -4,
  },
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  dayLabels: {
    justifyContent: 'space-between',
    marginRight: 4,
    height: 70,
    paddingVertical: 2,
  },
  dayLabel: {
    fontSize: 10,
    color: '#64748b',
    height: 10,
  },
  weeksContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  weekColumn: {
    gap: 3,
  },
  dayCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  emptyCell: {
    width: 10,
    height: 10,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactGrid: {
    flexDirection: 'row',
    gap: 2,
  },
  compactCell: {
    width: 6,
    height: 32,
    borderRadius: 2,
  },
  compactText: {
    fontSize: 12,
    color: '#64748b',
  },
  compactHighlight: {
    fontWeight: '700',
    color: '#0f172a',
  },
});

export default ActivityHeatmap;
