import { 
  Dimensions, 
  PixelRatio, 
  Platform, 
  StatusBar, 
  useWindowDimensions,
  ScaledSize 
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';

// Base dimensions (iPhone 14/15 reference)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// iPhone-specific dimensions
const IPHONE_SE_WIDTH = 320;  // iPhone SE (1st gen)
const IPHONE_SE_2020_WIDTH = 375; // iPhone SE (2020)
const IPHONE_14_PRO_MAX_WIDTH = 430;
const IPHONE_15_PRO_MAX_WIDTH = 430;
const IPHONE_DYNAMIC_ISLAND_HEIGHT = 59; // Dynamic Island height

// Android-specific dimensions
const ANDROID_STATUS_BAR_DEFAULT = 24;
const ANDROID_NAVIGATION_BAR_DEFAULT = 48;

// Get initial screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Scale factors
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;

/**
 * Enhanced scale function with device-specific adjustments
 */
export const scale = (size: number, deviceAdjustment: boolean = true): number => {
  let adjustedSize = size;
  
  // Device-specific adjustments
  if (deviceAdjustment) {
    if (isSmallScreen()) {
      // Smaller devices need more aggressive scaling
      adjustedSize = size * 0.9;
    } else if (isExtraLargeScreen()) {
      // Larger devices can handle bigger elements
      adjustedSize = size * 1.1;
    }
  }
  
  return Math.round(adjustedSize * widthScale);
};

/**
 * Enhanced vertical scale with device-specific adjustments
 */
export const verticalScale = (size: number, deviceAdjustment: boolean = true): number => {
  let adjustedSize = size;
  
  if (deviceAdjustment) {
    if (isSmallScreen()) {
      adjustedSize = size * 0.85;
    } else if (isExtraLargeScreen()) {
      adjustedSize = size * 1.15;
    }
  }
  
  return Math.round(adjustedSize * heightScale);
};

/**
 * Enhanced moderate scale with better factor control
 */
export const moderateScale = (size: number, factor = 0.5, maxScale: number = 1.5): number => {
  const scaledSize = size + (scale(size) - size) * factor;
  const maxAllowedSize = size * maxScale;
  return Math.round(Math.min(scaledSize, maxAllowedSize));
};

/**
 * Check if device is extra small (iPhone SE, mini)
 */
export const isExtraSmallScreen = (): boolean => {
  return SCREEN_WIDTH < 350;
};

/**
 * Check if device is small screen
 */
export const isSmallScreen = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Check if device is medium screen (standard phones)
 */
export const isMediumScreen = (): boolean => {
  return SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
};

/**
 * Check if device is large screen (Pro Max, etc.)
 */
export const isLargeScreen = (): boolean => {
  return SCREEN_WIDTH >= 414 && SCREEN_WIDTH <= 430;
};

/**
 * Check if device is extra large (tablets, foldables)
 */
export const isExtraLargeScreen = (): boolean => {
  return SCREEN_WIDTH > 430;
};

/**
 * Enhanced tablet detection
 */
export const isTablet = (): boolean => {
  return Platform.OS === 'ios' 
    ? SCREEN_WIDTH >= 768 || SCREEN_HEIGHT >= 768
    : SCREEN_WIDTH >= 600;
};

/**
 * Check if device is iPhone SE (1st generation)
 */
export const isIPhoneSE = (): boolean => {
  return Platform.OS === 'ios' && SCREEN_WIDTH === IPHONE_SE_WIDTH;
};

/**
 * Check if device is iPhone SE (2020)
 */
export const isIPhoneSE2020 = (): boolean => {
  return Platform.OS === 'ios' && SCREEN_WIDTH === IPHONE_SE_2020_WIDTH;
};

/**
 * Check if device is iPhone Pro Max series
 */
export const isIPhoneProMax = (): boolean => {
  return Platform.OS === 'ios' && SCREEN_WIDTH >= IPHONE_14_PRO_MAX_WIDTH;
};

/**
 * Check if device has a notch (iPhone X and newer, except SE)
 */
export const hasNotch = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  return SCREEN_HEIGHT >= 812 && !isIPhoneSE();
};

/**
 * Check if device has Dynamic Island (iPhone 14 Pro and newer)
 */
export const hasDynamicIsland = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  // iPhone 14 Pro and newer have Dynamic Island
  return SCREEN_HEIGHT >= 852; // Approximate height for iPhone 14 Pro
};

