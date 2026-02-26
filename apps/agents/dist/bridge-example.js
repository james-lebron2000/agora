/**
 * Agora Cross-Chain Bridge Example
 *
 * This example demonstrates how to use the Bridge module for cross-chain USDC transfers
 * using LayerZero's OFT (Omnichain Fungible Token) protocol.
 *
 * Features demonstrated:
 * - Initializing the CrossChainBridge
 * - Getting bridge quotes
 * - Executing USDC transfers (Base → Optimism)
 * - Tracking transaction history
 * - Error handling and retry mechanisms
 */
import { CrossChainBridge, BridgeTransactionHistory, getBridgeQuote } from '@agora/sdk/bridge';
// =============================================================================
// Configuration
// =============================================================================
// Replace with your actual private key (with 0x prefix)
// IMPORTANT: Never commit private keys to version control!
const PRIVATE_KEY = (process.env.PRIVATE_KEY || '0x');
// Default source chain
const DEFAULT_CHAIN = 'base';
// =============================================================================
// Example 1: Basic Bridge Setup and Balance Check
// =============================================================================
async function example1_basicSetup() {
    console.log('\n=== Example 1: Basic Bridge Setup ===\n');
    // Initialize the bridge with your private key
    const bridge = new CrossChainBridge(PRIVATE_KEY, DEFAULT_CHAIN);
    // Get balances across all supported chains
    console.log('Fetching balances...');
    const balances = await bridge.getBalances();
    console.log('\nBalances across chains:');
    for (const balance of balances) {
        console.log(`  ${balance.chain}:`);
        console.log(`    Native: ${balance.nativeBalance} ETH`);
        console.log(`    USDC:   ${balance.usdcBalance}`);
    }
    return bridge;
}
// =============================================================================
// Example 2: Get Bridge Quote (Base → Optimism)
// =============================================================================
async function example2_getBridgeQuote() {
    console.log('\n=== Example 2: Get Bridge Quote ===\n');
    const sourceChain = 'base';
    const destinationChain = 'optimism';
    const amount = '10'; // 10 USDC
    // Get quote using the standalone function
    console.log(`Getting quote for ${amount} USDC from ${sourceChain} to ${destinationChain}...`);
    const senderAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Example address
    try {
        const quote = await getBridgeQuote({
            sourceChain,
            destinationChain,
            token: 'USDC',
            amount
        }, senderAddress);
        console.log('\nBridge Quote:');
        console.log(`  Source Chain:      ${quote.sourceChain}`);
        console.log(`  Destination Chain: ${quote.destinationChain}`);
        console.log(`  Amount:            ${quote.amount} USDC`);
        console.log(`  Estimated Fee:     ${quote.estimatedFee} ETH`);
        console.log(`  Estimated Time:    ${quote.estimatedTime} seconds`);
        console.log(`  Path:              ${quote.path?.join(' → ')}`);
        if (quote.lzFee) {
            console.log(`  LayerZero Native Fee: ${quote.lzFee.nativeFee.toString()} wei`);
            console.log(`  LayerZero Token Fee:  ${quote.lzFee.lzTokenFee.toString()} wei`);
        }
        return quote;
    }
    catch (error) {
        console.error('Failed to get bridge quote:', error);
        throw error;
    }
}
// =============================================================================
// Example 3: Execute USDC Bridge Transfer (Base → Optimism)
// =============================================================================
async function example3_executeBridgeTransfer(bridge) {
    console.log('\n=== Example 3: Execute Bridge Transfer ===\n');
    const destinationChain = 'optimism';
    const amount = '1'; // 1 USDC (start small for testing!)
    console.log(`Initiating bridge of ${amount} USDC from Base to Optimism...`);
    console.log('This may take a few moments...\n');
    try {
        // Execute the bridge transfer
        const result = await bridge.bridgeUSDC(destinationChain, amount);
        if (result.success) {
            console.log('✅ Bridge transfer successful!');
            console.log(`  Transaction Hash: ${result.txHash}`);
            console.log(`  Amount:           ${result.amount} USDC`);
            console.log(`  From:             ${result.sourceChain}`);
            console.log(`  To:               ${result.destinationChain}`);
            if (result.fees) {
                console.log(`  Native Fee:       ${result.fees.nativeFee} ETH`);
                console.log(`  LZ Token Fee:     ${result.fees.lzTokenFee} ETH`);
            }
            // Save transaction to history
            const history = new BridgeTransactionHistory((await import('viem/accounts')).privateKeyToAccount(PRIVATE_KEY).address);
            history.addTransaction({
                txHash: result.txHash,
                sourceChain: result.sourceChain,
                destinationChain: result.destinationChain,
                amount: result.amount,
                token: 'USDC',
                status: 'pending',
                timestamp: Date.now(),
                senderAddress: (await import('viem/accounts')).privateKeyToAccount(PRIVATE_KEY).address,
                recipientAddress: (await import('viem/accounts')).privateKeyToAccount(PRIVATE_KEY).address,
                fees: result.fees
            });
            console.log('\nTransaction saved to history');
            return result;
        }
        else {
            console.error('❌ Bridge transfer failed');
            console.error(`  Error: ${result.error}`);
            throw new Error(result.error || 'Bridge failed');
        }
    }
    catch (error) {
        console.error('Bridge execution error:', error);
        throw error;
    }
}
// =============================================================================
// Example 4: Transaction History Management
// =============================================================================
async function example4_transactionHistory() {
    console.log('\n=== Example 4: Transaction History ===\n');
    const account = (await import('viem/accounts')).privateKeyToAccount(PRIVATE_KEY);
    const history = new BridgeTransactionHistory(account.address);
    // Get all transactions
    const allTransactions = history.getTransactions();
    console.log(`Total transactions: ${allTransactions.length}`);
    // Get pending transactions
    const pending = history.getPendingTransactions();
    console.log(`Pending transactions: ${pending.length}`);
    // Filter by chain
    const baseTransactions = history.getTransactions({ chain: 'base' });
    console.log(`Transactions involving Base: ${baseTransactions.length}`);
    // Filter by status
    const completedTransactions = history.getTransactions({ status: 'completed' });
    console.log(`Completed transactions: ${completedTransactions.length}`);
    // Display recent transactions
    if (allTransactions.length > 0) {
        console.log('\nRecent transactions:');
        for (const tx of allTransactions.slice(0, 5)) {
            console.log(`  ${tx.txHash.slice(0, 20)}... - ${tx.sourceChain} → ${tx.destinationChain}: ${tx.amount} ${tx.token} (${tx.status})`);
        }
    }
    return history;
}
// =============================================================================
// Example 5: Error Handling and Retry Logic
// =============================================================================
async function example5_errorHandling(bridge) {
    console.log('\n=== Example 5: Error Handling ===\n');
    // Try bridging with invalid parameters
    console.log('Testing error handling...\n');
    // Test 1: Same source and destination
    console.log('Test 1: Same source and destination');
    const result1 = await bridge.bridgeUSDC('base', '10', 'base');
    console.log(`  Result: ${result1.success ? 'Success' : 'Failed'}`);
    if (!result1.success)
        console.log(`  Error: ${result1.error}`);
    // Test 2: Invalid amount (more than balance)
    console.log('\nTest 2: Insufficient balance');
    const result2 = await bridge.bridgeUSDC('optimism', '999999999');
    console.log(`  Result: ${result2.success ? 'Success' : 'Failed'}`);
    if (!result2.success)
        console.log(`  Error: ${result2.error}`);
    // Test 3: Invalid chain
    console.log('\nTest 3: L1 to L2 (not directly supported)');
    const bridgeEth = new CrossChainBridge(PRIVATE_KEY, 'ethereum');
    const result3 = await bridgeEth.bridgeUSDC('base', '10');
    console.log(`  Result: ${result3.success ? 'Success' : 'Failed'}`);
    if (!result3.success)
        console.log(`  Error: ${result3.error}`);
}
// =============================================================================
// Example 6: Multi-Chain Bridge Operations
// =============================================================================
async function example6_multiChainOperations() {
    console.log('\n=== Example 6: Multi-Chain Operations ===\n');
    const chains = ['base', 'optimism', 'arbitrum'];
    const account = (await import('viem/accounts')).privateKeyToAccount(PRIVATE_KEY);
    // Get quotes for all possible L2 routes
    console.log('Bridge quotes for all L2 routes:\n');
    for (const source of chains) {
        for (const dest of chains) {
            if (source === dest)
                continue;
            try {
                const quote = await getBridgeQuote({
                    sourceChain: source,
                    destinationChain: dest,
                    token: 'USDC',
                    amount: '100'
                }, account.address);
                console.log(`${source} → ${dest}: ${quote.estimatedFee} ETH fee, ~${quote.estimatedTime}s`);
            }
            catch (error) {
                console.log(`${source} → ${dest}: Failed to get quote`);
            }
        }
    }
    // Find cheapest chain for operations
    console.log('\nFinding cheapest chains:');
    const bridge = new CrossChainBridge(PRIVATE_KEY);
    for (const operation of ['send', 'swap', 'contract']) {
        const cheapest = await bridge.findCheapestChain(operation);
        console.log(`  ${operation}: ${cheapest.chain} (~${cheapest.estimatedCost} ETH)`);
    }
}
// =============================================================================
// Example 7: Complete Bridge Workflow
// =============================================================================
async function example7_completeWorkflow() {
    console.log('\n=== Example 7: Complete Bridge Workflow ===\n');
    const bridge = new CrossChainBridge(PRIVATE_KEY, 'base');
    const account = (await import('viem/accounts')).privateKeyToAccount(PRIVATE_KEY);
    const history = new BridgeTransactionHistory(account.address);
    // Step 1: Check balances
    console.log('Step 1: Checking balances...');
    const balances = await bridge.getBalances();
    const baseBalance = balances.find(b => b.chain === 'base');
    if (!baseBalance || parseFloat(baseBalance.usdcBalance) < 1) {
        console.log('❌ Insufficient USDC balance on Base. Please deposit USDC first.');
        return;
    }
    console.log(`✅ Base USDC Balance: ${baseBalance.usdcBalance}`);
    // Step 2: Get quote
    console.log('\nStep 2: Getting bridge quote...');
    const quote = await bridge.getQuote('optimism', 'USDC', '1');
    console.log(`✅ Quote: ${quote.estimatedFee} ETH fee, ~${quote.estimatedTime}s`);
    // Step 3: Confirm and execute
    console.log('\nStep 3: Executing bridge transfer...');
    console.log('   Bridging 1 USDC from Base to Optimism');
    const result = await bridge.bridgeUSDC('optimism', '1');
    if (result.success) {
        console.log(`✅ Bridge successful! Tx: ${result.txHash}`);
        // Step 4: Track transaction
        console.log('\nStep 4: Tracking transaction...');
        history.addTransaction({
            txHash: result.txHash,
            sourceChain: 'base',
            destinationChain: 'optimism',
            amount: '1',
            token: 'USDC',
            status: 'pending',
            timestamp: Date.now(),
            senderAddress: account.address,
            recipientAddress: account.address,
            fees: result.fees
        });
        // Simulate tracking (in real use, you'd poll for status)
        console.log('   Transaction saved with status: pending');
        console.log('   Poll history to check completion status');
        // Step 5: View updated history
        console.log('\nStep 5: Updated transaction history:');
        const pendingTxs = history.getPendingTransactions();
        console.log(`   Pending transactions: ${pendingTxs.length}`);
    }
    else {
        console.log(`❌ Bridge failed: ${result.error}`);
    }
}
// =============================================================================
// Main Execution
// =============================================================================
async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║          Agora Cross-Chain Bridge Examples                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    // Validate private key
    if (!PRIVATE_KEY || PRIVATE_KEY === '0x') {
        console.log('\n⚠️  Please set your PRIVATE_KEY environment variable to run these examples.');
        console.log('   Example: PRIVATE_KEY=0x... npx tsx bridge-example.ts\n');
        // Run demo mode with read-only operations
        console.log('Running in DEMO mode (read-only operations)...\n');
        try {
            await example2_getBridgeQuote();
            await example6_multiChainOperations();
        }
        catch (error) {
            console.error('Demo error:', error);
        }
        return;
    }
    try {
        // Run all examples
        const bridge = await example1_basicSetup();
        await example2_getBridgeQuote();
        // Uncomment to execute actual transfers:
        // await example3_executeBridgeTransfer(bridge);
        await example4_transactionHistory();
        await example5_errorHandling(bridge);
        await example6_multiChainOperations();
        // Uncomment to run complete workflow:
        // await example7_completeWorkflow();
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║              All examples completed!                         ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
    }
    catch (error) {
        console.error('\n❌ Error running examples:', error);
        process.exit(1);
    }
}
// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
// Export for use as module
export { example1_basicSetup, example2_getBridgeQuote, example3_executeBridgeTransfer, example4_transactionHistory, example5_errorHandling, example6_multiChainOperations, example7_completeWorkflow };
//# sourceMappingURL=bridge-example.js.map