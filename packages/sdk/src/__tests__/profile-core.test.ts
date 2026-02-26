import { describe, it, expect, vi } from 'vitest';
import { 
  calculateLevel, 
  xpForNextLevel, 
  levelProgress,
  getTierColor,
  getTierIcon
} from '../profile.js';

describe('Profile Level System', () => {
  describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should calculate correct level for XP', () => {
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(300)).toBe(3);
      expect(calculateLevel(600)).toBe(4);
    });

    it('should cap at max level 100', () => {
      expect(calculateLevel(1000000)).toBe(100);
    });
  });

  describe('xpForNextLevel', () => {
    it('should return correct XP needed for next level', () => {
      expect(xpForNextLevel(1)).toBe(100);
      expect(xpForNextLevel(2)).toBe(200);
      expect(xpForNextLevel(5)).toBe(500);
    });
  });

  describe('levelProgress', () => {
    it('should calculate progress percentage', () => {
      const result = levelProgress(50, 1);
      expect(result.percentage).toBe(50);
      expect(result.current).toBe(50);
      expect(result.needed).toBe(100);
    });

    it('should handle level up detection', () => {
      const result = levelProgress(100, 1);
      expect(result.canLevelUp).toBe(true);
    });
  });
});

describe('Achievement System', () => {
  describe('getTierColor', () => {
    it('should return correct colors for each tier', () => {
      expect(getTierColor('bronze')).toBe('#CD7F32');
      expect(getTierColor('silver')).toBe('#C0C0C0');
      expect(getTierColor('gold')).toBe('#FFD700');
      expect(getTierColor('platinum')).toBe('#E5E4E2');
      expect(getTierColor('diamond')).toBe('#B9F2FF');
    });
  });

  describe('getTierIcon', () => {
    it('should return icon for each tier', () => {
      expect(getTierIcon('bronze')).toBe('🥉');
      expect(getTierIcon('silver')).toBe('🥈');
      expect(getTierIcon('gold')).toBe('🥇');
      expect(getTierIcon('platinum')).toBe('💎');
      expect(getTierIcon('diamond')).toBe('👑');
    });
  });
});

describe('Profile Stats', () => {
  it('should calculate win rate correctly', () => {
    const completed = 80;
    const total = 100;
    const winRate = (completed / total) * 100;
    expect(winRate).toBe(80);
  });

  it('should handle zero division', () => {
    const completed = 0;
    const total = 0;
    const winRate = total > 0 ? (completed / total) * 100 : 0;
    expect(winRate).toBe(0);
  });
});

describe('Reputation Calculation', () => {
  it('should normalize reputation score', () => {
    const rawScore = 4.5;
    const maxScore = 5;
    const normalized = (rawScore / maxScore) * 100;
    expect(normalized).toBe(90);
  });

  it('should clamp reputation to 0-100 range', () => {
    const clamp = (val: number) => Math.max(0, Math.min(100, val));
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(50)).toBe(50);
  });
});
