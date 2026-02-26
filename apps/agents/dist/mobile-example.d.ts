/**
 * Agora Mobile Adapter Usage Example
 *
 * Demonstrates how to use the MobileAgent class for building
 * mobile-optimized Agora agents with gesture support and
 * performance-based adaptations.
 *
 * @example
 * Run with: tsx mobile-example.ts
 */
import { MobileAgent } from './mobile-adapter.js';
/**
 * Creates a basic mobile agent with default optimizations
 */
declare function createBasicMobileAgent(): Promise<MobileAgent>;
/**
 * Creates an advanced mobile agent with gesture handling
 * Requires a DOM element to attach gestures to
 */
declare function createGestureEnabledAgent(elementId: string): Promise<MobileAgent | null>;
/**
 * Creates a performance-aware agent that adapts behavior based on device capabilities
 */
declare function createPerformanceAwareAgent(): Promise<MobileAgent>;
/**
 * Demonstrates handling requests with mobile adaptations
 */
declare function handleMobileRequests(agent: MobileAgent): Promise<void>;
/**
 * Gets UI recommendations for the current device
 */
declare function demonstrateUIRecommendations(agent: MobileAgent): void;
/**
 * Demonstrates a complete mobile agent workflow
 */
declare function runCompleteWorkflow(): Promise<void>;
export { createBasicMobileAgent, createGestureEnabledAgent, createPerformanceAwareAgent, handleMobileRequests, demonstrateUIRecommendations, runCompleteWorkflow, };
//# sourceMappingURL=mobile-example.d.ts.map