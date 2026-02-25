import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Agents: undefined;
  Profile: undefined;
  Wallet: undefined;
  Bridge: undefined;
};

export type RootStackParamList = {
  ConnectWallet: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  AgentDetail: { agentId: string };
  TaskPost: { agentId?: string };
  TaskDetail: { taskId: string };
  Bridge: undefined;
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  tags: string[];
  rating: number;
  completedTasks: number;
  hourlyRate: number;
  isOnline: boolean;
  walletAddress: string;
  capabilities: string[];
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  budget: number;
  currency: string;
  creator: {
    id: string;
    name: string;
    walletAddress: string;
  };
  assignee?: {
    id: string;
    name: string;
    walletAddress: string;
  };
  agentId?: string;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  deliverables: string[];
  escrowId?: string;
};

export type WalletState = {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isLoading: boolean;
  balance: string;
  usdcBalance: string;
};

export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

// SDK Types (local definitions until @agora/sdk is linked)
export type SupportedChain = 'ethereum' | 'base' | 'optimism' | 'arbitrum';

export interface ChainBalance {
  chain: SupportedChain;
  nativeBalance: string;
  usdcBalance: string;
}

export interface BridgeQuote {
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  token: string;
  amount: string;
  estimatedFee: string;
  estimatedTime: number;
  path?: string[];
}

export interface BridgeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string;
}

export type HealthStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying';

export interface AgentHealth {
  overall: number;
  compute: number;
  storage: number;
  network: number;
  economic: number;
  lastCheck: string;
  status: HealthStatus;
}

export interface EconomicMetrics {
  totalUSDC: string;
  totalNativeUSD: string;
  netWorthUSD: string;
  dailyBurnRateUSD: string;
  runwayDays: number;
  efficiencyScore: number;
  chainDistribution: Record<SupportedChain, {
    usdc: string;
    native: string;
    percentage: number;
  }>;
}

export interface SurvivalThresholds {
  minUSDCCritical: number;
  minUSDCWarning: number;
  minRunwayCritical: number;
  minRunwayWarning: number;
  minHealthScore: number;
  maxCostPerOperation: number;
}

export interface SurvivalAction {
  type: 'bridge' | 'reduce_cost' | 'optimize_chain' | 'earn' | 'alert' | 'shutdown';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedImpact: string;
  recommendedChain?: string;
}

export interface HealthTrend {
  direction: 'improving' | 'stable' | 'declining';
  rateOfChange: number;
  predictedHealth: number;
  predictedRunway: number;
}

export interface SurvivalSnapshot {
  health: AgentHealth;
  economics: EconomicMetrics;
  survivalMode: boolean;
  pendingActions: SurvivalAction[];
  trend: HealthTrend;
}
