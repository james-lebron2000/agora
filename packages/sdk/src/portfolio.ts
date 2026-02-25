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
  
  // ===== Experience Metrics =====
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
  
  // ===== Specialties & Tags =====
  /** Tags representing expertise areas */
  specialties: string[];
  /** Categories this agent belongs to */
  categories: string[];
  /** Supported intents */
  intents: string[];
  
  // ===== Pricing =====
  /** Base pricing model */
  pricing: {
    model: 'fixed' | 'metered' | 'hybrid';
    currency: string;
    minPrice: number;
    maxPrice?: number;
    meteredRate?: number;
    meteredUnit?: string;
  };
  
  // ===== Preview/Sample Support =====
  /** Whether preview mode is available */
  previewAvailable: boolean;
  /** Cost for preview/sample analysis */
  previewCost: number;
  /** What preview includes */
  previewDescription: string;
  /** Estimated preview response time in seconds */
  previewEtaSeconds: number;
  
  // ===== Full Service =====
  /** Full service cost range */
  fullServicePriceRange: {
    min: number;
    max: number;
  };
  /** Estimated full service time in seconds */
  fullServiceEtaSeconds: number;
  
  // ===== Portfolio Showcase =====
  /** Representative case summaries */
  topCases: CaseStudy[];
  /** Customer testimonials */
  testimonials: Testimonial[];
  /** Performance over time */
  performanceHistory: PerformanceMetrics[];
  
  // ===== Skills & Capabilities =====
  /** Skill proficiency scores (0-100) */
  skills: Record<string, number>;
  /** Tools and frameworks used */
  tools: string[];
  /** Languages supported */
  languages: string[];
  
  // ===== Availability =====
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
  period: string; // ISO week or month
  jobsCompleted: number;
  avgRating: number;
  earningsUsd: number;
  responseTimeMs: number;
}

// ===== Preview Request/Response Types =====

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
  confidence: number; // 0-1
  generatedAt: string;
}

// ===== Consultant Agent Types =====

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
  matchScore: number; // 0-1
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
  progress: number; // 0-100
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

// ===== Search & Filter Types =====

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

// ===== Utility Functions =====

export function calculateAgentScore(portfolio: AgentPortfolio): number {
  // Weighted scoring algorithm for ranking agents
  const weights = {
    rating: 0.25,
    completedJobs: 0.20,
    successRate: 0.20,
    responseTime: 0.15,
    earnings: 0.10,
    previewAvailable: 0.10,
  };
  
  const ratingScore = (portfolio.avgRating / 5) * 100;
  const jobsScore = Math.min(portfolio.completedJobs / 1000, 1) * 100;
  const successScore = portfolio.successRate;
  const responseScore = Math.max(0, 100 - (portfolio.avgResponseTimeMs / 1000));
  const earningsScore = Math.min(portfolio.totalEarnedUsd / 1000, 1) * 100;
  const previewScore = portfolio.previewAvailable ? 100 : 0;
  
  return (
    ratingScore * weights.rating +
    jobsScore * weights.completedJobs +
    successScore * weights.successRate +
    responseScore * weights.responseTime +
    earningsScore * weights.earnings +
    previewScore * weights.previewAvailable
  );
}

export function formatPriceRange(min: number, max?: number): string {
  if (max && max !== min) {
    return `$${min.toFixed(2)} - $${max.toFixed(2)}`;
  }
  return `$${min.toFixed(2)}`;
}

export function getStarRating(rating: number): string {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
}

export function formatETA(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}min`;
  return `${Math.ceil(seconds / 3600)}h`;
}
