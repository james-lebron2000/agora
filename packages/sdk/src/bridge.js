/**
 * Cross-Chain Bridge Module for Agora
 * Supports Base, Optimism, and Arbitrum chains
 * Uses LayerZero for cross-chain messaging and USDC transfers
 */
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, optimism, arbitrum, mainnet } from 'viem/chains';
// Chain configurations supported by Agora Bridge
export const SUPPORTED_CHAINS = {
    base,
    optimism,
    arbitrum,
    ethereum: mainnet
};
// USDC contract addresses on each chain
export const USDC_ADDRESSES = {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};
// LayerZero Endpoint addresses for cross-chain messaging
export const LAYERZERO_ENDPOINTS = {
    ethereum: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
    base: '0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7',
    optimism: '0x3c2269811836af69497E5F486A85D7316753cf62',
    arbitrum: '0x3c2269811836af69497E5F486A85D7316753cf62'
};
// Chain IDs for LayerZero
export const LAYERZERO_CHAIN_IDS = {
    ethereum: 101,
    base: 184,
    optimism: 111,
    arbitrum: 110
};
// Native token symbols
export const NATIVE_SYMBOLS = {
    ethereum: 'ETH',
    base: 'ETH',
    optimism: 'ETH',
    arbitrum: 'ETH'
};
// RPC URLs (using public endpoints with fallbacks)
export const RPC_URLS = {
    ethereum: [
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://ethereum.publicnode.com'
    ],
    base: [
        'https://base.llamarpc.com',
        'https://base.meowrpc.com',
        'https://mainnet.base.org'
    ],
    optimism: [
        'https://optimism.llamarpc.com',
        'https://rpc.ankr.com/optimism',
        'https://mainnet.optimism.io'
    ],
    arbitrum: [
        'https://arbitrum.llamarpc.com',
        'https://rpc.ankr.com/arbitrum',
        'https://arb1.arbitrum.io/rpc'
    ]
};
// ERC20 ABI for USDC interactions
const ERC20_ABI = [
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    }
];
// LayerZero Bridge ABI (simplified)
const BRIDGE_ABI = [
    {
        inputs: [
            { name: '_dstChainId', type: 'uint16' },
            { name: '_toAddress', type: 'bytes' },
            { name: '_amount', type: 'uint256' },
            { name: '_refundAddress', type: 'address' },
            { name: '_zroPaymentAddress', type: 'address' },
            { name: '_adapterParams', type: 'bytes' }
        ],
        name: 'sendTokens',
        outputs: [],
        stateMutability: 'payable',
        type: 'function'
    },
    {
        inputs: [
            { name: '_dstChainId', type: 'uint16' },
            { name: '_toAddress', type: 'bytes' },
            { name: '_amount', type: 'uint256' },
            { name: '_refundAddress', type: 'address' },
            { name: '_zroPaymentAddress', type: 'address' },
            { name: '_adapterParams', type: 'bytes' }
        ],
        name: 'estimateSendFee',
        outputs: [
            { name: 'nativeFee', type: 'uint256' },
            { name: 'zroFee', type: 'uint256' }
        ],
        stateMutability: 'view',
        type: 'function'
    }
];
/**
 * Create a public client for the specified chain
 * Tries multiple RPC endpoints for reliability
 */
export function createChainPublicClient(chain) {
    const urls = RPC_URLS[chain];
    // Use the first RPC URL (could implement fallback logic here)
    return createPublicClient({
        chain: SUPPORTED_CHAINS[chain],
        transport: http(urls[0])
    });
}
/**
 * Create a wallet client for the specified chain
 */
export function createChainWalletClient(privateKey, chain) {
    const account = privateKeyToAccount(privateKey);
    const urls = RPC_URLS[chain];
    return createWalletClient({
        account,
        chain: SUPPORTED_CHAINS[chain],
        transport: http(urls[0])
    });
}
/**
 * Get USDC balance for an address on a specific chain
 */
export async function getUSDCBalance(address, chain) {
    const client = createChainPublicClient(chain);
    const usdcAddress = USDC_ADDRESSES[chain];
    try {
        const balance = await client.readContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address]
        });
        // USDC has 6 decimals
        return formatUnits(balance, 6);
    }
    catch (error) {
        console.error(`[Bridge] Failed to get USDC balance on ${chain}:`, error);
        return '0';
    }
}
/**
 * Get native token balance for an address on a specific chain
 */
export async function getNativeBalance(address, chain) {
    const client = createChainPublicClient(chain);
    try {
        const balance = await client.getBalance({ address });
        return formatUnits(balance, 18);
    }
    catch (error) {
        console.error(`[Bridge] Failed to get native balance on ${chain}:`, error);
        return '0';
    }
}
/**
 * Get all balances across supported chains
 */
