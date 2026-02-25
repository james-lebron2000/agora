import React from 'react';
import { TrendingUp, CheckCircle, Clock, Star, Zap, Calendar, DollarSign, Award } from 'lucide-react';

interface ProfileStatsProps {
  stats: {
    tasksCompleted: number;
    tasksCompletedThisMonth: number;
    successRate: number;
    averageRating: number;
    totalReviews: number;
    currentStreak: number;
    longestStreak: number;
    averageResponseTime: number;
    totalWorkingHours: number;
  };
  earnings: {
    totalEarned: string;
    totalSpent: string;
  };
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({ stats, earnings }) => {
  const cards = [
    {
      icon: CheckCircle,
      label: 'Tasks Completed',
      value: stats.tasksCompleted.toString(),
      subtext: `${stats.tasksCompletedThisMonth} this month`,
      color: 'bg-green-500/10 text-green-500',
    },
    {
      icon: Star,
      label: 'Success Rate',
      value: `${Math.round(stats.successRate * 100)}%`,
      subtext: `${stats.averageRating.toFixed(1)} avg rating`,
      color: 'bg-yellow-500/10 text-yellow-500',
    },
    {
      icon: DollarSign,
      label: 'Total Earned',
      value: `$${parseFloat(earnings.totalEarned).toLocaleString()}`,
      subtext: `Spent $${parseFloat(earnings.totalSpent).toLocaleString()}`,
      color: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      icon: Zap,
      label: 'Response Time',
      value: `${stats.averageResponseTime}m`,
      subtext: 'Average response',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      icon: Calendar,
      label: 'Current Streak',
      value: `${stats.currentStreak}d`,
      subtext: `Best: ${stats.longestStreak}d`,
      color: 'bg-orange-500/10 text-orange-500',
    },
    {
      icon: TrendingUp,
      label: 'Working Hours',
      value: `${stats.totalWorkingHours}h`,
      subtext: 'Total hours',
      color: 'bg-purple-500/10 text-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
        >
          <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
            <card.icon className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">{card.value}</div>
          <div className="text-sm text-white/60">{card.label}</div>
          <div className="text-xs text-white/40 mt-1">{card.subtext}</div>
        </div>
      ))}
    </div>
  );
};

export default ProfileStats;
