import React, { useState } from 'react';
import { Lock, Unlock, Trophy, Target, Zap, Award, Flame, Star, Crown } from 'lucide-react';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  criteria: {
    type: string;
    value: number;
    description: string;
  };
}

interface AchievementGalleryProps {
  achievements: Achievement[];
}

const tierConfig: Record<AchievementTier, { color: string; bg: string; icon: typeof Trophy }> = {
  bronze: { color: 'text-amber-600', bg: 'bg-amber-600/10', icon: Trophy },
  silver: { color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Target },
  gold: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Award },
  platinum: { color: 'text-cyan-400', bg: 'bg-cyan-400/10', icon: Star },
  diamond: { color: 'text-purple-400', bg: 'bg-purple-400/10', icon: Crown },
};

export const AchievementGallery: React.FC<AchievementGalleryProps> = ({ achievements }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedTier, setSelectedTier] = useState<AchievementTier | 'all'>('all');

  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'unlocked' && !a.unlocked) return false;
    if (filter === 'locked' && a.unlocked) return false;
    if (selectedTier !== 'all' && a.tier !== selectedTier) return false;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalXP = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.xpReward, 0);

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{unlockedCount}</div>
            <div className="text-sm text-white/60">Unlocked</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{achievements.length}</div>
            <div className="text-sm text-white/60">Total</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400">{totalXP.toLocaleString()}</div>
            <div className="text-sm text-white/60">XP Earned</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'unlocked', 'locked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tier Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'bronze', 'silver', 'gold', 'platinum', 'diamond'] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedTier === tier
                ? tier === 'all'
                  ? 'bg-white/20 text-white'
                  : `${tierConfig[tier].bg} ${tierConfig[tier].color}`
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => {
          const tier = tierConfig[achievement.tier];
          const TierIcon = tier.icon;

          return (
            <div
              key={achievement.id}
              className={`relative p-4 rounded-xl border transition-all ${
                achievement.unlocked
                  ? 'bg-white/5 border-white/10 hover:bg-white/10'
                  : 'bg-white/[0.02] border-white/5 opacity-60'
              }`}
            >
              {/* Unlocked Badge */}
              {achievement.unlocked && (
                <div className="absolute top-3 right-3">
                  <Unlock className="w-4 h-4 text-emerald-400" />
                </div>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl ${tier.bg} ${tier.color} flex items-center justify-center text-2xl`}
                >
                  {achievement.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{achievement.name}</h3>
                  </div>
                  <p className="text-sm text-white/60 mb-2 line-clamp-2">
                    {achievement.description}
                  </p>

                  {/* Tier Badge */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${tier.bg} ${tier.color}`}
                    >
                      {achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1)}
                    </span>
                    <span className="text-xs text-emerald-400">+{achievement.xpReward} XP</span>
                  </div>

                  {/* Progress Bar */}
                  {!achievement.unlocked && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>Progress</span>
                        <span>{achievement.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${achievement.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Unlocked Date */}
                  {achievement.unlocked && achievement.unlockedAt && (
                    <p className="text-xs text-white/40 mt-2">
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No achievements found</p>
        </div>
      )}
    </div>
  );
};

export default AchievementGallery;
