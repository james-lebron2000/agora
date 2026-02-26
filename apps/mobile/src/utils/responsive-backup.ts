import { Dimensions, PixelRatio, Platform, StatusBar, useWindowDimensions } from 'react-native';

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
  return { top: StatusBar.currentHeight || 24, bottom: 24 };
};

// Device categorization based on screen width
export const DeviceType = {
  SMALL: 'small',     // < 375px (iPhone SE, mini)
  MEDIUM: 'medium',   // 375px - 414px (iPhone 14, 15)
  LARGE: 'large',     // 415px - 430px (iPhone 14/15 Pro Max)
  XLARGE: 'xlarge',   // > 430px (iPad, tablets)
} as const;

export type DeviceTypeValue = typeof DeviceType[keyof typeof DeviceType];

/**
 * Get device type based on screen width
 */
export const getDeviceType = (width: number = SCREEN_WIDTH): DeviceTypeValue => {
  if (width < 375) return DeviceType.SMALL;
  if (width < 415) return DeviceType.MEDIUM;
  if (width <= 430) return DeviceType.LARGE;
  return DeviceType.XLARGE;
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
 * Get responsive spacing based on device type
 */
export const getResponsiveSpacing = () => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case DeviceType.SMALL:
      return {
        xs: 2,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        xxl: 24,
      };
    case DeviceType.MEDIUM:
      return {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 28,
      };
    case DeviceType.LARGE:
      return {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 20,
        xl: 24,
        xxl: 32,
      };
    case DeviceType.XLARGE:
      return {
        xs: 8,
        sm: 12,
        md: 20,
        lg: 28,
        xl: 36,
        xxl: 48,
      };
    default:
      return {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
      };
  }
};

// Alias for backward compatibility - returns the responsive spacing object
export const responsiveSpacing = getResponsiveSpacing();

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
 * Get responsive avatar size
 */
export const getAvatarSize = (size: 'sm' | 'md' | 'lg' | 'xl'): number => {
  const sizes = {
    sm: moderateScale(32),
    md: moderateScale(40),
    lg: moderateScale(48),
    xl: moderateScale(64),
  };
  return sizes[size];
};

/**
 * Get responsive button height
 */
export const getButtonHeight = (): number => {
  const deviceType = getDeviceType();
  switch (deviceType) {
    case DeviceType.SMALL:
      return 40;
    case DeviceType.MEDIUM:
      return 48;
    case DeviceType.LARGE:
      return 52;
    case DeviceType.XLARGE:
      return 56;
    default:
      return 48;
  }
};

/**
 * Check if screen is in landscape mode
 */
export const isLandscape = (width: number = SCREEN_WIDTH, height: number = SCREEN_HEIGHT): boolean => {
  return width > height;
};

/**
 * Get responsive card width for grid layouts
 * @param columns - Number of columns
 * @param gap - Gap between cards
 */
export const getCardWidth = (columns: number, gap: number = 16): number => {
  const totalGap = gap * (columns + 1);
  return (SCREEN_WIDTH - totalGap) / columns;
};

/**
 * Hook for responsive dimensions that updates on orientation change
 */
export const useResponsiveDimensions = () => {
  const { width, height, scale: pixelScale, fontScale } = useWindowDimensions();
  
  const widthS = width / BASE_WIDTH;
  const heightS = height / BASE_HEIGHT;
  
  return {
    width,
    height,
    pixelScale,
    fontScale,
    deviceType: getDeviceType(width),
    isLandscape: width > height,
    scale: (size: number): number => Math.round(size * widthS),
    verticalScale: (size: number): number => Math.round(size * heightS),
    moderateScale: (size: number, factor: number = 0.5): number => {
      return Math.round(size + (Math.round(size * widthS) - size) * factor);
    },
    responsiveFontSize: (size: number): number => {
      return Math.round(size + (Math.round(size * widthS) - size) * 0.4);
    },
  };
};

export {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  BASE_WIDTH,
  BASE_HEIGHT,
  widthScale,
  heightScale,
};
