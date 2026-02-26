/**
 * Agora Mobile Agent Adapter
 * 
 * Provides mobile-specific agent functionality for the Agora platform.
 * Integrates with the SDK mobile module to offer device-aware agent operations
 * optimized for iOS/Android devices.
 * 
 * @module mobile-adapter
 * @version 1.0.0
 */

import {
  AgoraAgent,
  type AgoraAgentOptions,
} from '../../../packages/sdk/src/agent.js';
import {
  DeviceDetector,
  MobileOptimizer,
  TouchGestureHandler,
  type DeviceInfo,
  type DeviceType,
  type OS,
  type PerformanceLevel,
  type NetworkType,
  type OptimizationConfig,
  type MobilePerformanceMetrics,
  type GestureType,
  type GestureHandler,
  type TouchEventData,
  isMobile,
  isTablet,
  getOptimizedConfig,
} from '../../../packages/sdk/src/mobile.js';

/**
 * Mobile agent configuration options
 */
export interface MobileAgentOptions extends AgoraAgentOptions {
  /** Enable mobile optimizations */
  enableMobileOptimizations?: boolean;
  /** Enable touch gesture handling */
  enableTouchGestures?: boolean;
  /** Custom viewport element for gestures */
  gestureElement?: HTMLElement;
  /** Force specific device type for testing */
  forceDeviceType?: DeviceType;
  /** Minimum performance level to accept tasks */
  minPerformanceLevel?: PerformanceLevel;
  /** Adapt messages for mobile display */
  adaptForMobileDisplay?: boolean;
  /** Maximum message length for mobile */
  mobileMessageLimit?: number;
}

/**
 * Mobile agent state
 */
export interface MobileAgentState {
  /** Detected device information */
  deviceInfo: DeviceInfo;
  /** Current optimization configuration */
  optimizationConfig: OptimizationConfig;
  /** Current performance metrics */
  performanceMetrics: MobilePerformanceMetrics;
  /** Whether the agent is running on mobile */
  isMobileEnvironment: boolean;
  /** Whether gestures are enabled */
  gesturesEnabled: boolean;
  /** Network quality indicator */
  networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

/**
 * Mobile-adapted message payload
 */
export interface MobileAdaptedPayload {
  /** Original payload (potentially truncated) */
  content: unknown;
  /** Whether content was truncated for mobile */
  isTruncated: boolean;
  /** Full content available flag */
  fullContentAvailable: boolean;
  /** Suggested action for user to view full content */
  viewFullAction?: string;
  /** Mobile-optimized formatting hints */
  formattingHints?: {
    /** Prefer compact display */
    compact?: boolean;
    /** Enable horizontal scroll for tables */
    scrollableTables?: boolean;
    /** Collapse nested sections */
    collapseNesting?: boolean;
  };
}

/**
 * Mobile UI action types
 */
export type MobileUIAction = 
  | 'swipeLeft'
  | 'swipeRight'
  | 'pullToRefresh'
  | 'tap'
  | 'longPress'
  | 'pinchZoom';

/**
 * Mobile gesture command interface
 */
export interface MobileGestureCommand {
  /** Gesture that triggered the command */
  gesture: GestureType;
  /** Action to perform */
  action: MobileUIAction;
  /** Context data */
  context?: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
}

/**
 * MobileAgent class - Agora agent with mobile optimizations
 * 
 * Extends the base AgoraAgent with mobile-specific functionality including:
 * - Device detection and capability assessment
 * - Performance-based optimization
 * - Touch gesture handling
 * - Mobile-adapted message formatting
 * 
 * @example
 * ```typescript
 * const mobileAgent = new MobileAgent({
 *   did: 'did:agora:agent123',
 *   privateKey: agentKey,
 *   relayUrl: 'https://relay.agora.net',
 *   enableMobileOptimizations: true,
 *   enableTouchGestures: true,
 * });
 * 
 * await mobileAgent.register();
 * 
 * // Handle gestures
 * mobileAgent.onGesture('swipeLeft', (cmd) => {
 *   console.log('User swiped left');
 * });
 * ```
 */
export class MobileAgent extends AgoraAgent {
  /** Device detector instance */
  public readonly deviceDetector: DeviceDetector;
  /** Mobile optimizer instance */
  public readonly optimizer: MobileOptimizer;
  /** Touch gesture handler */
  public readonly gestureHandler?: TouchGestureHandler;
  
  private mobileOptions: MobileAgentOptions;
  private gestureCallbacks: Map<MobileUIAction, ((cmd: MobileGestureCommand) => void)[]> = new Map();
  private stateUpdateInterval?: ReturnType<typeof setInterval>;