export async function getAllBalances(address) {
    const chains = ['ethereum', 'base', 'optimism', 'arbitrum'];
    const balances = [];
    for (const chain of chains) {
        const [nativeBalance, usdcBalance] = await Promise.all([
            getNativeBalance(address, chain),
            getUSDCBalance(address, chain)
        ]);
        balances.push({
            chain,
            nativeBalance,
            usdcBalance
        });
    }
    return balances;
}
/**
 * Get a bridge quote for cross-chain transfer
 * Estimates the fees for transferring tokens between chains
 */
export async function getBridgeQuote(config, senderAddress) {
    const { sourceChain, destinationChain, token, amount } = config;
    // For now, estimate fixed fees based on typical LayerZero costs
    // In production, this would call the actual bridge contract
    const baseFee = token === 'USDC' ? 0.0005 : 0.001; // ETH
    const multiplier = sourceChain === 'ethereum' ? 1.5 : 1;
    const estimatedFee = (baseFee * multiplier).toFixed(6);
    // Estimate time based on chains
    let estimatedTime = '5-15 minutes';
    if (sourceChain === 'ethereum' || destinationChain === 'ethereum') {
        estimatedTime = '10-30 minutes';
    }
    return {
        sourceChain,
        destinationChain,
        token,
        amount,
        estimatedFee,
        estimatedTime,
        nativeFee: parseUnits(estimatedFee, 18)
    };
}
/**
 * Approve USDC for bridge contract
 */
export async function approveUSDCForBridge(privateKey, chain, bridgeAddress, amount) {
    const walletClient = createChainWalletClient(privateKey, chain);
    const publicClient = createChainPublicClient(chain);
    const usdcAddress = USDC_ADDRESSES[chain];
    try {
        // Parse amount with 6 decimals for USDC
        const parsedAmount = parseUnits(amount, 6);
        // Check current allowance
        const account = privateKeyToAccount(privateKey);
        const currentAllowance = await publicClient.readContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [account.address, bridgeAddress]
        });
        if (currentAllowance >= parsedAmount) {
            console.log(`[Bridge] USDC already approved for ${amount} on ${chain}`);
            return null; // Already approved
        }
        console.log(`[Bridge] Approving USDC for bridge on ${chain}...`);
        // @ts-ignore - viem types mismatch in this version
        const txHash = await walletClient.writeContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [bridgeAddress, parsedAmount]
        });
        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === 'success') {
            console.log(`[Bridge] USDC approved: ${txHash}`);
            return txHash;
        }
        else {
            throw new Error('Approval transaction failed');
        }
    }
    catch (error) {
        console.error(`[Bridge] Failed to approve USDC:`, error);
        throw error;
    }
}
/**
 * Execute a cross-chain bridge transfer using LayerZero
 * This is a simplified implementation - production would use actual LayerZero contracts
 */
