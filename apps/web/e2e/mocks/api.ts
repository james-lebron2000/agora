/**
 * Mock utilities for blockchain and SDK interactions
 * These mocks simulate wallet connections, transactions, and API responses
 */

import { Page } from '@playwright/test';

export interface MockAgent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  intents: string[];
  capabilities: {
    id: string;
    name: string;
    description?: string;
    pricing?: {
      model: string;
      currency: string;
      fixed_price?: number;
      metered_rate?: number;
      metered_unit?: string;
    };
  }[];
  reputation?: {
    score: number;
    tier: string;
  };
}

export interface MockEvent {
  id: string;
  type: string;
  fromAgent: string;
  toAgent: string;
  intent: string;
  budgetUsd: number;
  timestamp: string;
}

export const MOCK_AGENTS: MockAgent[] = [
  {
    id: 'demo:PolyglotPro',
    name: 'Polyglot Pro',
    status: 'online',
    intents: ['translation', 'localization'],
    capabilities: [
      {
        id: 'cap_polyglot_translation_v1',
        name: 'Translation',
        description: 'Professional translation services',
        pricing: {
          model: 'metered',
          currency: 'USDC',
          metered_unit: 'character',
          metered_rate: 0.001,
        },
      },
    ],
    reputation: {
      score: 4.8,
      tier: 'gold',
    },
  },
  {
    id: 'demo:CleanCodeAI',
    name: 'CleanCodeAI',
    status: 'online',
    intents: ['code.review', 'refactoring'],
    capabilities: [
      {
        id: 'cap_code_review_v1',
        name: 'Code Review',
        description: 'Automated code review and analysis',
        pricing: {
          model: 'metered',
          currency: 'USDC',
          metered_unit: 'line',
          metered_rate: 0.005,
        },
      },
    ],
    reputation: {
      score: 4.9,
      tier: 'platinum',
    },
  },
  {
    id: 'demo:DataLens',
    name: 'DataLens',
    status: 'busy',
    intents: ['data.analysis', 'visualization'],
    capabilities: [
      {
        id: 'cap_data_analysis_v1',
        name: 'Data Analyst',
        description: 'Advanced data analysis and insights',
        pricing: {
          model: 'metered',
          currency: 'USDC',
          metered_unit: 'row',
          metered_rate: 0.0001,
        },
      },
    ],
    reputation: {
      score: 4.6,
      tier: 'silver',
    },
  },
];

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: 'evt_001',
    type: 'request',
    fromAgent: 'user:demo',
    toAgent: 'demo:PolyglotPro',
    intent: 'translation',
    budgetUsd: 25.0,
    timestamp: new Date().toISOString(),
  },
  {
    id: 'evt_002',
    type: 'response',
    fromAgent: 'demo:PolyglotPro',
    toAgent: 'user:demo',
    intent: 'translation',
    budgetUsd: 25.0,
    timestamp: new Date(Date.now() - 5000).toISOString(),
  },
];

export const MOCK_WALLET_STATE = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  chainId: 8453, // Base mainnet
  balance: {
    eth: '1.5',
    usdc: '500.00',
  },
  isConnected: true,
};

export const MOCK_NETWORK_METRICS = {
  totalAgents: 156,
  totalTransactions: 2847,
  totalVolume: 456320.5,
  activeRequests: 23,
  volume24h: 12450,
};

/**
 * Setup all API mocks for the page
 */
export async function setupApiMocks(page: Page): Promise<void> {
  // Mock agents endpoint
  await page.route('**/v1/agents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        agents: MOCK_AGENTS,
      }),
    });
  });

  // Mock messages/events endpoint
  await page.route('**/v1/messages**', async (route) => {
    const url = route.request().url();
    const since = new URL(url).searchParams.get('since');
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        events: since ? [] : MOCK_EVENTS,
        lastTs: new Date().toISOString(),
      }),
    });
  });

  // Mock recommendations endpoint
  await page.route('**/v1/recommend**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        agents: MOCK_AGENTS.slice(0, 2),
      }),
    });
  });

  // Mock seed endpoint
  await page.route('**/seed', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Setup wallet mock for RainbowKit
 */
export async function setupWalletMock(page: Page, state = MOCK_WALLET_STATE): Promise<void> {
  await page.addInitScript((walletState) => {
    // Mock window.ethereum
    (window as any).ethereum = {
      isMetaMask: true,
      request: async ({ method, params }: { method: string; params?: any[] }) => {
        switch (method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            return walletState.isConnected ? [walletState.address] : [];
          case 'eth_chainId':
            return `0x${walletState.chainId.toString(16)}`;
          case 'eth_getBalance':
            return '0x' + (parseFloat(walletState.balance.eth) * 1e18).toString(16);
          case 'eth_sendTransaction':
            return '0x' + Math.random().toString(16).slice(2, 42);
          case 'personal_sign':
            return '0x' + 'mock_signature_' + Math.random().toString(16).slice(2);
          default:
            return null;
        }
      },
      on: (event: string, callback: (...args: any[]) => void) => {
        // Store callbacks for manual triggering if needed
        if (!(window as any)._ethereumCallbacks) {
          (window as any)._ethereumCallbacks = {};
        }
        if (!(window as any)._ethereumCallbacks[event]) {
          (window as any)._ethereumCallbacks[event] = [];
        }
        (window as any)._ethereumCallbacks[event].push(callback);
      },
      removeListener: () => {
        // No-op for mock
      },
    };

    // Mock wallet connection state
    (window as any)._mockWallet = walletState;
  }, state);
}

/**
 * Trigger wallet events programmatically
 */
export async function triggerWalletEvent(page: Page, event: string, data: any): Promise<void> {
  await page.evaluate(({ eventName, eventData }) => {
    const callbacks = (window as any)._ethereumCallbacks?.[eventName];
    if (callbacks) {
      callbacks.forEach((cb: any) => cb(eventData));
    }
  }, { eventName: event, eventData: data });
}

/**
 * Clear all mocks
 */
export async function clearMocks(page: Page): Promise<void> {
  await page.unrouteAll();
}

/**
 * Wait for API call with specific URL pattern
 */
export async function waitForApiCall(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.waitForResponse((response) => {
    const url = response.url();
    if (typeof urlPattern === 'string') {
      return url.includes(urlPattern);
    }
    return urlPattern.test(url);
  });
}
