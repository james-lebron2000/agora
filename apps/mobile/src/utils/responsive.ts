import { Dimensions, PixelRatio, Platform } from 'react-native';

// Base dimensions (iPhone 14/15 reference)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Scale factors
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;

/**
 * Scale a size based on screen width
 * Use for horizontal dimensions (width, margin, padding)
 */
export const scale = (size: number): number => {
  return Math.round(size * widthScale);
};

/**
 * Scale a size based on screen height
 * Use for vertical dimensions (height, vertical margin/padding)
 */
export const verticalScale = (size: number): number => {
  return Math.round(size * heightScale);
};

/**
 * Moderate scale with a factor
 * Use for font sizes and border radius
 * factor: 0 = no scaling, 1 = full scaling, 0.5 = moderate scaling
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return Math.round(size + (scale(size) - size) * factor);
};

/**
 * Check if device is a small screen (iPhone SE, mini)
 */
export const isSmallScreen = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Check if device is a tablet
 */
export const isTablet = (): boolean => {
  return Platform.OS === 'ios' 
    ? SCREEN_WIDTH >= 768 || SCREEN_HEIGHT >= 768
    : SCREEN_WIDTH >= 600;
};

/**
 * Check if device has a notch/dynamic island
 */
export const hasNotch = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  return SCREEN_HEIGHT >= 812;
};

/**
 * Get safe area padding based on device
 */
export const getSafeAreaPadding = () => {
  if (Platform.OS === 'ios') {
    return {
      top: hasNotch() ? 47 : 20,
      bottom: hasNotch() ? 34 : 20,
    };
  }
  return { top: 24, bottom: 24 };
};

/**
 * Font size presets
 */
export const fontSize = {
  xs: moderateScale(10),
  sm: moderateScale(12),
  base: moderateScale(14),
  md: moderateScale(16),
  lg: moderateScale(18),
  xl: moderateScale(20),
  '2xl': moderateScale(24),
  '3xl': moderateScale(30),
};

/**
 * Spacing presets
 */
export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  '2xl': scale(24),
  '3xl': scale(32),
};

/**
 * Touch target size (minimum 44x44)
 */
export const touchTarget = {
  min: 44,
  sm: scale(36),
  md: scale(44),
  lg: scale(56),
};

/**
 * Responsive font size helper
 * Alias for moderateScale optimized for fonts
 */
export const responsiveFontSize = (size: number): number => {
  return moderateScale(size, 0.4);
};

/**
 * Responsive spacing helper
 * Alias for scale optimized for spacing
 */
export const responsiveSpacing = (size: number): number => {
  return scale(size);
};

export {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  BASE_WIDTH,
  BASE_HEIGHT,
  widthScale,
  heightScale,
};
