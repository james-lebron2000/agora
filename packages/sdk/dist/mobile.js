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
    userAgent;
    screen;
    pixelRatio;
    /**
     * Creates a new DeviceDetector instance
     * @param options - Detection options
     */
    constructor(options = {}) {
        this.userAgent = options.userAgent?.toLowerCase() ??
            (typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '');
        this.screen = options.screen ??
            (typeof window !== 'undefined' ? { width: window.screen.width, height: window.screen.height } : { width: 0, height: 0 });
        this.pixelRatio = options.pixelRatio ??
            (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    }
    /**
     * Detects device information from user agent and screen properties
     * @returns DeviceInfo object with detected properties
     */
    detect() {
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
    detectOS() {
        if (/iphone|ipad|ipod/.test(this.userAgent))
            return 'ios';
        if (/android/.test(this.userAgent))
            return 'android';
        if (/windows/.test(this.userAgent))
            return 'windows';
        if (/macintosh|mac os x/.test(this.userAgent))
            return 'macos';
        if (/linux/.test(this.userAgent))
            return 'linux';
        return 'unknown';
    }
    /**
     * Detects the OS version
     * @returns OS version string
     */
    detectOSVersion() {
        const os = this.detectOS();
        const match = this.userAgent.match(new RegExp(`${os}[\s/]?([\d._]+)`, 'i'));
        return match?.[1]?.replace(/_/g, '.') ?? 'unknown';
    }
    /**
     * Detects the device type (mobile, tablet, desktop)
     * @returns Device type
     */
    detectDeviceType() {
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
    detectManufacturer() {
        if (/apple/.test(this.userAgent))
            return 'Apple';
        if (/samsung/.test(this.userAgent))
            return 'Samsung';
        if (/huawei/.test(this.userAgent))
            return 'Huawei';
        if (/xiaomi/.test(this.userAgent))
            return 'Xiaomi';
        if (/google/.test(this.userAgent))
            return 'Google';
        if (/oneplus/.test(this.userAgent))
            return 'OnePlus';
        return undefined;
    }
    /**
     * Detects device model
     * @returns Model name or undefined
     */
    detectModel() {
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
    detectOrientation() {
        if (typeof window !== 'undefined' && window.screen?.orientation) {
            return window.screen.orientation.type.startsWith('landscape') ? 'landscape' : 'portrait';
        }
        return this.screen.width > this.screen.height ? 'landscape' : 'portrait';
    }
    /**
     * Checks if device supports touch
     * @returns True if touch is supported
     */
    isTouchDevice() {
        if (typeof window !== 'undefined') {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }
        return /iphone|ipad|ipod|android|windows phone/.test(this.userAgent);
    }
    /**
     * Checks if device is in low-power mode (iOS only, best effort)
     * @returns True if likely in low-power mode
     */
    isLowPowerMode() {
        // This is a best-effort detection based on reduced motion preference
        if (typeof window !== 'undefined' && 'matchMedia' in window) {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        return false;
    }
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
export class MobileOptimizer {
    deviceDetector;
    config;
    /**
     * Creates a new MobileOptimizer instance
     * @param deviceDetector - Optional custom DeviceDetector
     * */
    constructor(deviceDetector) {
        this.deviceDetector = deviceDetector ?? new DeviceDetector();
        this.config = this.generateOptimizedConfig();
    }
    /**
     * Gets the optimized configuration based on device capabilities
     * @returns OptimizationConfig tailored to device
     */
    getOptimizedConfig() {
        return { ...this.config };
    }
    /**
     * Generates optimized configuration based on device detection
     * @returns Optimization configuration
     */
    generateOptimizedConfig() {
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
    estimatePerformanceLevel() {
        const device = this.deviceDetector.detect();
        // Check for low-end indicators
        if (device.pixelRatio < 2 && device.screenWidth < 400) {
            return 'low';
        }
        // Check device memory if available
        if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
            const memory = navigator.deviceMemory;
            if (memory <= 2)
                return 'low';
            if (memory <= 4)
                return 'medium';
        }
        // Check hardware concurrency
        if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
            if (navigator.hardwareConcurrency <= 2)
                return 'low';
            if (navigator.hardwareConcurrency <= 4)
                return 'medium';
        }
        // Tablet/desktop generally considered higher performance
        if (device.type === 'tablet' || device.type === 'desktop') {
            return 'high';
        }
        return 'medium';
    }
    /**
     * Gets current performance metrics
     * @returns PerformanceMetrics object
     */
    getPerformanceMetrics() {
        const networkType = this.getNetworkType();
        const performanceLevel = this.estimatePerformanceLevel();
        const metrics = {
            networkType,
            performanceLevel,
        };
        // Memory usage (Chrome only)
        if (typeof performance !== 'undefined' && 'memory' in performance) {
            const memory = performance.memory;
            if (memory?.usedJSHeapSize) {
                metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            }
        }
        // DOM node count
        if (typeof document !== 'undefined') {
            metrics.domNodes = document.getElementsByTagName('*').length;
        }
        return metrics;
    }
    /**
     * Gets current network type using Network Information API
     * @returns Network type
     */
    getNetworkType() {
        if (typeof navigator !== 'undefined' && 'connection' in navigator) {
            const conn = navigator.connection;
            if (conn?.effectiveType) {
                return conn.effectiveType;
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
    throttle(fn, limit) {
        let inThrottle = false;
        return (...args) => {
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
    debounce(fn, delay) {
        let timeoutId = null;
        return (...args) => {
            if (timeoutId)
                clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    }
}
/**
 * Default gesture configuration
 */
export const DEFAULT_GESTURE_CONFIG = {
    swipeThreshold: 50,
    tapThreshold: 250,
    longPressThreshold: 500,
    doubleTapThreshold: 300,
    pinchThreshold: 0.1,
    rotateThreshold: 15,
    preventDefault: true,
};
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
    element;
    config;
    handlers = new Map();
    touchStartTime = 0;
    touchStartX = 0;
    touchStartY = 0;
    lastTapTime = 0;
    lastTapX = 0;
    lastTapY = 0;
    longPressTimer = null;
    startDistance = 0;
    startAngle = 0;
    initialScale = 1;
    initialRotation = 0;
    isMultiTouch = false;
    /**
     * Creates a new TouchGestureHandler instance
     * @param element - DOM element to attach gestures to
     * @param config - Optional gesture configuration
     */
    constructor(element, config = {}) {
        this.element = element;
        this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };
        this.attachListeners();
    }
    /**
     * Attaches touch event listeners to element
     */
    attachListeners() {
        this.element.addEventListener('touchstart', this.handleTouchStart, { passive: !this.config.preventDefault });
        this.element.addEventListener('touchmove', this.handleTouchMove, { passive: !this.config.preventDefault });
        this.element.addEventListener('touchend', this.handleTouchEnd, { passive: !this.config.preventDefault });
        this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: true });
    }
    /**
     * Removes all event listeners
     */
    destroy() {
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('touchcancel', this.handleTouchCancel);
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
    on(gesture, handler) {
        if (!this.handlers.has(gesture)) {
            this.handlers.set(gesture, []);
        }
        this.handlers.get(gesture).push(handler);
    }
    /**
     * Removes a handler for a gesture type
     * @param gesture - Gesture type
     * @param handler - Handler function to remove
     */
    off(gesture, handler) {
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
    trigger(gesture, data) {
        const handlers = this.handlers.get(gesture);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                }
                catch (err) {
                    console.error(`Gesture handler error for ${gesture}:`, err);
                }
            });
        }
    }
    /**
     * Handles touch start event
     */
    handleTouchStart = (e) => {
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
            this.initialScale = 1;
            this.initialRotation = 0;
        }
        // Set up long press detection
        this.longPressTimer = setTimeout(() => {
            this.trigger('longPress', this.createEventData('longPress', e));
        }, this.config.longPressThreshold);
    };
    /**
     * Handles touch move event
     */
    handleTouchMove = (e) => {
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
    handleTouchEnd = (e) => {
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
            const tapDistance = Math.sqrt(Math.pow(touch.clientX - this.lastTapX, 2) +
                Math.pow(touch.clientY - this.lastTapY, 2));
            // Double tap detection
            if (now - this.lastTapTime < this.config.doubleTapThreshold && tapDistance < 30) {
                this.trigger('doubleTap', this.createEventData('doubleTap', e, touch));
                this.lastTapTime = 0; // Reset
            }
            else {
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
                }
                else {
                    this.trigger('swipeLeft', { ...this.createEventData('swipeLeft', e, touch), velocity });
                }
            }
            else {
                if (deltaY > 0) {
                    this.trigger('swipeDown', { ...this.createEventData('swipeDown', e, touch), velocity });
                }
                else {
                    this.trigger('swipeUp', { ...this.createEventData('swipeUp', e, touch), velocity });
                }
            }
        }
        this.isMultiTouch = false;
    };
    /**
     * Handles touch cancel event
     */
    handleTouchCancel = (e) => {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.isMultiTouch = false;
    };
    /**
     * Creates event data object
     */
    createEventData(type, originalEvent, touch) {
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
    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /**
     * Calculates angle between two touches
     */
    getAngle(touch1, touch2) {
        return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * 180 / Math.PI;
    }
}
/**
 * Utility function to quickly detect if running on mobile
 * @returns True if mobile device detected
 */
export function isMobile() {
    return new DeviceDetector().detect().isMobile;
}
/**
 * Utility function to quickly detect if running on tablet
 * @returns True if tablet device detected
 */
export function isTablet() {
    return new DeviceDetector().detect().isTablet;
}
/**
 * Utility function to get optimized config for current device
 * @returns OptimizationConfig for current device
 */
export function getOptimizedConfig() {
    return new MobileOptimizer().getOptimizedConfig();
}
//# sourceMappingURL=mobile.js.map