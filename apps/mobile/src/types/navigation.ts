export type MainTabParamList = {
  Home: undefined;
  Agents: undefined;
  Profile: undefined;
  Wallet: undefined;
};

export type RootStackParamList = {
  ConnectWallet: undefined;
  Main: undefined;
  AgentDetail: { agentId: string };
  TaskPost: { agentId?: string };
  TaskDetail: { taskId: string };
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
