import React from 'react';
import { useProfileTheme } from '../contexts/ProfileThemeContext';

interface SkillsShowcaseProps {
  skills: string[];
  onSkillClick?: (skill: string) => void;
  editable?: boolean;
  onRemove?: (skill: string) => void;
  maxDisplay?: number;
}

const skillColors = [
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-green-500/20 text-green-400 border-green-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
];

export const SkillsShowcase: React.FC<SkillsShowcaseProps> = ({
  skills,
  onSkillClick,
  editable = false,
  onRemove,
  maxDisplay = 20,
}) => {
  const { theme } = useProfileTheme();
  const displaySkills = skills.slice(0, maxDisplay);
  const hasMore = skills.length > maxDisplay;

  if (skills.length === 0) {
    return (
      <div className={`text-sm ${theme.textMuted} italic`}>
        暂无技能标签
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displaySkills.map((skill, index) => {
        const colorClass = skillColors[index % skillColors.length];
        return (
          <button
            key={skill}
            onClick={() => onSkillClick?.(skill)}
            disabled={!onSkillClick}
            className={`
              inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm
              border transition-all duration-200
              ${colorClass}
              ${onSkillClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
            `}
          >
            <span>{skill}</span>
            {editable && onRemove && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(skill);
                }}
                className="ml-1 opacity-60 hover:opacity-100 cursor-pointer"
              >
                ×
              </span>
            )}
          </button>
        );
      })}
      {hasMore && (
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm ${theme.textMuted}`}>
          +{skills.length - maxDisplay} 更多
        </span>
      )}
    </div>
  );
};

export default SkillsShowcase;
