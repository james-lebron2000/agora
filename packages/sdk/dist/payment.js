/**
 * Payment Module for Agora SDK
 *
 * Provides USDC and native token transfer functionality on Base network.
 * Supports both mainnet and testnet (Base Sepolia) environments.
 *
 * @module payment
 */
import { createPublicClient, createWalletClient, erc20Abi, http, parseUnits, } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
/** USDC token decimals (6 for standard USDC) */
export const USDC_DECIMALS = 6;
export const USDC_ADDRESSES = {
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};
const NETWORK_CHAINS = {
    base,
    'base-sepolia': baseSepolia,
};
/**
 * Resolve the appropriate chain configuration from options
 * @param options - Payment client options
 * @returns Chain configuration
 */
export function resolveBaseChain(options) {
    if (options.chain)
        return options.chain;
    if (options.network)
        return NETWORK_CHAINS[options.network];
    return baseSepolia;
}
/**
 * Get the USDC contract address for a given chain
 * @param chain - Chain configuration
 * @returns USDC contract address
 * @throws Error if chain is not supported
 */
export function getUsdcAddressForChain(chain) {
    if (chain.id === base.id)
        return USDC_ADDRESSES.base;
    if (chain.id === baseSepolia.id)
        return USDC_ADDRESSES['base-sepolia'];
    throw new Error(`Unsupported chain ${chain.id} for USDC`);
}
function resolveRpcUrl(chain, rpcUrl) {
    return rpcUrl ?? chain.rpcUrls.default.http[0];
}
function resolveUsdcAddress(chain, override) {
    return override ?? getUsdcAddressForChain(chain);
}
function parseUsdcAmount(amount, decimals = USDC_DECIMALS) {
    if (typeof amount === 'bigint')
        return amount;
    return parseUnits(amount.toString(), decimals);
}
function createClients(options) {
    const chain = resolveBaseChain(options);
    const rpcUrl = resolveRpcUrl(chain, options.rpcUrl);
    const account = privateKeyToAccount(options.privateKey);
    const transport = http(rpcUrl);
    const walletClient = createWalletClient({ account, chain, transport });
    const publicClient = createPublicClient({ chain, transport });
    const usdcAddress = resolveUsdcAddress(chain, options.usdcAddress);
    return { chain, account, walletClient, publicClient, usdcAddress };
}
/**
 * Approve a spender to transfer USDC on behalf of the wallet
 * @param options - Approval options including spender and amount
 * @returns Transaction hash
 * @example
 * ```ts
 * const hash = await approveUSDC({
 *   privateKey: '0x...',
 *   network: 'base',
 *   spender: '0x...',
 *   amount: 100
 * });
 * ```
 */
export async function approveUSDC(options) {
    const { walletClient, account, usdcAddress } = createClients(options);
    const value = parseUsdcAmount(options.amount, options.decimals);
    return walletClient.writeContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [options.spender, value],
        account,
    });
}
/**
 * Transfer USDC to a recipient
 * @param options - Transfer options including recipient and amount
 * @returns Transaction hash
 * @example
 * ```ts
 * const hash = await transferUSDC({
 *   privateKey: '0x...',
 *   network: 'base',
 *   recipient: '0x...',
 *   amount: 50.5
 * });
 * ```
 */
export async function transferUSDC(options) {
    const { walletClient, account, usdcAddress } = createClients(options);
    const value = parseUsdcAmount(options.amount, options.decimals);
    return walletClient.writeContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [options.recipient, value],
        account,
    });
}
function parseNativeAmount(amount, decimals = 18) {
    if (typeof amount === 'bigint')
        return amount;
    return parseUnits(amount.toString(), decimals);
}
/**
 * Transfer native ETH to a recipient
 * @param options - Transfer options including recipient and amount
 * @returns Transaction hash
 * @example
 * ```ts
 * const hash = await transferNative({
 *   privateKey: '0x...',
 *   network: 'base',
 *   recipient: '0x...',
 *   amount: 0.01  // in ETH
 * });
 * ```
 */
export async function transferNative(options) {
    const { walletClient, account } = createClients(options);
    const value = parseNativeAmount(options.amount, options.decimals);
    return walletClient.sendTransaction({
        account,
        to: options.recipient,
        value,
    });
}
//# sourceMappingURL=payment.js.map