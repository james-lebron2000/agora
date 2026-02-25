import {
  scale,
  verticalScale,
  moderateScale,
  isSmallScreen,
  isTablet,
  hasNotch,
  getSafeAreaPadding,
  fontSize,
  spacing,
  touchTarget,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from '../utils/responsive';

describe('Responsive Utilities', () => {
  describe('scale functions', () => {
    it('should scale width-based values correctly', () => {
      // On 390 width screen (iPhone 14 reference), scale(10) should be ~10
      const result = scale(10);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should scale height-based values correctly', () => {
      const result = verticalScale(10);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should moderate scale with factor', () => {
      const result = moderateScale(16, 0.5);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should use default factor of 0.5 for moderateScale', () => {
      const result1 = moderateScale(16);
      const result2 = moderateScale(16, 0.5);
      expect(result1).toBe(result2);
    });
  });

  describe('device detection', () => {
    it('should detect small screens', () => {
      const result = isSmallScreen();
      expect(typeof result).toBe('boolean');
    });

    it('should detect tablets', () => {
      const result = isTablet();
      expect(typeof result).toBe('boolean');
    });

    it('should detect notch/dynamic island', () => {
      const result = hasNotch();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('safe area padding', () => {
    it('should return safe area padding', () => {
      const padding = getSafeAreaPadding();
      expect(padding).toHaveProperty('top');
      expect(padding).toHaveProperty('bottom');
      expect(typeof padding.top).toBe('number');
      expect(typeof padding.bottom).toBe('number');
      expect(padding.top).toBeGreaterThan(0);
      expect(padding.bottom).toBeGreaterThan(0);
    });
  });

  describe('preset constants', () => {
    it('should have font size presets', () => {
      expect(fontSize).toHaveProperty('xs');
      expect(fontSize).toHaveProperty('sm');
      expect(fontSize).toHaveProperty('base');
      expect(fontSize).toHaveProperty('md');
      expect(fontSize).toHaveProperty('lg');
      expect(fontSize).toHaveProperty('xl');
      expect(fontSize).toHaveProperty('2xl');
      expect(fontSize).toHaveProperty('3xl');
      
      // All should be numbers
      Object.values(fontSize).forEach((size) => {
        expect(typeof size).toBe('number');
        expect(size).toBeGreaterThan(0);
      });
    });

    it('should have spacing presets', () => {
      expect(spacing).toHaveProperty('xs');
      expect(spacing).toHaveProperty('sm');
      expect(spacing).toHaveProperty('md');
      expect(spacing).toHaveProperty('lg');
      expect(spacing).toHaveProperty('xl');
      expect(spacing).toHaveProperty('2xl');
      expect(spacing).toHaveProperty('3xl');
      
      Object.values(spacing).forEach((space) => {
        expect(typeof space).toBe('number');
        expect(space).toBeGreaterThan(0);
      });
    });

    it('should have touch target presets', () => {
      expect(touchTarget).toHaveProperty('min', 44);
      expect(touchTarget).toHaveProperty('sm');
      expect(touchTarget).toHaveProperty('md');
      expect(touchTarget).toHaveProperty('lg');
      
      expect(touchTarget.min).toBe(44); // WCAG minimum
      expect(touchTarget.md).toBeGreaterThanOrEqual(44);
    });
  });

  describe('screen dimensions', () => {
    it('should export screen dimensions', () => {
      expect(typeof SCREEN_WIDTH).toBe('number');
      expect(typeof SCREEN_HEIGHT).toBe('number');
      expect(SCREEN_WIDTH).toBeGreaterThan(0);
      expect(SCREEN_HEIGHT).toBeGreaterThan(0);
    });
  });
});
