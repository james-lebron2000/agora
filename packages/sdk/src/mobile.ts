/**
 * Agora Mobile SDK Module
 * 
 * Provides mobile device detection, performance optimization, and touch gesture handling
 * for the Agora platform on iOS/Android devices.
 * 
 * @module mobile
 * @version 1.0.0
 */

// ============================================================================
// Type Declarations for Browser APIs (when DOM lib is not available)
// ============================================================================

declare const navigator: {
  userAgent: string;
  maxTouchPoints?: number;
  hardwareConcurrency?: number;
  connection?: {
    effectiveType?: string;
  };
} | undefined;

declare const window: {
  screen: {
    width: number;
    height: number;
    orientation?: {
      type: string;
    };
  };
  devicePixelRatio: number;
  ontouchstart?: unknown;
  matchMedia(query: string): { matches: boolean };
  addEventListener(type: string, listener: unknown, options?: unknown): void;
  removeEventListener(type: string, listener: unknown, options?: unknown): void;
} | undefined;

declare const document: {
  getElementsByTagName(tag: string): { length: number };
} | undefined;

// Minimal HTMLElement interface for gesture handling
declare interface HTMLElement {
  addEventListener(type: string, listener: ((e: unknown) => void) | { handleEvent(e: unknown): void }, options?: { passive?: boolean; capture?: boolean; once?: boolean }): void;
  removeEventListener(type: string, listener: ((e: unknown) => void) | { handleEvent(e: unknown): void }, options?: { capture?: boolean }): void;
}

declare const performance: {
  memory?: {
    usedJSHeapSize: number;
  };
} | undefined;

// ============================================================================
// Device Detection Types
// ============================================================================

/**
 * Device type enumeration
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

/**
 * Operating system enumeration
 */
export type OS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';

/**
 * Orientation enumeration
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * Device information interface
 */
export interface DeviceInfo {
  /** Device type (mobile, tablet, desktop, unknown) */
  type: DeviceType;
  /** Operating system */
  os: OS;
  /** OS version string */
  osVersion: string;
  /** Device manufacturer (if available) */
  manufacturer?: string;
  /** Device model (if available) */
  model?: string;
  /** Screen width in pixels */
  screenWidth: number;
  /** Screen height in pixels */
  screenHeight: number;
  /** Device pixel ratio */
  pixelRatio: number;
  /** Is touch device */
  isTouch: boolean;
  /** Is mobile device (phone) */
  isMobile: boolean;
  /** Is tablet device */
  isTablet: boolean;
  /** Is iOS device */
  isIOS: boolean;
  /** Is Android device */
  isAndroid: boolean;
  /** Current orientation */
  orientation: Orientation;
}

/**
 * Performance level enumeration
 */
export type PerformanceLevel = 'high' | 'medium' | 'low';

/**
 * Network type enumeration
 */
export type NetworkType = '4g' | '3g' | '2g' | 'wifi' | 'slow-2g' | 'offline' | 'unknown';

/**
 * Device detection options
 */
export interface DeviceDetectorOptions {
  /** Custom user agent string (defaults to navigator.userAgent) */
  userAgent?: string;
  /** Custom screen dimensions (defaults to window.screen) */
  screen?: { width: number; height: number };
  /** Custom pixel ratio (defaults to window.devicePixelRatio) */
  pixelRatio?: number;
}

// ============================================================================
// DeviceDetector Class
// ============================================================================

/**
 * DeviceDetector class for detecting device types, OS, and capabilities
 * 
 * @example
 * ```typescript
 * const detector = new DeviceDetector();
 * const device = detector.detect();
 * if (device.isMobile) {
 *   console.log('Mobile device detected:', device.os);
 * }
 * ```
 */
export class DeviceDetector {
  private userAgent: string;
  private screen: { width: number; height: number };
  private pixelRatio: number;

