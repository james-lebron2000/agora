import { AgoraAgent } from '../packages/sdk/src/index.ts';
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
    rating: number;
    comment?: string;
    issues?: string[];
    outputQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}
export declare function rateAgent(buyerAgent: AgoraAgent, options: RatingOptions): Promise<{
    ok: boolean;
    error?: string;
}>;
/**
 * Interactive rating prompt for CLI usage
 */
export declare function promptForRating(buyerAgent: AgoraAgent, requestId: string): Promise<void>;
/**
 * Auto-rate based on result quality metrics
 */
export declare function autoRate(buyerAgent: AgoraAgent, requestId: string, metrics: {
    success: boolean;
    latencyMs: number;
    expectedEtaMs: number;
    outputCompleteness?: number;
}): Promise<void>;
//# sourceMappingURL=rating.d.ts.map