  /**
   * Creates a new MobileAgent instance
   * @param options - Mobile agent options
   */
  constructor(options: MobileAgentOptions) {
    super(options);
    this.mobileOptions = options;

    // Initialize device detection
    const detectorOptions = options.forceDeviceType 
      ? { userAgent: this.getUserAgentForDeviceType(options.forceDeviceType) }
      : {};
    this.deviceDetector = new DeviceDetector(detectorOptions);

    // Initialize optimizer
    this.optimizer = new MobileOptimizer(this.deviceDetector);

    // Initialize gesture handler if enabled
    if (options.enableTouchGestures && options.gestureElement) {
      this.gestureHandler = new TouchGestureHandler(options.gestureElement);
      this.setupGestureMapping();
    }

    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Gets the current mobile agent state
   * @returns MobileAgentState snapshot
   */
  getState(): MobileAgentState {
    const deviceInfo = this.deviceDetector.detect();
    const optimizationConfig = this.optimizer.getOptimizedConfig();
    const performanceMetrics = this.optimizer.getPerformanceMetrics();

    // Determine network quality
    let networkQuality: MobileAgentState['networkQuality'] = 'good';
    switch (performanceMetrics.networkType) {
      case '4g':
      case 'wifi':
        networkQuality = 'excellent';
        break;
      case '3g':
        networkQuality = 'good';
        break;
      case '2g':
      case 'slow-2g':
        networkQuality = 'poor';
        break;
      case 'offline':
        networkQuality = 'offline';
        break;
    }

    return {
      deviceInfo,
      optimizationConfig,
      performanceMetrics,
      isMobileEnvironment: deviceInfo.isMobile || deviceInfo.isTablet,
      gesturesEnabled: !!this.gestureHandler,
      networkQuality,
    };
  }

  /**
   * Checks if the agent can handle a task based on performance requirements
   * @param requiredLevel - Minimum performance level required
   * @returns True if device meets requirements
   */
  canHandleTask(requiredLevel?: PerformanceLevel): boolean {
    const state = this.getState();
    const minLevel = requiredLevel ?? this.mobileOptions.minPerformanceLevel ?? 'low';
    
    const levels: Record<PerformanceLevel, number> = { low: 1, medium: 2, high: 3 };
    return levels[state.performanceMetrics.performanceLevel] >= levels[minLevel];
  }

  /**
   * Adapts a payload for mobile display
   * @param payload - Original payload
   * @returns Mobile-adapted payload
   */
  adaptForMobile(payload: unknown): MobileAdaptedPayload {
    const state = this.getState();
    const limit = this.mobileOptions.mobileMessageLimit ?? 1000;
    
    // Convert payload to string for analysis
    const contentStr = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    const needsTruncation = contentStr.length > limit && state.isMobileEnvironment;
    
    return {
      content: needsTruncation ? this.truncateContent(payload, limit) : payload,
      isTruncated: needsTruncation,
      fullContentAvailable: needsTruncation,
      viewFullAction: needsTruncation ? 'tap_to_expand' : undefined,
      formattingHints: {
        compact: state.isMobileEnvironment,
        scrollableTables: true,
        collapseNesting: state.deviceInfo.screenWidth < 400,
      },
    };
  }

  /**
   * Registers a callback for a mobile gesture
   * @param action - UI action triggered by gesture
   * @param callback - Callback function
   */
  onGesture(action: MobileUIAction, callback: (cmd: MobileGestureCommand) => void): void {
    if (!this.gestureCallbacks.has(action)) {
      this.gestureCallbacks.set(action, []);
    }
    this.gestureCallbacks.get(action)!.push(callback);
  }

  /**
   * Removes a gesture callback
   * @param action - UI action
   * @param callback - Callback to remove
   */
  offGesture(action: MobileUIAction, callback: (cmd: MobileGestureCommand) => void): void {
    const callbacks = this.gestureCallbacks.get(action);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Sends a request with mobile adaptation
   * @param payload - Request payload
   * @param options - Request options
   */
  async sendMobileRequest(
    payload: { intent: string; params: Record<string, unknown> },
    options?: { recipient?: string; thread?: string; adaptForMobile?: boolean }
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    // Adapt payload if needed
    const adaptedPayload = options?.adaptForMobile !== false
      ? this.adaptForMobile(payload.params)
      : payload.params;

    return this.sendRequest({
      request_id: crypto.randomUUID(),
      intent: payload.intent,
      params: adaptedPayload as Record<string, unknown>,
    }, options);
  }

  /**
   * Gets recommended UI configuration for current device
   * @returns UI configuration recommendations
   */
  getUIRecommendations(): {
    useBottomSheet: boolean;
    useSwipeActions: boolean;
    usePullToRefresh: boolean;
    maxItemsPerPage: number;
    enableAnimations: boolean;
    useCompactCards: boolean;
  } {
    const state = this.getState();
    const config = state.optimizationConfig;

    return {
      useBottomSheet: state.isMobileEnvironment,
      useSwipeActions: state.isMobileEnvironment && state.gesturesEnabled,
      usePullToRefresh: state.isMobileEnvironment,
      maxItemsPerPage: config.maxListItems,
      enableAnimations: config.enableAnimations,
      useCompactCards: state.deviceInfo.screenWidth < 400,
    };
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
    }
    this.gestureHandler?.destroy();
    this.gestureCallbacks.clear();
  }

  /**
   * Sets up gesture to action mapping
   */
  private setupGestureMapping(): void {
    if (!this.gestureHandler) return;

    // Map gestures to UI actions
    const gestureMap: Partial<Record<GestureType, MobileUIAction>> = {
      swipeLeft: 'swipeLeft',
      swipeRight: 'swipeRight',
      tap: 'tap',
      longPress: 'longPress',
      pinch: 'pinchZoom',
    };

    Object.entries(gestureMap).forEach(([gesture, action]) => {
      this.gestureHandler!.on(gesture as GestureType, (data) => {
        this.handleGesture(action, data);
      });
    });
  }

  /**
   * Handles a gesture event
   */
  private handleGesture(action: MobileUIAction, data: TouchEventData): void {
    const command: MobileGestureCommand = {
      gesture: data.type,
      action,
      context: {
        position: { x: data.currentX, y: data.currentY },
        velocity: data.velocity,
        duration: data.duration,
      },
      timestamp: Date.now(),
    };

    // Trigger callbacks for this action
    const callbacks = this.gestureCallbacks.get(action);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(command);
        } catch (err) {
          console.error(`Gesture callback error for ${action}:`, err);
        }
      });
    }
  }

  /**
   * Starts performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Update state every 30 seconds
    this.stateUpdateInterval = setInterval(() => {
      const metrics = this.optimizer.getPerformanceMetrics();
      
      // Log performance warnings
      if (metrics.performanceLevel === 'low') {
        console.warn('[MobileAgent] Low performance detected');
      }
      if (metrics.networkType === '2g' || metrics.networkType === 'slow-2g') {
        console.warn('[MobileAgent] Poor network connection');
      }
    }, 30000);
  }

  /**
   * Truncates content for mobile display
   */
  private truncateContent(payload: unknown, limit: number): unknown {
    if (typeof payload === 'string') {
      return payload.substring(0, limit) + '...';
    }
    
    if (typeof payload === 'object' && payload !== null) {
      const str = JSON.stringify(payload);
      if (str.length > limit) {
        // Return a summary object
        return {
          _summary: 'Content truncated for mobile',
          _originalLength: str.length,
          _truncated: true,
        };
      }
    }
    
    return payload;
  }

  /**
   * Gets a user agent string for a specific device type (for testing)
   */
  private getUserAgentForDeviceType(deviceType: DeviceType): string {
    const userAgents: Record<DeviceType, string> = {
      mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      tablet: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      unknown: '',
    };
    return userAgents[deviceType] || userAgents.mobile;
  }
}

/**
 * Factory function to create a mobile agent with sensible defaults
 * @param options - Mobile agent options
 * @returns Configured MobileAgent instance
 * 
 * @example
 * ```typescript
 * const agent = createMobileAgent({
 *   did: 'did:agora:myagent',
 *   privateKey: key,
 *   relayUrl: 'https://relay.agora.net',
 * });
 * ```
 */
export function createMobileAgent(options: MobileAgentOptions): MobileAgent {
  return new MobileAgent({
    enableMobileOptimizations: true,
    adaptForMobileDisplay: true,
    mobileMessageLimit: 1500,
    ...options,
  });
}

/**
 * Quick check if running in mobile environment
 * @returns True if mobile or tablet
 */
export function isMobileEnvironment(): boolean {
  return isMobile() || isTablet();
}

/**
 * Gets device-appropriate configuration
 * @returns Configuration for current device
 */
export function getMobileConfig(): OptimizationConfig {
  return getOptimizedConfig();
}

// Re-export mobile SDK types
export type {
  DeviceInfo,
  DeviceType,
  OS,
  PerformanceLevel,
  NetworkType,
  OptimizationConfig,
  MobilePerformanceMetrics,
  GestureType,
  GestureHandler,
  TouchEventData,
};
