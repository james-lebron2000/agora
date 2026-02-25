import { AgoraAgent } from '../../../packages/sdk/src/index.ts';
import type { SignedEnvelope } from '../../../packages/sdk/src/envelope.ts';
export declare const relayUrl: string;
export type OfferBuilder = (request: SignedEnvelope) => Promise<{
    plan?: string;
    price?: {
        amount: number;
        currency: string;
    };
    eta_seconds?: number;
}>;
export type ResultBuilder = (request: SignedEnvelope, accept: SignedEnvelope) => Promise<{
    status: 'success' | 'partial' | 'failed' | 'cancelled';
    output?: Record<string, unknown>;
    artifacts?: Array<{
        type: string;
        url: string;
        name?: string;
    }>;
    metrics?: {
        latency_ms?: number;
        cost_actual?: number;
    };
}>;
export declare function createDemoAgent(options: {
    name: string;
    url?: string;
    capabilities: unknown[];
}): Promise<AgoraAgent>;
export declare function matchesIntent(request: SignedEnvelope, intents: string[]): boolean;
export declare function runAutoResponder(options: {
    name: string;
    intents: string[];
    capabilities: unknown[];
    buildOffer: OfferBuilder;
    buildResult: ResultBuilder;
}): Promise<void>;
//# sourceMappingURL=common.d.ts.map