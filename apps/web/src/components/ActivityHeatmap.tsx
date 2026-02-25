import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ActivityHeatmapProps {
  data: ActivityDay[];
  className?: string;
  title?: string;
}

interface ActivityHeatmapGridProps {
  data: ActivityDay[];
  months?: number;
  className?: string;
}

const levelColors = {
  0: 'bg-agora-100',
  1: 'bg-emerald-200',
  2: 'bg-emerald-300',
  3: 'bg-emerald-400',
  4: 'bg-emerald-500',
};

const levelHoverColors = {
  0: 'hover:bg-agora-200',
  1: 'hover:bg-emerald-300',
  2: 'hover:bg-emerald-400',
  3: 'hover:bg-emerald-500',
  4: 'hover:bg-emerald-600',
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

  const activityLabel = useMemo(() => {
    if (day.level === 0) return 'No activity';
    if (day.level === 1) return 'Light activity';
    if (day.level === 2) return 'Moderate activity';
    if (day.level === 3) return 'High activity';
    return 'Very high activity';
  }, [day.level]);

  return (
    <motion.div
      className={`
        w-3 h-3 rounded-sm
        ${levelColors[day.level]}
        ${levelHoverColors[day.level]}
        cursor-pointer
        transition-colors duration-200
      `}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.001 }}
      whileHover={{ scale: 1.3 }}
    >
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 hover:opacity-100 pointer-events-none z-30 group-hover:opacity-100 transition-opacity">
        <div className="bg-agora-900 text-white text-xs rounded-lg py-1.5 px-2 whitespace-nowrap shadow-lg">
          <p className="font-medium">{formattedDate}</p>
          <p className="text-agora-300">{activityLabel}</p>
          {day.count > 0 && (
            <p className="text-emerald-400 font-semibold">{day.count} contributions</p>
          )}
        </div>
        <div className="w-2 h-2 bg-agora-900 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
      </div>
    </motion.div>
  );
}

/**
 * Activity Heatmap Component (GitHub-style contribution graph)
 * 
 * Displays a heatmap showing activity levels over time with:
 * - Color-coded activity levels
 * - Smooth animations
 * - Tooltips on hover
 * - Responsive grid layout
 */
export function ActivityHeatmap({
  data,
  className = '',
  title = 'Activity',
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
    <div className={`bg-white rounded-2xl p-4 border border-agora-100 shadow-sm ${className}`}>
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-agora-900">{title}</h3>
        <div className="flex gap-4 text-xs text-agora-500">
          <span>{stats.totalContributions} contributions</span>
          <span>{stats.longestStreak} day streak</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <ActivityHeatmapGrid data={data} />

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-agora-500">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-3 h-3 rounded-sm ${levelColors[level as 0 | 1 | 2 | 3 | 4]}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/**
 * Activity Heatmap Grid Component
 * 
 * Renders the actual grid of activity cells
 */
export function ActivityHeatmapGrid({
  data,
  months = 12,
  className = '',
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

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="min-w-max">
        {/* Month labels */}
        <div className="flex mb-1">
          <div className="w-8" /> {/* Spacer for day labels */}
          {monthLabels.map(({ month, index }) => (
            <div
              key={`${month}-${index}`}
              className="text-[10px] text-agora-500 absolute"
              style={{ marginLeft: `${index * 16 + 32}px` }}
            >
              {month}
            </div>
          ))}
        </div>

        {/* Day labels and grid */}
        <div className="flex gap-1">
          {/* Day of week labels */}
          <div className="flex flex-col gap-1 mr-2">
            {['Mon', 'Wed', 'Fri'].map((day) => (
              <div key={day} className="h-3 text-[10px] text-agora-500 flex items-center">
                {day}
              </div>
            ))}
          </div>

          {/* Activity grid */}
          <div className="flex gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div key={dayIndex} className="relative group">
                    {day.date ? (
                      <DayCell day={day} index={weekIndex * 7 + dayIndex} />
                    ) : (
                      <div className="w-3 h-3" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Activity Heatmap for smaller spaces
 */
export function ActivityHeatmapCompact({
  data,
  className = '',
}: {
  data: ActivityDay[];
  className?: string;
}) {
  // Get last 30 days
  const recentData = useMemo(() => data.slice(-30), [data]);
  const activeDays = useMemo(
    () => recentData.filter(d => d.level > 0).length,
    [recentData]
  );

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex gap-1">
        {recentData.map((day, index) => (
          <motion.div
            key={day.date}
            className={`
              w-2 h-8 rounded-sm
              ${levelColors[day.level]}
              ${levelHoverColors[day.level]}
              transition-colors duration-200
            `}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: index * 0.02 }}
          />
        ))}
      </div>
      <div className="text-xs text-agora-500">
        <span className="font-semibold text-agora-900">{activeDays}</span> active days
      </div>
    </div>
  );
}

export default ActivityHeatmap;
export type { ActivityDay };
