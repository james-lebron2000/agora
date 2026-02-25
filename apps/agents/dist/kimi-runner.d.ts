import type { SignedEnvelope } from '../../../packages/sdk/src/envelope.ts';
export type KimiTask<TParams> = {
    request: SignedEnvelope;
    requestId: string;
    params: TParams;
    input: string;
    price: number;
    charCount: number;
};
export type KimiAgentConfig<TParams> = {
    name: string;
    intents: string[];
    capabilities: unknown[];
    maxChars?: number;
    fixedPrice?: number;
    pricePerChar?: number;
    minPrice?: number;
    etaSeconds?: number | ((task: KimiTask<TParams>) => number);
    parseParams: (params: Record<string, unknown>) => TParams | null;
    extractInput: (params: TParams) => string | undefined;
    buildPlan: (task: KimiTask<TParams>) => string;
    buildPrompt: (task: KimiTask<TParams>) => {
        system: string;
        user: string;
    };
    formatOutput: (content: string, task: KimiTask<TParams>) => Record<string, unknown>;
    buildOfferExtras?: (task: KimiTask<TParams>) => Record<string, unknown>;
};
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function getString(value: unknown): string | undefined;
export declare function runKimiAgent<TParams>(config: KimiAgentConfig<TParams>): Promise<void>;
//# sourceMappingURL=kimi-runner.d.ts.map