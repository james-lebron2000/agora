import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WalletState } from '../types/navigation';

interface WalletStore extends WalletState {
  connect: (address: string, chainId: number) => void;
  disconnect: () => void;
  setLoading: (loading: boolean) => void;
  setBalance: (balance: string) => void;
  setUsdcBalance: (balance: string) => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      address: null,
      chainId: null,
      isConnected: false,
      isLoading: true,
      balance: '0',
      usdcBalance: '0',
      
      connect: (address, chainId) => set({
        address,
        chainId,
        isConnected: true,
        isLoading: false,
      }),
      
      disconnect: () => set({
        address: null,
        chainId: null,
        isConnected: false,
        isLoading: false,
        balance: '0',
        usdcBalance: '0',
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setBalance: (balance) => set({ balance }),
      
      setUsdcBalance: (usdcBalance) => set({ usdcBalance }),
    }),
    {
      name: 'wallet-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