  /**
   * Creates a new DeviceDetector instance
   * @param options - Detection options
   */
  constructor(options: DeviceDetectorOptions = {}) {
    this.userAgent = options.userAgent?.toLowerCase() ?? 
      (typeof navigator !== 'undefined' && navigator ? navigator.userAgent.toLowerCase() : '');
    this.screen = options.screen ?? 
      (typeof window !== 'undefined' && window ? { width: window.screen.width, height: window.screen.height } : { width: 0, height: 0 });
    this.pixelRatio = options.pixelRatio ?? 
      (typeof window !== 'undefined' && window ? window.devicePixelRatio || 1 : 1);
  }

  /**
   * Detects device information from user agent and screen properties
   * @returns DeviceInfo object with detected properties
   */
  detect(): DeviceInfo {
    const os = this.detectOS();
    const osVersion = this.detectOSVersion();
    const type = this.detectDeviceType();
    const manufacturer = this.detectManufacturer();
    const model = this.detectModel();

    return {
      type,
      os,
      osVersion,
      manufacturer,
      model,
      screenWidth: this.screen.width,
      screenHeight: this.screen.height,
      pixelRatio: this.pixelRatio,
      isTouch: this.isTouchDevice(),
      isMobile: type === 'mobile',
      isTablet: type === 'tablet',
      isIOS: os === 'ios',
      isAndroid: os === 'android',
      orientation: this.detectOrientation(),
    };
  }

  /**
   * Detects the operating system
   * @returns OS type
   */
  detectOS(): OS {
    if (/iphone|ipad|ipod/.test(this.userAgent)) return 'ios';
    if (/android/.test(this.userAgent)) return 'android';
    if (/windows/.test(this.userAgent)) return 'windows';
    if (/macintosh|mac os x/.test(this.userAgent)) return 'macos';
    if (/linux/.test(this.userAgent)) return 'linux';
    return 'unknown';
  }

  /**
   * Detects the OS version
   * @returns OS version string
   */
  detectOSVersion(): string {
    const os = this.detectOS();
    const match = this.userAgent.match(new RegExp(`${os}[\\s/]?([\\d._]+)`, 'i'));
    return match?.[1]?.replace(/_/g, '.') ?? 'unknown';
  }

  /**
   * Detects the device type (mobile, tablet, desktop)
   * @returns Device type
   */
  detectDeviceType(): DeviceType {
    // Check for tablet indicators
    if (/ipad/.test(this.userAgent) || 
        (/android/.test(this.userAgent) && !/mobile/.test(this.userAgent))) {
      return 'tablet';
    }

    // Check for mobile indicators
    if (/iphone|ipod|android|blackberry|webos|iemobile|windows phone|opera mini/.test(this.userAgent)) {
      return 'mobile';
    }

    // Large screen + touch often indicates tablet
    if (this.screen.width >= 600 && this.isTouchDevice()) {
      return 'tablet';
    }

    return 'desktop';
  }

  /**
   * Detects device manufacturer
   * @returns Manufacturer name or undefined
   */
  detectManufacturer(): string | undefined {
    if (/apple/.test(this.userAgent)) return 'Apple';
    if (/samsung/.test(this.userAgent)) return 'Samsung';
    if (/huawei/.test(this.userAgent)) return 'Huawei';
    if (/xiaomi/.test(this.userAgent)) return 'Xiaomi';
    if (/google/.test(this.userAgent)) return 'Google';
    if (/oneplus/.test(this.userAgent)) return 'OnePlus';
    return undefined;
  }

  /**
   * Detects device model
   * @returns Model name or undefined
   */
  detectModel(): string | undefined {
    // iPhone model detection
    const iphoneMatch = this.userAgent.match(/iphone\s*(\d+)?[,\s]*(\w+)?/i);
    if (iphoneMatch) {
      return iphoneMatch[1] ? `iPhone ${iphoneMatch[1]}` : 'iPhone';
    }

    // iPad model detection
    if (/ipad/.test(this.userAgent)) {
      return 'iPad';
    }

    // Generic model extraction
    const modelMatch = this.userAgent.match(/\(([^)]+)\)/);
    if (modelMatch) {
      const parts = modelMatch[1].split(';').map(p => p.trim());
      return parts.find(p => /(build|model)/i.test(p)) ?? parts[parts.length - 1];
    }

