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
import { AgoraAgent, type AgoraAgentOptions } from '@agora/sdk/agent.js';
import { DeviceDetector, MobileOptimizer, TouchGestureHandler, type DeviceInfo, type DeviceType, type OS, type PerformanceLevel, type NetworkType, type OptimizationConfig, type MobilePerformanceMetrics, type GestureType, type GestureHandler, type TouchEventData } from '@agora/sdk/mobile.js';
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
export type MobileUIAction = 'swipeLeft' | 'swipeRight' | 'pullToRefresh' | 'tap' | 'longPress' | 'pinchZoom';
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
export declare class MobileAgent extends AgoraAgent {
    /** Device detector instance */
    readonly deviceDetector: DeviceDetector;
    /** Mobile optimizer instance */
    readonly optimizer: MobileOptimizer;
    /** Touch gesture handler */
    readonly gestureHandler?: TouchGestureHandler;
    private mobileOptions;
    private gestureCallbacks;
    private stateUpdateInterval?;
    /**
     * Creates a new MobileAgent instance
     * @param options - Mobile agent options
     */
    constructor(options: MobileAgentOptions);
    /**
     * Gets the current mobile agent state
     * @returns MobileAgentState snapshot
     */
    getState(): MobileAgentState;
    /**
     * Checks if the agent can handle a task based on performance requirements
     * @param requiredLevel - Minimum performance level required
     * @returns True if device meets requirements
     */
    canHandleTask(requiredLevel?: PerformanceLevel): boolean;
    /**
     * Adapts a payload for mobile display
     * @param payload - Original payload
     * @returns Mobile-adapted payload
     */
    adaptForMobile(payload: unknown): MobileAdaptedPayload;
    /**
     * Registers a callback for a mobile gesture
     * @param action - UI action triggered by gesture
     * @param callback - Callback function
     */
    onGesture(action: MobileUIAction, callback: (cmd: MobileGestureCommand) => void): void;
    /**
     * Removes a gesture callback
     * @param action - UI action
     * @param callback - Callback to remove
     */
    offGesture(action: MobileUIAction, callback: (cmd: MobileGestureCommand) => void): void;
    /**
     * Sends a request with mobile adaptation
     * @param payload - Request payload
     * @param options - Request options
     */
    sendMobileRequest(payload: {
        intent: string;
        params: Record<string, unknown>;
    }, options?: {
        recipient?: string;
        thread?: string;
        adaptForMobile?: boolean;
    }): Promise<{
        ok: boolean;
        id?: string;
        error?: string;
    }>;
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
    };
    /**
     * Cleans up resources
     */
    destroy(): void;
    /**
     * Sets up gesture to action mapping
     */
    private setupGestureMapping;
    /**
     * Handles a gesture event
     */
    private handleGesture;
    /**
     * Starts performance monitoring
     */
    private startPerformanceMonitoring;
    /**
     * Truncates content for mobile display
     */
    private truncateContent;
    /**
     * Gets a user agent string for a specific device type (for testing)
     */
    private getUserAgentForDeviceType;
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
export declare function createMobileAgent(options: MobileAgentOptions): MobileAgent;
/**
 * Quick check if running in mobile environment
 * @returns True if mobile or tablet
 */
export declare function isMobileEnvironment(): boolean;
/**
 * Gets device-appropriate configuration
 * @returns Configuration for current device
 */
export declare function getMobileConfig(): OptimizationConfig;
export type { DeviceInfo, DeviceType, OS, PerformanceLevel, NetworkType, OptimizationConfig, MobilePerformanceMetrics, GestureType, GestureHandler, TouchEventData, };
//# sourceMappingURL=mobile-adapter.d.ts.map