/**
 * Get iOS safe area insets with precise measurements
 */
export const getIOSSafeAreaInsets = () => {
  if (Platform.OS !== 'ios') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  
  // iPhone SE (1st gen) - no notch
  if (isIPhoneSE()) {
    return { top: 20, bottom: 20, left: 0, right: 0 };
  }
  
  // iPhone SE (2020) - no notch
  if (isIPhoneSE2020()) {
    return { top: 20, bottom: 20, left: 0, right: 0 };
  }
  
  // iPhone with Dynamic Island
  if (hasDynamicIsland()) {
    return { 
      top: IPHONE_DYNAMIC_ISLAND_HEIGHT, 
      bottom: 34, 
      left: 0, 
      right: 0 
    };
  }
  
  // iPhone with notch (iPhone X to iPhone 13)
  if (hasNotch()) {
    return { top: 47, bottom: 34, left: 0, right: 0 };
  }
  
  // Older iPhones
  return { top: 20, bottom: 20, left: 0, right: 0 };
};

/**
 * Get Android system bar heights
 */
export const getAndroidSystemBars = () => {
  if (Platform.OS !== 'android') {
    return { statusBar: 0, navigationBar: 0 };
  }
  
  return {
    statusBar: StatusBar.currentHeight || ANDROID_STATUS_BAR_DEFAULT,
    navigationBar: ANDROID_NAVIGATION_BAR_DEFAULT,
  };
};

/**
 * Get platform-specific safe area padding
 */
export const getSafeAreaPadding = () => {
  if (Platform.OS === 'ios') {
    return getIOSSafeAreaInsets();
  }
  
  const { statusBar, navigationBar } = getAndroidSystemBars();
  return { 
    top: statusBar, 
    bottom: navigationBar, 
    left: 0, 
    right: 0 
  };
};

/**
 * Enhanced device categorization
 */
export const DeviceType = {
  EXTRA_SMALL: 'extra_small', // < 350px (iPhone SE 1st gen)
  SMALL: 'small',             // 350px - 374px (iPhone SE 2020)
  MEDIUM: 'medium',           // 375px - 413px (iPhone 14, 15)
  LARGE: 'large',             // 414px - 430px (iPhone Pro Max)
  XLARGE: 'xlarge',           // > 430px (iPad, tablets, foldables)
} as const;

export type DeviceTypeValue = typeof DeviceType[keyof typeof DeviceType];

/**
 * Get enhanced device type
 */
export const getDeviceType = (width: number = SCREEN_WIDTH): DeviceTypeValue => {
  if (width < 350) return DeviceType.EXTRA_SMALL;
  if (width < 375) return DeviceType.SMALL;
  if (width < 414) return DeviceType.MEDIUM;
  if (width <= 430) return DeviceType.LARGE;
  return DeviceType.XLARGE;
};

/**
 * Enhanced responsive spacing with device-specific adjustments
 */
export const getResponsiveSpacing = () => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case DeviceType.EXTRA_SMALL:
      return {
        xs: 2,
        sm: 4,
        md: 6,
        lg: 10,
        xl: 14,
        xxl: 20,
      };
    case DeviceType.SMALL:
      return {
        xs: 3,
        sm: 6,
        md: 10,
        lg: 14,
        xl: 18,
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

/**
 * Enhanced font size presets with device-specific scaling
 */
export const fontSize = {
  xs: moderateScale(10, 0.3),
  sm: moderateScale(12, 0.3),
  base: moderateScale(14, 0.4),
  md: moderateScale(16, 0.4),
  lg: moderateScale(18, 0.4),
  xl: moderateScale(20, 0.4),
  '2xl': moderateScale(24, 0.4),
  '3xl': moderateScale(30, 0.4),
};

/**
 * Enhanced spacing presets
 */
export const spacing = getResponsiveSpacing();

/**
 * Enhanced touch target sizes (WCAG 2.1 AA compliant - minimum 44x44)
 */
export const touchTarget = {
  min: 44, // WCAG minimum
  xs: scale(36),
  sm: scale(40),
  md: scale(44),
  lg: scale(48),
  xl: scale(56),
  xxl: scale(64),
};

/**
 * Get responsive avatar size with device optimization
 */
export const getAvatarSize = (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): number => {
  const baseSizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };
  
  // Adjust for extra small screens
  if (isExtraSmallScreen()) {
    return Math.round(baseSizes[size] * 0.8);
  }
  
  // Adjust for extra large screens
  if (isExtraLargeScreen()) {
    return Math.round(baseSizes[size] * 1.2);
  }
  
  return moderateScale(baseSizes[size], 0.3);
};