    return undefined;
  }

  /**
   * Detects current screen orientation
   * @returns Orientation type
   */
  detectOrientation(): Orientation {
    if (typeof window !== 'undefined' && window?.screen?.orientation) {
      return window.screen.orientation.type.startsWith('landscape') ? 'landscape' : 'portrait';
    }
    return this.screen.width > this.screen.height ? 'landscape' : 'portrait';
  }

  /**
   * Checks if device supports touch
   * @returns True if touch is supported
   */
  isTouchDevice(): boolean {
    if (typeof window !== 'undefined' && window) {
      return 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator?.maxTouchPoints ? navigator.maxTouchPoints > 0 : false);
    }
    return /iphone|ipad|ipod|android|windows phone/.test(this.userAgent);
  }

  /**
   * Checks if device is in low-power mode (iOS only, best effort)
   * @returns True if likely in low-power mode
   */
  isLowPowerMode(): boolean {
    // This is a best-effort detection based on reduced motion preference
    if (typeof window !== 'undefined' && window && 'matchMedia' in window) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }
}

// ============================================================================
// Performance Optimization Types
// ============================================================================

/**
 * Performance optimization configuration
 */
export interface OptimizationConfig {
  /** Enable animations (disabled on low-end devices) */
  enableAnimations: boolean;
  /** Animation quality level */
  animationQuality: 'high' | 'medium' | 'low';
  /** Enable heavy visual effects */
  enableEffects: boolean;
  /** Maximum list items to render at once */
  maxListItems: number;
  /** Enable lazy loading */
  enableLazyLoading: boolean;
  /** Image quality (0-1) */
  imageQuality: number;
  /** Enable cache for API requests */
  enableApiCache: boolean;
  /** Cache TTL in seconds */
  cacheTTL: number;
}

/**
 * Mobile performance metrics interface
 */
export interface MobilePerformanceMetrics {
  /** Memory usage in MB (if available) */
  memoryUsage?: number;
  /** Number of DOM nodes */
  domNodes?: number;
  /** Frame rate estimate */
  frameRate?: number;
  /** Network type */
  networkType: NetworkType;
  /** Device performance level */
  performanceLevel: PerformanceLevel;
}

// ============================================================================
// MobileOptimizer Class
// ============================================================================

/**
 * MobileOptimizer class for optimizing performance based on device capabilities
 * 
 * @example
 * ```typescript
 * const optimizer = new MobileOptimizer();
 * const config = optimizer.getOptimizedConfig();
 * // Use config to adjust UI rendering
 * ```
 */
export class MobileOptimizer {
  private deviceDetector: DeviceDetector;
  private config: OptimizationConfig;

  /**
   * Creates a new MobileOptimizer instance
   * @param deviceDetector - Optional custom DeviceDetector
   * */
  constructor(deviceDetector?: DeviceDetector) {
    this.deviceDetector = deviceDetector ?? new DeviceDetector();
    this.config = this.generateOptimizedConfig();
  }

  /**
   * Gets the optimized configuration based on device capabilities
   * @returns OptimizationConfig tailored to device
   */
  getOptimizedConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * Generates optimized configuration based on device detection
   * @returns Optimization configuration
   */
  private generateOptimizedConfig(): OptimizationConfig {
    const device = this.deviceDetector.detect();
    const performanceLevel = this.estimatePerformanceLevel();

    const isLowEnd = performanceLevel === 'low';
    const isMedium = performanceLevel === 'medium';

    return {
      enableAnimations: !isLowEnd,
      animationQuality: isLowEnd ? 'low' : isMedium ? 'medium' : 'high',
      enableEffects: !isLowEnd && !isMedium,
      maxListItems: isLowEnd ? 50 : isMedium ? 100 : 200,
      enableLazyLoading: true,
      imageQuality: isLowEnd ? 0.7 : isMedium ? 0.85 : 1.0,
      enableApiCache: true,
      cacheTTL: isLowEnd ? 300 : 600, // seconds
    };
  }

