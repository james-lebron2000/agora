/**
 * Portfolio type definitions for Agora Agent Storefront
 * Each expert agent can showcase their experience and capabilities
 */
export interface AgentPortfolio {
    /** Unique agent identifier */
    agentId: string;
    /** Human-readable agent name */
    agentName: string;
    /** Avatar/emoji representation */
    avatar: string;
    /** One-line description of the agent's specialty */
    tagline: string;
    /** Detailed description of capabilities */
    description: string;
    /** Total number of completed jobs */
    completedJobs: number;
    /** Average rating (1-5 scale) */
    avgRating: number;
    /** Total earnings in USD */
    totalEarnedUsd: number;
    /** Response time in milliseconds (average) */
    avgResponseTimeMs: number;
    /** Success rate percentage */
    successRate: number;
    /** Tags representing expertise areas */
    specialties: string[];
    /** Categories this agent belongs to */
    categories: string[];
    /** Supported intents */
    intents: string[];
    /** Base pricing model */
    pricing: {
        model: 'fixed' | 'metered' | 'hybrid';
        currency: string;
        minPrice: number;
        maxPrice?: number;
        meteredRate?: number;
        meteredUnit?: string;
    };
    /** Whether preview mode is available */
    previewAvailable: boolean;
    /** Cost for preview/sample analysis */
    previewCost: number;
    /** What preview includes */
    previewDescription: string;
    /** Estimated preview response time in seconds */
    previewEtaSeconds: number;
    /** Full service cost range */
    fullServicePriceRange: {
        min: number;
        max: number;
    };
    /** Estimated full service time in seconds */
    fullServiceEtaSeconds: number;
    /** Representative case summaries */
    topCases: CaseStudy[];
    /** Customer testimonials */
    testimonials: Testimonial[];
    /** Performance over time */
    performanceHistory: PerformanceMetrics[];
    /** Skill proficiency scores (0-100) */
    skills: Record<string, number>;
    /** Tools and frameworks used */
    tools: string[];
    /** Languages supported */
    languages: string[];
    /** Current status */
    status: 'available' | 'busy' | 'offline';
    /** Queue depth if busy */
    queueDepth?: number;
    /** Estimated availability time if busy */
    availableAt?: string;
}
export interface CaseStudy {
    id: string;
    title: string;
    category: string;
    summary: string;
    result: string;
    clientRating: number;
    date: string;
    tags: string[];
}
export interface Testimonial {
    id: string;
    clientName: string;
    rating: number;
    comment: string;
    date: string;
    verified: boolean;
}
export interface PerformanceMetrics {
    period: string;
    jobsCompleted: number;
    avgRating: number;
    earningsUsd: number;
    responseTimeMs: number;
}
export interface PreviewRequest {
    agentId: string;
    params: Record<string, unknown>;
    previewDepth: 'quick' | 'standard' | 'detailed';
}
export interface PreviewResponse {
    agentId: string;
    previewId: string;
    status: 'completed' | 'failed' | 'partial';
    summary: string;
    highlights: string[];
    keyFindings: Record<string, unknown>;
    fullServiceRecommendation: string;
    estimatedFullPrice: number;
    estimatedFullEta: number;
    sampleOutput?: Record<string, unknown>;
    confidence: number;
    generatedAt: string;
}
export interface ConsultantTask {
    id: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    budget?: number;
    deadline?: string;
}
export interface DecomposedTask {
    originalTask: ConsultantTask;
    subtasks: SubTask[];
}
export interface SubTask {
    id: string;
    description: string;
    intent: string;
    requiredCapabilities: string[];
    estimatedPrice: number;
    estimatedTime: number;
    dependencies: string[];
}
export interface AgentCandidate {
    agentId: string;
    agentName: string;
    matchScore: number;
    portfolio: AgentPortfolio;
    previewResult?: PreviewResponse;
    estimatedPrice: number;
    estimatedTime: number;
    availability: 'available' | 'busy' | 'offline';
}
export interface ConsultantRecommendation {
    taskId: string;
    subtasks: {
        subtask: SubTask;
        recommendedAgent: AgentCandidate;
        alternativeAgents: AgentCandidate[];
    }[];
    totalEstimatedPrice: number;
    totalEstimatedTime: number;
    strategy: string;
    risks: string[];
}
export interface ConsultantExecution {
    recommendation: ConsultantRecommendation;
    status: 'planning' | 'previewing' | 'purchasing' | 'executing' | 'completed' | 'failed';
    previews: Map<string, PreviewResponse>;
    purchases: Map<string, PurchaseOrder>;
    results: Map<string, AgentResult>;
    progress: number;
}
export interface PurchaseOrder {
    orderId: string;
    subtaskId: string;
    agentId: string;
    price: number;
    status: 'pending' | 'escrow_held' | 'in_progress' | 'completed' | 'failed';
    escrowId?: string;
}
export interface AgentResult {
    orderId: string;
    agentId: string;
    status: 'success' | 'failed' | 'partial';
    output: Record<string, unknown>;
    metrics: {
        latencyMs: number;
        costActual: number;
    };
}
export interface AgentSearchQuery {
    intent?: string;
    categories?: string[];
    specialties?: string[];
    minRating?: number;
    maxPrice?: number;
    previewAvailable?: boolean;
    availableOnly?: boolean;
}
export interface AgentSearchResult {
    agents: AgentPortfolio[];
    totalCount: number;
    facets: {
        categories: Record<string, number>;
        specialties: Record<string, number>;
        priceRanges: Record<string, number>;
    };
}
export declare function calculateAgentScore(portfolio: AgentPortfolio): number;
export declare function formatPriceRange(min: number, max?: number): string;
export declare function getStarRating(rating: number): string;
export declare function formatETA(seconds: number): string;
//# sourceMappingURL=portfolio.d.ts.map