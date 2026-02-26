import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Zap,
  Clock,
  Award,
  Activity,
  BarChart3,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  AlertCircle,
  Brain,
  Shield,
  Cpu,
} from 'lucide-react';
import { useAgentPerformance } from '../hooks/useAgentPerformance';
import type { AgentPerformanceData, PerformancePeriod } from '../hooks/useAgentPerformance';

interface AgentPerformanceDashboardProps {
  agentId: string;
  className?: string;
}

const COLORS = {
  primary: '#0052FF',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

const SKILL_COLORS = ['#0052FF', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function StatCard({
  label,
  value,
  subvalue,
  trend,
  trendValue,
  icon: Icon,
  color,
  delay = 0,
}: {
  label: string;
  value: string;
  subvalue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-2xl p-4 sm:p-5 border border-agora-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-xl bg-agora-50">
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend === 'up'
                ? 'bg-emerald-100 text-emerald-700'
                : trend === 'down'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs text-agora-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-agora-900 mt-1">{value}</p>
        {subvalue && <p className="text-xs text-agora-400 mt-0.5">{subvalue}</p>}
      </div>
    </motion.div>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: PerformancePeriod;
  onChange: (period: PerformancePeriod) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const options: { value: PerformancePeriod; label: string }[] = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' },
  ];

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-agora-200 rounded-xl text-sm font-medium text-agora-700 hover:bg-agora-50 transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span>{selected?.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-44 bg-white rounded-xl border border-agora-200 shadow-lg z-40 overflow-hidden"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                    value === option.value
                      ? 'bg-agora-50 text-agora-900'
                      : 'text-agora-600 hover:bg-agora-50/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-10 h-10 text-agora-600" />
      </motion.div>
      <p className="text-sm text-agora-600 mt-4">Loading performance data...</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-agora-900 mb-2">Failed to load analytics</h3>
      <p className="text-sm text-agora-500 max-w-xs mb-4">{error}</p>
      <motion.button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-agora-600 text-white rounded-xl font-medium text-sm hover:bg-agora-700 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Loader2 className="w-4 h-4" />
        Try Again
      </motion.button>
    </div>
  );
}

export function AgentPerformanceDashboard({ agentId, className = '' }: AgentPerformanceDashboardProps) {
  const [period, setPeriod] = useState<PerformancePeriod>('30d');
  const { data, isLoading, error, refetch } = useAgentPerformance(agentId, period);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState error={error || 'Unknown error'} onRetry={refetch} />;
  }

  const { summary, earningsTrend, taskTrend, skillDistribution, hourlyActivity, comparison, efficiency } = data;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-agora-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-agora-600" />
            Performance Analytics
          </h2>
          <p className="text-sm text-agora-500 mt-1">
            Detailed insights for agent activity and earnings
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Earnings"
          value={formatCurrency(summary.totalEarnings)}
          trend={summary.earningsChange > 0 ? 'up' : summary.earningsChange < 0 ? 'down' : 'neutral'}
          trendValue={`${summary.earningsChange > 0 ? '+' : ''}${summary.earningsChange.toFixed(1)}%`}
          icon={DollarSign}
          color={COLORS.primary}
          delay={0}
        />
        <StatCard
          label="Tasks Completed"
          value={formatCompact(summary.totalTasks)}
          subvalue={`${summary.avgTasksPerDay.toFixed(1)} per day`}
          trend={summary.tasksChange > 0 ? 'up' : summary.tasksChange < 0 ? 'down' : 'neutral'}
          trendValue={`${summary.tasksChange > 0 ? '+' : ''}${summary.tasksChange.toFixed(1)}%`}
          icon={Target}
          color={COLORS.success}
          delay={0.1}
        />
        <StatCard
          label="Success Rate"
          value={`${summary.successRate.toFixed(1)}%`}
          subvalue={`${summary.completedTasks} of ${summary.totalTasks} tasks`}
          trend={summary.successRate >= 90 ? 'up' : summary.successRate >= 70 ? 'neutral' : 'down'}
          trendValue={summary.successRate >= 90 ? 'Excellent' : summary.successRate >= 70 ? 'Good' : 'Needs Work'}
          icon={Shield}
          color={COLORS.warning}
          delay={0.2}
        />
        <StatCard
          label="Efficiency Score"
          value={efficiency.score.toFixed(0)}
          subvalue={`Top ${efficiency.percentile}% of agents`}
          trend={efficiency.score >= 80 ? 'up' : efficiency.score >= 60 ? 'neutral' : 'down'}
          trendValue={`${efficiency.trend > 0 ? '+' : ''}${efficiency.trend.toFixed(1)}%`}
          icon={Zap}
          color={COLORS.purple}
          delay={0.3}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Earnings Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-agora-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-agora-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-agora-500" />
                Earnings Trend
              </h3>
              <p className="text-xs text-agora-500 mt-0.5">vs network average</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-agora-900">{formatCurrency(summary.totalEarnings)}</p>
              <p className="text-xs text-emerald-600">+{formatCurrency(summary.totalEarnings - comparison.networkAvgEarnings)} vs avg</p>
            </div>
          </div>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={earningsTrend} margin={{ left: 0, right: 0 }}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => `$${formatCompact(Number(v))}`}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), 'Earnings']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <ReferenceLine
                  y={comparison.networkAvgEarnings / earningsTrend.length}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: 'Network Avg', fill: '#94a3b8', fontSize: 10, position: 'right' }}
                />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fill="url(#earningsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Task Completion Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-agora-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-agora-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-agora-500" />
                Task Completion
              </h3>
              <p className="text-xs text-agora-500 mt-0.5">Daily completed vs attempted</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-agora-900">{summary.completedTasks}</p>
              <p className="text-xs text-agora-500">completed</p>
            </div>
          </div>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskTrend} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Bar dataKey="completed" stackId="a" fill={COLORS.success} radius={[0, 0, 4, 4]} />
                <Bar dataKey="failed" stackId="a" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-agora-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-agora-600">Failed</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Skill Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-agora-100 shadow-sm"
        >
          <h3 className="font-semibold text-agora-900 mb-1 flex items-center gap-2">
            <Brain className="w-4 h-4 text-agora-500" />
            Skill Distribution
          </h3>
          <p className="text-xs text-agora-500 mb-4">Earnings by capability</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={skillDistribution}
                  dataKey="earnings"
                  nameKey="skill"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {skillDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={SKILL_COLORS[index % SKILL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), 'Earnings']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {skillDistribution.slice(0, 4).map((skill, index) => (
              <div key={skill.skill} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SKILL_COLORS[index % SKILL_COLORS.length] }}
                  />
                  <span className="text-agora-700">{skill.skill}</span>
                </div>
                <span className="font-medium text-agora-900">{formatCurrency(skill.earnings)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hourly Activity Pattern */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-agora-100 shadow-sm lg:col-span-2"
        >
          <h3 className="font-semibold text-agora-900 mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-agora-500" />
            Activity Pattern
          </h3>
          <p className="text-xs text-agora-500 mb-4">Task completion by hour of day</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyActivity} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(v) => `${v}h`}
                  interval={2}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${v} tasks`, 'Completed']}
                  labelFormatter={(label) => `${label}:00 - ${label}:59`}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="tasks" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default AgentPerformanceDashboard;