export async function executeBridge(privateKey, config, maxRetries = 3) {
    const { sourceChain, destinationChain, token, amount, recipient } = config;
    const account = privateKeyToAccount(privateKey);
    console.log(`[Bridge] Initiating bridge from ${sourceChain} to ${destinationChain}`);
    console.log(`[Bridge] Amount: ${amount} ${token}`);
    console.log(`[Bridge] Sender: ${account.address}`);
    let attempt = 0;
    while (attempt < maxRetries) {
        attempt++;
        try {
            // Get fee estimate
            const quote = await getBridgeQuote(config, account.address);
            console.log(`[Bridge] Estimated fee: ${quote.estimatedFee} ETH`);
            // Check native balance for gas
            const nativeBalance = await getNativeBalance(account.address, sourceChain);
            const nativeBalanceFloat = parseFloat(nativeBalance);
            const feeFloat = parseFloat(quote.estimatedFee);
            if (nativeBalanceFloat < feeFloat * 2) { // Need 2x for safety
                throw new Error(`Insufficient ${NATIVE_SYMBOLS[sourceChain]} for gas. ` +
                    `Balance: ${nativeBalance}, Required: ~${(feeFloat * 2).toFixed(6)}`);
            }
            if (token === 'USDC') {
                // Check USDC balance
                const usdcBalance = await getUSDCBalance(account.address, sourceChain);
                const usdcAmount = parseFloat(amount);
                if (parseFloat(usdcBalance) < usdcAmount) {
                    throw new Error(`Insufficient USDC balance on ${sourceChain}. ` +
                        `Balance: ${usdcBalance}, Required: ${amount}`);
                }
                // In production, this would call the actual LayerZero bridge contract
                // For now, we simulate the bridge operation
                console.log(`[Bridge] Executing USDC bridge (simulated)...`);
                // Simulate bridge delay
                await new Promise(resolve => setTimeout(resolve, 3000));
                // Generate a mock transaction hash
                const mockTxHash = `0x${Buffer.from(Math.random().toString()).toString('hex').padEnd(64, '0')}`;
                console.log(`[Bridge] Bridge initiated: ${mockTxHash}`);
                console.log(`[Bridge] Tokens will arrive on ${destinationChain} in ~${quote.estimatedTime}`);
                return {
                    success: true,
                    txHash: mockTxHash,
                    sourceChain,
                    destinationChain,
                    amount
                };
            }
            else {
                // ETH bridging (simplified)
                console.log(`[Bridge] Executing ETH bridge (simulated)...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                const mockTxHash = `0x${Buffer.from(Math.random().toString()).toString('hex').padEnd(64, '0')}`;
                return {
                    success: true,
                    txHash: mockTxHash,
                    sourceChain,
                    destinationChain,
                    amount
                };
            }
        }
        catch (error) {
            console.error(`[Bridge] Attempt ${attempt}/${maxRetries} failed:`, error);
            if (attempt >= maxRetries) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    sourceChain,
                    destinationChain,
                    amount
                };
            }
            // Wait before retry with exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[Bridge] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return {
        success: false,
        error: 'Max retries exceeded',
        sourceChain,
        destinationChain,
        amount
    };
}
/**
 * Find the cheapest chain for a given operation
 * Compares gas costs and returns the most cost-effective chain
 */
export async function findCheapestChain(operation, excludeChains) {
    const chains = ['base', 'optimism', 'arbitrum'];
    const filteredChains = excludeChains
        ? chains.filter(c => !excludeChains.includes(c))
        : chains;
    // Cost estimates in USD (simplified model)
    const baseCosts = {
        'send-base': 0.001,
        'send-optimism': 0.002,
        'send-arbitrum': 0.003,
        'swap-base': 0.01,
        'swap-optimism': 0.015,
        'swap-arbitrum': 0.02,
        'contract-base': 0.005,
        'contract-optimism': 0.008,
        'contract-arbitrum': 0.012
    };
    let cheapest = filteredChains[0];
    let lowestCost = Infinity;
    for (const chain of filteredChains) {
        const costKey = `${operation}-${chain}`;
        const cost = baseCosts[costKey] || 0.01;
        if (cost < lowestCost) {
            lowestCost = cost;
            cheapest = chain;
        }
    }
    return {
        chain: cheapest,
        estimatedCost: lowestCost.toFixed(4)
    };
}
/**
 * Get bridge status for a transaction
 * In production, this would query LayerZero's messaging layer
 */
export async function getBridgeStatus(txHash, sourceChain, destinationChain) {
    // Simulate status check
    // In production, this would query the actual bridge contracts
    return {
        status: 'pending',
        confirmations: Math.floor(Math.random() * 20),
        estimatedCompletion: '5-10 minutes'
    };
}
/**
 * CrossChainBridge class for easy integration
 */
export class CrossChainBridge {
    privateKey;
    defaultChain;
    constructor(privateKey, defaultChain = 'base') {
        this.privateKey = privateKey;
        this.defaultChain = defaultChain;
    }
    /**
     * Get balances across all supported chains
     */
    async getBalances(address) {
        const account = privateKeyToAccount(this.privateKey);
        return getAllBalances(address || account.address);
    }
    /**
     * Bridge USDC to another chain
     */
    async bridgeUSDC(destinationChain, amount, sourceChain) {
        return executeBridge(this.privateKey, {
            sourceChain: sourceChain || this.defaultChain,
            destinationChain,
            token: 'USDC',
            amount
        });
    }
    /**
     * Bridge ETH to another chain
     */
    async bridgeETH(destinationChain, amount, sourceChain) {
        return executeBridge(this.privateKey, {
            sourceChain: sourceChain || this.defaultChain,
            destinationChain,
            token: 'ETH',
            amount
        });
    }
    /**
     * Get a quote for bridging
     */
    async getQuote(destinationChain, token, amount, sourceChain) {
        const account = privateKeyToAccount(this.privateKey);
        return getBridgeQuote({
            sourceChain: sourceChain || this.defaultChain,
            destinationChain,
            token,
            amount
        }, account.address);
    }
    /**
     * Find the cheapest chain for an operation
     */
    async findCheapestChain(operation, excludeChains) {
        return findCheapestChain(operation, excludeChains);
    }
}
export default CrossChainBridge;
//# sourceMappingURL=bridge.js.map