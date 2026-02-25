import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { MultiChainBalance } from '../components/MultiChainBalance';

// Mock the SDK
jest.mock('@agora/sdk/bridge', () => ({
  getAllBalances: jest.fn(() => Promise.resolve({
    ethereum: { usdcBalance: '100', nativeBalance: '1.5', chainId: 1 },
    base: { usdcBalance: '200', nativeBalance: '2.0', chainId: 8453 },
    optimism: { usdcBalance: '150', nativeBalance: '1.0', chainId: 10 },
    arbitrum: { usdcBalance: '300', nativeBalance: '3.0', chainId: 42161 },
  })),
  SUPPORTED_CHAINS: {
    ethereum: { id: 1, name: 'Ethereum' },
    base: { id: 8453, name: 'Base' },
    optimism: { id: 10, name: 'Optimism' },
    arbitrum: { id: 42161, name: 'Arbitrum' },
  },
}));

// Mock viem
jest.mock('viem', () => ({
  formatUnits: jest.fn((value: string) => value),
}));

// Mock hooks
jest.mock('../hooks/useSDK', () => ({
  useBridgeSDK: () => ({
    balances: {
      ethereum: { usdcBalance: '100', nativeBalance: '1.5' },
      base: { usdcBalance: '200', nativeBalance: '2.0' },
      optimism: { usdcBalance: '150', nativeBalance: '1.0' },
      arbitrum: { usdcBalance: '300', nativeBalance: '3.0' },
    },
    totalUsdc: '750',
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

describe('MultiChainBalance Component', () => {
  it('should render without crashing', () => {
    const { getByTestId } = render(
      <MultiChainBalance 
        address="0x1234567890123456789012345678901234567890"
        testID="multi-chain-balance"
      />
    );
    
    expect(getByTestId('multi-chain-balance')).toBeTruthy();
  });

  it('should display total balance', () => {
    const { getByText } = render(
      <MultiChainBalance 
        address="0x1234567890123456789012345678901234567890"
      />
    );
    
    // Should show total USDC
    expect(getByText(/750/)).toBeTruthy();
  });

  it('should show all supported chains', () => {
    const { getByText } = render(
      <MultiChainBalance 
        address="0x1234567890123456789012345678901234567890"
      />
    );
    
    // Should show chain names
    expect(getByText(/Ethereum|Base|Optimism|Arbitrum/)).toBeTruthy();
  });
});

describe('Component Basics', () => {
  it('should render a simple view', () => {
    const { getByTestId } = render(
      <View testID="simple-view">
        <Text>Hello Test</Text>
      </View>
    );
    
    expect(getByTestId('simple-view')).toBeTruthy();
    expect(getByText('Hello Test')).toBeTruthy();
  });
});
