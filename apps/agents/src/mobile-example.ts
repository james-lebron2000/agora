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

import {
  MobileAgent,
  createMobileAgent,
  type MobileAgentOptions,
  type MobileUIAction,
  type MobileGestureCommand,
  isMobileEnvironment,
  getMobileConfig,
} from './mobile-adapter.js';

// ============================================================================
// Example 1: Basic Mobile Agent Setup
// ============================================================================

/**
 * Creates a basic mobile agent with default optimizations
 */
async function createBasicMobileAgent(): Promise<MobileAgent> {
  console.log('🚀 Creating basic mobile agent...');

  // In production, load these from environment or secure storage
  const mockPrivateKey = new Uint8Array(32).fill(1); // Replace with actual key

  const agent = createMobileAgent({
    did: 'did:agora:mobile-agent-001',
    privateKey: mockPrivateKey,
    relayUrl: 'https://relay.agora.net',
    name: 'Mobile Helper Agent',
    description: 'An Agora agent optimized for mobile interactions',
  });

  console.log('✅ Mobile agent created');
  console.log('📱 Device info:', agent.getState().deviceInfo);
  
  return agent;
}

// ============================================================================
// Example 2: Advanced Mobile Agent with Gestures
// ============================================================================

/**
 * Creates an advanced mobile agent with gesture handling
 * Requires a DOM element to attach gestures to
 */
async function createGestureEnabledAgent(elementId: string): Promise<MobileAgent | null> {
  console.log('👋 Creating gesture-enabled mobile agent...');

  // Get the DOM element (in browser environment)
  const element = typeof document !== 'undefined' 
    ? document.getElementById(elementId)
    : null;

  if (!element) {
    console.warn(`Element #${elementId} not found, running without gestures`);
  }

  const mockPrivateKey = new Uint8Array(32).fill(2);

  const agent = createMobileAgent({
    did: 'did:agora:gesture-agent-002',
    privateKey: mockPrivateKey,
    relayUrl: 'https://relay.agora.net',
    name: 'Gesture Agent',
    enableTouchGestures: true,
    gestureElement: element ?? undefined,
  });

  // Set up gesture handlers
  setupGestureHandlers(agent);

  console.log('✅ Gesture-enabled agent created');
  return agent;
}

/**
 * Sets up gesture event handlers
 */
function setupGestureHandlers(agent: MobileAgent): void {
  // Handle swipe left - typically "dismiss" or "next"
  agent.onGesture('swipeLeft', (cmd: MobileGestureCommand) => {
    console.log('👈 Swipe left detected:', cmd);
    // Handle dismiss action
    handleDismiss();
  });

  // Handle swipe right - typically "go back" or "accept"
  agent.onGesture('swipeRight', (cmd: MobileGestureCommand) => {
    console.log('👉 Swipe right detected:', cmd);
    // Handle accept action
    handleAccept();
  });

  // Handle tap
  agent.onGesture('tap', (cmd: MobileGestureCommand) => {
    console.log('👆 Tap detected at:', cmd.context?.position);
    // Handle selection
    handleSelect(cmd.context?.position as { x: number; y: number });
  });

  // Handle long press - typically "context menu"
  agent.onGesture('longPress', (cmd: MobileGestureCommand) => {
    console.log('⏱️ Long press detected');
    // Show context menu
    showContextMenu(cmd.context?.position as { x: number; y: number });
  });
}

// ============================================================================
// Example 3: Performance-Aware Agent
// ============================================================================

/**
 * Creates a performance-aware agent that adapts behavior based on device capabilities
 */
async function createPerformanceAwareAgent(): Promise<MobileAgent> {
  console.log('⚡ Creating performance-aware agent...');

  const mockPrivateKey = new Uint8Array(32).fill(3);

  const agent = createMobileAgent({
    did: 'did:agora:perf-agent-003',
    privateKey: mockPrivateKey,
    relayUrl: 'https://relay.agora.net',
    name: 'Performance Agent',
    minPerformanceLevel: 'medium', // Only accept tasks on medium/high performance devices
    mobileMessageLimit: 800, // Shorter messages on mobile
  });

  const state = agent.getState();
  console.log('📊 Performance metrics:', state.performanceMetrics);
  console.log('⚙️ Optimization config:', state.optimizationConfig);

  // Check if device can handle complex tasks
  if (!agent.canHandleTask('high')) {
    console.warn('⚠️ Device may struggle with high-complexity tasks');
  }

  return agent;
}

// ============================================================================
// Example 4: Mobile-Optimized Request Handler
// ============================================================================

/**
 * Demonstrates handling requests with mobile adaptations
 */