  /**
   * Estimates device performance level
   * @returns Performance level
   */
  estimatePerformanceLevel(): PerformanceLevel {
    const device = this.deviceDetector.detect();

    // Check for low-end indicators
    if (device.pixelRatio < 2 && device.screenWidth < 400) {
      return 'low';
    }

    // Check device memory if available
    if (typeof navigator !== 'undefined' && navigator && 'deviceMemory' in navigator) {
      const memory = (navigator as unknown as { deviceMemory: number }).deviceMemory;
      if (memory <= 2) return 'low';
      if (memory <= 4) return 'medium';
    }

    // Check hardware concurrency
    if (typeof navigator !== 'undefined' && navigator && navigator.hardwareConcurrency) {
      if (navigator.hardwareConcurrency <= 2) return 'low';
      if (navigator.hardwareConcurrency <= 4) return 'medium';
    }

    // Tablet/desktop generally considered higher performance
    if (device.type === 'tablet' || device.type === 'desktop') {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Gets current performance metrics
   * @returns MobilePerformanceMetrics object
   */
  getPerformanceMetrics(): MobilePerformanceMetrics {
    const networkType = this.getNetworkType();
    const performanceLevel = this.estimatePerformanceLevel();

    const metrics: MobilePerformanceMetrics = {
      networkType,
      performanceLevel,
    };

    // Memory usage (Chrome only)
    if (typeof performance !== 'undefined' && performance?.memory?.usedJSHeapSize) {
      metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }

    // DOM node count
    if (typeof document !== 'undefined' && document) {
      metrics.domNodes = document.getElementsByTagName('*').length;
    }

    return metrics;
  }

  /**
   * Gets current network type using Network Information API
   * @returns Network type
   */
  getNetworkType(): NetworkType {
    if (typeof navigator !== 'undefined' && navigator && 'connection' in navigator && navigator.connection) {
      const conn = navigator.connection;
      if (conn.effectiveType) {
        return conn.effectiveType as NetworkType;
      }
    }
    return 'unknown';
  }

  /**
   * Throttles a function for performance
   * @param fn - Function to throttle
   * @param limit - Time limit in ms
   * @returns Throttled function
   */
  throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => { inThrottle = false; }, limit);
      }
    };
  }

  /**
   * Debounces a function for performance
   * @param fn - Function to debounce
   * @param delay - Delay in ms
   * @returns Debounced function
   */
  debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }
}

// ============================================================================
// Touch Gesture Types
// ============================================================================

/**
 * Touch gesture types
 */
export type GestureType = 
  | 'tap' 
  | 'doubleTap' 
  | 'longPress' 
  | 'swipeLeft' 
  | 'swipeRight' 
  | 'swipeUp' 
  | 'swipeDown' 
  | 'pinch' 
  | 'rotate' 
  | 'pan';

/**
 * Touch event data
 */
export interface TouchEventData {
  /** Gesture type */
  type: GestureType;
  /** Original DOM event */
  originalEvent: TouchEvent;
  /** Touch start position */
  startX: number;
  startY: number;
  /** Current touch position */
  currentX: number;
  /** Current Y position */
  currentY: number;
  /** Distance moved in X */
  deltaX: number;
  /** Distance moved in Y */
  deltaY: number;
  /** Distance from start */
  distance: number;
  /** Velocity of movement */
  velocity: number;
  /** Scale for pinch (1 = normal) */
  scale?: number;
  /** Rotation in degrees */
  rotation?: number;
  /** Duration of gesture in ms */
  duration: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Gesture handler function type
 */
export type GestureHandler = (data: TouchEventData) => void;

/**
 * Touch gesture configuration
 */
export interface GestureConfig {
  /** Minimum distance for swipe (px) */
  swipeThreshold: number;
  /** Maximum time for tap (ms) */
  tapThreshold: number;
  /** Time for long press (ms) */
  longPressThreshold: number;
  /** Maximum time between taps for double-tap (ms) */
  doubleTapThreshold: number;
  /** Minimum scale change for pinch */
  pinchThreshold: number;
  /** Minimum rotation for rotate gesture */
  rotateThreshold: number;
  /** Prevent default on gestures */
  preventDefault: boolean;
}

/**
 * Default gesture configuration
 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  swipeThreshold: 50,
  tapThreshold: 250,
  longPressThreshold: 500,
  doubleTapThreshold: 300,
  pinchThreshold: 0.1,
  rotateThreshold: 15,
  preventDefault: true,
};

// ============================================================================
// TouchGestureHandler Class
// ============================================================================

// Minimal Touch and TouchEvent interface declarations
interface Touch {
  clientX: number;
  clientY: number;
  identifier: number;
}

interface TouchEvent {
  touches: Touch[];
  changedTouches: Touch[];
  preventDefault(): void;
}

/**
 * TouchGestureHandler class for handling touch gestures on mobile devices
 * 
 * @example
 * ```typescript
 * const handler = new TouchGestureHandler(element);
 * handler.on('swipeLeft', (e) => console.log('Swiped left!'));
 * handler.on('doubleTap', (e) => console.log('Double tapped!'));
 * ```
 */
export class TouchGestureHandler {
  private element: HTMLElement;
  private config: GestureConfig;
  private handlers: Map<GestureType, GestureHandler[]> = new Map();
  
