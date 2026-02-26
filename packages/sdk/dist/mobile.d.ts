/**
 * Agora Mobile SDK Module
 *
 * Provides mobile device detection, performance optimization, and touch gesture handling
 * for the Agora platform on iOS/Android devices.
 *
 * @module mobile
 * @version 1.0.0
 */
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
    screen?: {
        width: number;
        height: number;
    };
    /** Custom pixel ratio (defaults to window.devicePixelRatio) */
    pixelRatio?: number;
}
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
export declare class DeviceDetector {
    private userAgent;
    private screen;
    private pixelRatio;
    /**
     * Creates a new DeviceDetector instance
     * @param options - Detection options
     */
    constructor(options?: DeviceDetectorOptions);
    /**
     * Detects device information from user agent and screen properties
     * @returns DeviceInfo object with detected properties
     */
    detect(): DeviceInfo;
    /**
     * Detects the operating system
     * @returns OS type
     */
    detectOS(): OS;
    /**
     * Detects the OS version
     * @returns OS version string
     */
    detectOSVersion(): string;
    /**
     * Detects the device type (mobile, tablet, desktop)
     * @returns Device type
     */
    detectDeviceType(): DeviceType;
    /**
     * Detects device manufacturer
     * @returns Manufacturer name or undefined
     */
    detectManufacturer(): string | undefined;
    /**
     * Detects device model
     * @returns Model name or undefined
     */
    detectModel(): string | undefined;
    /**
     * Detects current screen orientation
     * @returns Orientation type
     */
    detectOrientation(): Orientation;
    /**
     * Checks if device supports touch
     * @returns True if touch is supported
     */
    isTouchDevice(): boolean;
    /**
     * Checks if device is in low-power mode (iOS only, best effort)
     * @returns True if likely in low-power mode
     */
    isLowPowerMode(): boolean;
}
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
 * Performance metrics interface
 */
export interface PerformanceMetrics {
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
export declare class MobileOptimizer {
    private deviceDetector;
    private config;
    /**
     * Creates a new MobileOptimizer instance
     * @param deviceDetector - Optional custom DeviceDetector
     * */
    constructor(deviceDetector?: DeviceDetector);
    /**
     * Gets the optimized configuration based on device capabilities
     * @returns OptimizationConfig tailored to device
     */
    getOptimizedConfig(): OptimizationConfig;
    /**
     * Generates optimized configuration based on device detection
     * @returns Optimization configuration
     */
    private generateOptimizedConfig;
    /**
     * Estimates device performance level
     * @returns Performance level
     */
    estimatePerformanceLevel(): PerformanceLevel;
    /**
     * Gets current performance metrics
     * @returns PerformanceMetrics object
     */
    getPerformanceMetrics(): PerformanceMetrics;
    /**
     * Gets current network type using Network Information API
     * @returns Network type
     */
    getNetworkType(): NetworkType;
    /**
     * Throttles a function for performance
     * @param fn - Function to throttle
     * @param limit - Time limit in ms
     * @returns Throttled function
     */
    throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void;
    /**
     * Debounces a function for performance
     * @param fn - Function to debounce
     * @param delay - Delay in ms
     * @returns Debounced function
     */
    debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void;
}
/**
 * Touch gesture types
 */
export type GestureType = 'tap' | 'doubleTap' | 'longPress' | 'swipeLeft' | 'swipeRight' | 'swipeUp' | 'swipeDown' | 'pinch' | 'rotate' | 'pan';
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
export declare const DEFAULT_GESTURE_CONFIG: GestureConfig;
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
export declare class TouchGestureHandler {
    private element;
    private config;
    private handlers;
    private touchStartTime;
    private touchStartX;
    private touchStartY;
    private lastTapTime;
    private lastTapX;
    private lastTapY;
    private longPressTimer;
    private startDistance;
    private startAngle;
    private initialScale;
    private initialRotation;
    private isMultiTouch;
    /**
     * Creates a new TouchGestureHandler instance
     * @param element - DOM element to attach gestures to
     * @param config - Optional gesture configuration
     */
    constructor(element: HTMLElement, config?: Partial<GestureConfig>);
    /**
     * Attaches touch event listeners to element
     */
    private attachListeners;
    /**
     * Removes all event listeners
     */
    destroy(): void;
    /**
     * Registers a handler for a gesture type
     * @param gesture - Gesture type to listen for
     * @param handler - Handler function
     */
    on(gesture: GestureType, handler: GestureHandler): void;
    /**
     * Removes a handler for a gesture type
     * @param gesture - Gesture type
     * @param handler - Handler function to remove
     */
    off(gesture: GestureType, handler: GestureHandler): void;
    /**
     * Triggers handlers for a gesture
     * @param gesture - Gesture type
     * @param data - Event data
     */
    private trigger;
    /**
     * Handles touch start event
     */
    private handleTouchStart;
    /**
     * Handles touch move event
     */
    private handleTouchMove;
    /**
     * Handles touch end event
     */
    private handleTouchEnd;
    /**
     * Handles touch cancel event
     */
    private handleTouchCancel;
    /**
     * Creates event data object
     */
    private createEventData;
    /**
     * Calculates distance between two touches
     */
    private getDistance;
    /**
     * Calculates angle between two touches
     */
    private getAngle;
}
/**
 * Utility function to quickly detect if running on mobile
 * @returns True if mobile device detected
 */
export declare function isMobile(): boolean;
/**
 * Utility function to quickly detect if running on tablet
 * @returns True if tablet device detected
 */
export declare function isTablet(): boolean;
/**
 * Utility function to get optimized config for current device
 * @returns OptimizationConfig for current device
 */
export declare function getOptimizedConfig(): OptimizationConfig;
export { DeviceDetector, MobileOptimizer, TouchGestureHandler, };
//# sourceMappingURL=mobile.d.ts.map