async function handleMobileRequests(agent: MobileAgent): Promise<void> {
  console.log('📨 Setting up mobile request handlers...');

  // Handle incoming requests with mobile optimization
  await agent.onRequest(async (envelope) => {
    const payload = envelope.payload as { intent: string; params: unknown };
    console.log('📥 Received request:', payload.intent);

    // Adapt response for mobile
    const response = generateResponse(payload);
    const adaptedResponse = agent.adaptForMobile(response);

    console.log('📤 Sending adapted response:', adaptedResponse.isTruncated ? '(truncated)' : '(full)');

    // Send result back
    await agent.sendResult(
      (payload as any).request_id || 'unknown',
      { output: adaptedResponse.content as Record<string, unknown> }
    );
  });
}

/**
 * Generates a mock response
 */
function generateResponse(request: { intent: string; params: unknown }): Record<string, unknown> {
  return {
    intent: request.intent,
    data: 'This is a sample response that could be very long on mobile devices...',
    timestamp: new Date().toISOString(),
    metadata: {
      processed: true,
      deviceOptimized: true,
    },
  };
}

// ============================================================================
// Example 5: UI Recommendations
// ============================================================================

/**
 * Gets UI recommendations for the current device
 */
function demonstrateUIRecommendations(agent: MobileAgent): void {
  const recommendations = agent.getUIRecommendations();
  
  console.log('🎨 UI Recommendations for current device:');
  console.log('  - Use bottom sheet:', recommendations.useBottomSheet);
  console.log('  - Enable swipe actions:', recommendations.useSwipeActions);
  console.log('  - Enable pull-to-refresh:', recommendations.usePullToRefresh);
  console.log('  - Max items per page:', recommendations.maxItemsPerPage);
  console.log('  - Enable animations:', recommendations.enableAnimations);
  console.log('  - Use compact cards:', recommendations.useCompactCards);
}

// ============================================================================
// Example 6: Complete Mobile Agent Workflow
// ============================================================================

/**
 * Demonstrates a complete mobile agent workflow
 */
async function runCompleteWorkflow(): Promise<void> {
  console.log('\n========================================');
  console.log('🚀 Agora Mobile Adapter Demo');
  console.log('========================================\n');

  // Step 1: Check environment
  console.log('Step 1: Environment Check');
  console.log('  Mobile environment:', isMobileEnvironment());
  console.log('  Optimized config:', getMobileConfig());
  console.log();

  // Step 2: Create agent
  console.log('Step 2: Create Mobile Agent');
  const agent = await createBasicMobileAgent();
  console.log();

  // Step 3: Check device state
  console.log('Step 3: Device State');
  const state = agent.getState();
  console.log('  Is mobile:', state.isMobileEnvironment);
  console.log('  Device type:', state.deviceInfo.type);
  console.log('  OS:', state.deviceInfo.os, state.deviceInfo.osVersion);
  console.log('  Screen:', `${state.deviceInfo.screenWidth}x${state.deviceInfo.screenHeight}`);
  console.log('  Performance level:', state.performanceMetrics.performanceLevel);
  console.log('  Network type:', state.performanceMetrics.networkType);
  console.log();

  // Step 4: UI recommendations
  console.log('Step 4: UI Recommendations');
  demonstrateUIRecommendations(agent);
  console.log();

  // Step 5: Simulate mobile request
  console.log('Step 5: Mobile Request Simulation');
  const mockRequest = {
    intent: 'chat.message',
    params: {
      message: 'Hello from mobile! '.repeat(50), // Long message to test truncation
      userId: 'user123',
    },
  };

  const adaptedPayload = agent.adaptForMobile(mockRequest.params);
  console.log('  Original length:', JSON.stringify(mockRequest.params).length);
  console.log('  Adapted length:', JSON.stringify(adaptedPayload.content).length);
  console.log('  Is truncated:', adaptedPayload.isTruncated);
  console.log('  Formatting hints:', adaptedPayload.formattingHints);
  console.log();

  // Step 6: Cleanup
  console.log('Step 6: Cleanup');
  agent.destroy();
  console.log('✅ Agent destroyed');

  console.log('\n========================================');
  console.log('✨ Demo Complete!');
  console.log('========================================');
}

// ============================================================================
// Helper Functions
// ============================================================================

function handleDismiss(): void {
  console.log('  [Action] Dismiss/Next');
}

function handleAccept(): void {
  console.log('  [Action] Accept/Back');
}

function handleSelect(position?: { x: number; y: number }): void {
  console.log('  [Action] Select at', position);
}

function showContextMenu(position?: { x: number; y: number }): void {
  console.log('  [Action] Show context menu at', position);
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main function to run examples
 */
async function main(): Promise<void> {
  try {
    await runCompleteWorkflow();
  } catch (error) {
    console.error('❌ Error running demo:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly (in ESM environment)
if (typeof process !== 'undefined' && process.argv.length > 1) {
  main().catch(console.error);
}

// Export examples for testing
export {
  createBasicMobileAgent,
  createGestureEnabledAgent,
  createPerformanceAwareAgent,
  handleMobileRequests,
  demonstrateUIRecommendations,
  runCompleteWorkflow,
};
