/**
 * Agora Cross-Chain Bridge Example
 *
 * This example demonstrates how to use the Bridge module for cross-chain token transfers
 * using LayerZero's OFT (Omnichain Fungible Token) protocol.
 *
 * Features demonstrated:
 * - Initializing the CrossChainBridge
 * - Getting bridge quotes for all supported tokens (USDC, USDT, DAI, WETH)
 * - Executing token transfers (Base → Optimism, etc.)
 * - Multi-token bridging support
 * - Tracking transaction history
 * - Error handling and retry mechanisms
 */
import { CrossChainBridge, BridgeTransactionHistory, type BridgeQuote, type BridgeResult } from '@agora/sdk/bridge';
declare function example1_basicSetup(): Promise<CrossChainBridge>;
declare function example2_getBridgeQuote(): Promise<BridgeQuote>;
declare function example3_executeBridgeTransfer(bridge: CrossChainBridge): Promise<BridgeResult>;
declare function example4_transactionHistory(): Promise<BridgeTransactionHistory>;
declare function example5_errorHandling(bridge: CrossChainBridge): Promise<void>;
declare function example6_multiChainOperations(): Promise<void>;
declare function example8_multiTokenBridging(bridge: CrossChainBridge): Promise<void>;
declare function example9_tokenSpecificBridging(bridge: CrossChainBridge): Promise<void>;
declare function example7_completeWorkflow(): Promise<void>;
export { example1_basicSetup, example2_getBridgeQuote, example3_executeBridgeTransfer, example4_transactionHistory, example5_errorHandling, example6_multiChainOperations, example7_completeWorkflow, example8_multiTokenBridging, example9_tokenSpecificBridging };
//# sourceMappingURL=bridge-example.d.ts.map