  private touchStartTime = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private startDistance = 0;
  private startAngle = 0;
  private isMultiTouch = false;

  /**
   * Creates a new TouchGestureHandler instance
   * @param element - DOM element to attach gestures to
   * @param config - Optional gesture configuration
   */
  constructor(element: HTMLElement, config: Partial<GestureConfig> = {}) {
    this.element = element;
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };
    this.attachListeners();
  }

  /**
   * Attaches touch event listeners to element
   */
  private attachListeners(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart as (e: unknown) => void, { passive: !this.config.preventDefault });
    this.element.addEventListener('touchmove', this.handleTouchMove as (e: unknown) => void, { passive: !this.config.preventDefault });
    this.element.addEventListener('touchend', this.handleTouchEnd as (e: unknown) => void, { passive: !this.config.preventDefault });
    this.element.addEventListener('touchcancel', this.handleTouchCancel as (e: unknown) => void, { passive: true });
  }

  /**
   * Removes all event listeners
   */
  destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart as (e: unknown) => void);
    this.element.removeEventListener('touchmove', this.handleTouchMove as (e: unknown) => void);
    this.element.removeEventListener('touchend', this.handleTouchEnd as (e: unknown) => void);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel as (e: unknown) => void);
    this.handlers.clear();
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }

  /**
   * Registers a handler for a gesture type
   * @param gesture - Gesture type to listen for
   * @param handler - Handler function
   */
  on(gesture: GestureType, handler: GestureHandler): void {
    if (!this.handlers.has(gesture)) {
      this.handlers.set(gesture, []);
    }
    this.handlers.get(gesture)!.push(handler);
  }

  /**
   * Removes a handler for a gesture type
   * @param gesture - Gesture type
   * @param handler - Handler function to remove
   */
  off(gesture: GestureType, handler: GestureHandler): void {
    const handlers = this.handlers.get(gesture);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Triggers handlers for a gesture
   * @param gesture - Gesture type
   * @param data - Event data
   */
  private trigger(gesture: GestureType, data: TouchEventData): void {
    const handlers = this.handlers.get(gesture);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Gesture handler error for ${gesture}:`, err);
        }
      });
    }
  }

  /**
   * Handles touch start event
   */
  private handleTouchStart = (e: TouchEvent): void => {
    if (this.config.preventDefault) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    this.touchStartTime = Date.now();
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isMultiTouch = e.touches.length > 1;

    // Handle multi-touch (pinch/rotate)
    if (this.isMultiTouch) {
      const touch2 = e.touches[1];
      this.startDistance = this.getDistance(touch, touch2);
      this.startAngle = this.getAngle(touch, touch2);
    }

    // Set up long press detection
    this.longPressTimer = setTimeout(() => {
      this.trigger('longPress', this.createEventData('longPress', e));
    }, this.config.longPressThreshold);
  };

  /**
   * Handles touch move event
   */
  private handleTouchMove = (e: TouchEvent): void => {
    if (this.config.preventDefault) {
      e.preventDefault();
    }

    // Cancel long press if moving
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // Handle pan
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > 10) {
      this.trigger('pan', {
        ...this.createEventData('pan', e),
        deltaX,
        deltaY,
        distance,
      });
    }

    // Handle pinch and rotate
    if (this.isMultiTouch && e.touches.length > 1) {
      const touch2 = e.touches[1];
      const currentDistance = this.getDistance(touch, touch2);
      const currentAngle = this.getAngle(touch, touch2);

      // Pinch
      const scale = currentDistance / this.startDistance;
      if (Math.abs(scale - 1) > this.config.pinchThreshold) {
        this.trigger('pinch', {
          ...this.createEventData('pinch', e),
          scale,
        });
      }

      // Rotate
      const rotation = currentAngle - this.startAngle;
      if (Math.abs(rotation) > this.config.rotateThreshold) {
        this.trigger('rotate', {
          ...this.createEventData('rotate', e),
          rotation,
        });
      }
    }
  };

  /**
   * Handles touch end event
   */
  private handleTouchEnd = (e: TouchEvent): void => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const duration = Date.now() - this.touchStartTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Tap detection
    if (distance < this.config.swipeThreshold && duration < this.config.tapThreshold) {
      const now = Date.now();
      const tapDistance = Math.sqrt(
        Math.pow(touch.clientX - this.lastTapX, 2) + 
        Math.pow(touch.clientY - this.lastTapY, 2)
      );

      // Double tap detection
      if (now - this.lastTapTime < this.config.doubleTapThreshold && tapDistance < 30) {
        this.trigger('doubleTap', this.createEventData('doubleTap', e, touch));
        this.lastTapTime = 0; // Reset
      } else {
        // Single tap (delay to check for double tap)
        setTimeout(() => {
          if (this.lastTapTime !== 0) {
            this.trigger('tap', this.createEventData('tap', e, touch));
          }
        }, this.config.doubleTapThreshold);
        this.lastTapTime = now;
        this.lastTapX = touch.clientX;
        this.lastTapY = touch.clientY;
      }
    }

    // Swipe detection
    if (distance >= this.config.swipeThreshold && duration < 500) {
      const velocity = distance / duration;
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontal) {
        if (deltaX > 0) {
          this.trigger('swipeRight', { ...this.createEventData('swipeRight', e, touch), velocity });
        } else {
          this.trigger('swipeLeft', { ...this.createEventData('swipeLeft', e, touch), velocity });
        }
      } else {
        if (deltaY > 0) {
          this.trigger('swipeDown', { ...this.createEventData('swipeDown', e, touch), velocity });
        } else {
          this.trigger('swipeUp', { ...this.createEventData('swipeUp', e, touch), velocity });
        }
      }
    }

    this.isMultiTouch = false;
  };

  /**
   * Handles touch cancel event
   */
  private handleTouchCancel = (e: TouchEvent): void => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.isMultiTouch = false;
  };

  /**
   * Creates event data object
   */
  private createEventData(type: GestureType, originalEvent: TouchEvent, touch?: Touch): TouchEventData {
    const t = touch ?? originalEvent.changedTouches[0] ?? originalEvent.touches[0];
    const currentTime = Date.now();
    
    return {
      type,
      originalEvent,
      startX: this.touchStartX,
      startY: this.touchStartY,
      currentX: t?.clientX ?? 0,
      currentY: t?.clientY ?? 0,
      deltaX: (t?.clientX ?? 0) - this.touchStartX,
      deltaY: (t?.clientY ?? 0) - this.touchStartY,
      distance: 0,
      velocity: 0,
      duration: currentTime - this.touchStartTime,
      timestamp: currentTime,
    };
  }

  /**
   * Calculates distance between two touches
   */
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculates angle between two touches
   */
  private getAngle(touch1: Touch, touch2: Touch): number {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * 180 / Math.PI;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Utility function to quickly detect if running on mobile
 * @returns True if mobile device detected
 */
export function isMobile(): boolean {
  return new DeviceDetector().detect().isMobile;
}

/**
 * Utility function to quickly detect if running on tablet
 * @returns True if tablet device detected
 */
export function isTablet(): boolean {
  return new DeviceDetector().detect().isTablet;
}

/**
 * Utility function to get optimized config for current device
 * @returns OptimizationConfig for current device
 */
export function getOptimizedConfig(): OptimizationConfig {
  return new MobileOptimizer().getOptimizedConfig();
}
