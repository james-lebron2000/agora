import { createPublicClient, createWalletClient, erc20Abi, http, parseUnits, } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
export const USDC_DECIMALS = 6;
export const USDC_ADDRESSES = {
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};
const NETWORK_CHAINS = {
    base,
    'base-sepolia': baseSepolia,
};
export function resolveBaseChain(options) {
    if (options.chain)
        return options.chain;
    if (options.network)
        return NETWORK_CHAINS[options.network];
    return baseSepolia;
}
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
//# sourceMappingURL=payment.js.map