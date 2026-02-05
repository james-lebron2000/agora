import { AgoraAgent } from '../packages/sdk/src/index.ts';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Rate a completed task and provide feedback to help Agent improve.
 * 
 * Usage:
 * ```typescript
 * await rateAgent(agent, {
 *   requestId: 'req_123',
 *   rating: 4, // 1-5 stars
 *   comment: 'Good analysis but could be more detailed',
 *   issues: ['missing_edge_cases']
 * });
 * ```
 */

export interface RatingOptions {
  requestId: string;
  rating: number; // 1-5
  comment?: string;
  issues?: string[];
  outputQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}

export async function rateAgent(
  buyerAgent: AgoraAgent,
  options: RatingOptions
): Promise<{ ok: boolean; error?: string }> {
  // Validate rating
  if (options.rating < 1 || options.rating > 5) {
    return { ok: false, error: 'Rating must be between 1 and 5' };
  }

  try {
    // Send rating as a custom message type
    // Note: This requires the SDK to support custom message types or we use a workaround
    const result = await (buyerAgent as any).sendMessage?.('rating', {
      request_id: options.requestId,
      rating: options.rating,
      comment: options.comment,
      issues: options.issues,
      output_quality: options.outputQuality,
      timestamp: new Date().toISOString(),
    });

    if (result?.ok) {
      console.log(`⭐ Rating submitted: ${options.rating}/5`);
      if (options.rating <= 3) {
        console.log(`💡 Tip: Low ratings help Agents learn and improve!`);
      }
      return { ok: true };
    }

    return { ok: false, error: result?.error || 'Failed to submit rating' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Interactive rating prompt for CLI usage
 */
export async function promptForRating(
  buyerAgent: AgoraAgent,
  requestId: string
): Promise<void> {
  console.log('\n📊 How would you rate this Agent\'s performance?');
  console.log('1 ⭐ - Very poor, major issues');
  console.log('2 ⭐ - Below expectations');
  console.log('3 ⭐ - Acceptable, room for improvement');
  console.log('4 ⭐ - Good, minor issues');
  console.log('5 ⭐ - Excellent, exceeded expectations');
  
  // In a real CLI, you'd use readline here
  // For now, auto-rate with 4 stars as example
  const rating = 4;
  
  await rateAgent(buyerAgent, {
    requestId,
    rating,
    comment: 'Good work, timely delivery',
  });
}

/**
 * Auto-rate based on result quality metrics
 */
export async function autoRate(
  buyerAgent: AgoraAgent,
  requestId: string,
  metrics: {
    success: boolean;
    latencyMs: number;
    expectedEtaMs: number;
    outputCompleteness?: number; // 0-1
  }
): Promise<void> {
  let rating = 3; // Default acceptable

  if (!metrics.success) {
    rating = 2;
  } else {
    // Boost for on-time delivery
    if (metrics.latencyMs <= metrics.expectedEtaMs) {
      rating += 1;
    }
    // Boost for complete output
    if (metrics.outputCompleteness && metrics.outputCompleteness > 0.8) {
      rating += 1;
    }
  }

  rating = Math.min(5, Math.max(1, rating));

  await rateAgent(buyerAgent, {
    requestId,
    rating,
    comment: `Auto-rated: ${metrics.success ? 'Success' : 'Failed'}, ${Math.round(metrics.latencyMs / 1000)}s`,
    outputQuality: rating >= 4 ? 'good' : rating >= 3 ? 'fair' : 'poor',
  });
}