/**
 * Get responsive button height with device optimization
 */
export const getButtonHeight = (): number => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case DeviceType.EXTRA_SMALL:
      return 36;
    case DeviceType.SMALL:
      return 40;
    case DeviceType.MEDIUM:
      return 44;
    case DeviceType.LARGE:
      return 48;
    case DeviceType.XLARGE:
      return 56;
    default:
      return 44;
  }
};

/**
 * Enhanced responsive card width for grid layouts
 */
export const getCardWidth = (columns: number, gap: number = 16, containerWidth?: number): number => {
  const width = containerWidth || SCREEN_WIDTH;
  const totalGap = gap * (columns + 1);
  return (width - totalGap) / columns;
};

/**
 * Enhanced responsive font size helper
 */
export const responsiveFontSize = (size: number, maxScale: number = 1.3): number => {
  return moderateScale(size, 0.4, maxScale);
};

/**
 * Check if screen is in landscape mode
 */
export const isLandscape = (width: number = SCREEN_WIDTH, height: number = SCREEN_HEIGHT): boolean => {
  return width > height;
};

/**
 * Get enhanced responsive dimensions that updates on orientation change
 */
export const useResponsiveDimensions = () => {
  const { width, height, scale: pixelScale, fontScale } = useWindowDimensions();
  const [dimensions, setDimensions] = useState({
    width,
    height,
    pixelScale,
    fontScale,
    deviceType: getDeviceType(width),
    isLandscape: width > height,
  });
  
  useEffect(() => {
    setDimensions({
      width,
      height,
      pixelScale,
      fontScale,
      deviceType: getDeviceType(width),
      isLandscape: width > height,
    });
  }, [width, height, pixelScale, fontScale]);
  
  const widthS = width / BASE_WIDTH;
  const heightS = height / BASE_HEIGHT;
  
  return {
    ...dimensions,
    scale: (size: number): number => Math.round(size * widthS),
    verticalScale: (size: number): number => Math.round(size * heightS),
    moderateScale: (size: number, factor: number = 0.5, maxScale: number = 1.5): number => {
      const scaledSize = size + (Math.round(size * widthS) - size) * factor;
      return Math.min(scaledSize, size * maxScale);
    },
    responsiveFontSize: (size: number, maxScale: number = 1.3): number => {
      return Math.round(size + (Math.round(size * widthS) - size) * 0.4);
    },
    isSmallScreen: () => width < 375,
    isLargeScreen: () => width >= 414,
    isExtraLargeScreen: () => width > 430,
    isTablet: () => Platform.OS === 'ios' ? width >= 768 : width >= 600,
  };
};

/**
 * Hook to detect device type changes
 */
export const useDeviceType = () => {
  const { width } = useWindowDimensions();
  const [deviceType, setDeviceType] = useState<DeviceTypeValue>(getDeviceType());
  
  useEffect(() => {
    setDeviceType(getDeviceType(width));
  }, [width]);
  
  return {
    deviceType,
    isExtraSmall: deviceType === DeviceType.EXTRA_SMALL,
    isSmall: deviceType === DeviceType.SMALL,
    isMedium: deviceType === DeviceType.MEDIUM,
    isLarge: deviceType === DeviceType.LARGE,
    isXLarge: deviceType === DeviceType.XLARGE,
  };
};

/**
 * Hook for platform-specific optimizations
 */
export const usePlatformOptimization = () => {
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  
  return {
    isIOS,
    isAndroid,
    hasNotch: isIOS ? hasNotch() : false,
    hasDynamicIsland: isIOS ? hasDynamicIsland() : false,
    safeAreaInsets: getSafeAreaPadding(),
    systemBars: isAndroid ? getAndroidSystemBars() : { statusBar: 0, navigationBar: 0 },
    isIPhoneSE: isIOS ? isIPhoneSE() || isIPhoneSE2020() : false,
    isIPhoneProMax: isIOS ? isIPhoneProMax() : false,
  };
};

// Export original dimensions for backward compatibility
export {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  BASE_WIDTH,
  BASE_HEIGHT,
  widthScale,
  heightScale,
};

// Re-export responsiveSpacing for backward compatibility
export const responsiveSpacing = getResponsiveSpacing();