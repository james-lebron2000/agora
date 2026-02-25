import { createPublicClient, createWalletClient, http, isAddress, isHex, keccak256, padHex, parseUnits, toBytes, } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
export const ESCROW_TIMEOUT_SEC = 24 * 60 * 60;
const ESCROW_USDC_DECIMALS = 6;
export const ESCROW_ADDRESSES = {
    base: '0x0000000000000000000000000000000000000000',
    'base-sepolia': '0x0000000000000000000000000000000000000000',
};
const NETWORK_CHAINS = {
    base,
    'base-sepolia': baseSepolia,
};
const ENV_ESCROW_ADDRESS = process.env.AGORA_ESCROW_CONTRACT_ADDRESS;
const ENV_ESCROW_ADDRESS_BASE = process.env.AGORA_ESCROW_CONTRACT_ADDRESS_BASE;
const ENV_ESCROW_ADDRESS_BASE_SEPOLIA = process.env.AGORA_ESCROW_CONTRACT_ADDRESS_BASE_SEPOLIA;
export const ESCROW_ABI = [
    {
        type: 'function',
        name: 'deposit',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'requestId', type: 'bytes32' },
            { name: 'seller', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'release',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'requestId', type: 'bytes32' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'refund',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'requestId', type: 'bytes32' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'batchRelease',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'requestIds', type: 'bytes32[]' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'batchRefund',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'requestIds', type: 'bytes32[]' }],
        outputs: [],
    },
    {
        type: 'function',
        name: 'escrows',
        stateMutability: 'view',
        inputs: [{ name: 'requestId', type: 'bytes32' }],
        outputs: [
            { name: 'buyer', type: 'address' },
            { name: 'seller', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'createdAt', type: 'uint64' },
            { name: 'status', type: 'uint8' },
        ],
    },
    {
        type: 'event',
        name: 'Deposited',
        inputs: [
            { name: 'requestId', type: 'bytes32', indexed: true },
            { name: 'buyer', type: 'address', indexed: true },
            { name: 'seller', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Released',
        inputs: [
            { name: 'requestId', type: 'bytes32', indexed: true },
            { name: 'seller', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'fee', type: 'uint256', indexed: false },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Refunded',
        inputs: [
            { name: 'requestId', type: 'bytes32', indexed: true },
            { name: 'buyer', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'BatchReleased',
        inputs: [
            { name: 'requestIds', type: 'bytes32[]', indexed: false },
            { name: 'totalAmount', type: 'uint256', indexed: false },
            { name: 'totalFee', type: 'uint256', indexed: false },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'BatchRefunded',
        inputs: [
            { name: 'requestIds', type: 'bytes32[]', indexed: false },
            { name: 'totalAmount', type: 'uint256', indexed: false },
        ],
        anonymous: false,
    },
];
export function encodeRequestId(requestId) {
    if (isHex(requestId)) {
        if (requestId.length === 66)
            return requestId;
        return padHex(requestId, { size: 32 });
    }
    return keccak256(toBytes(requestId));
}
function resolveBaseChain(options) {
    if (options.chain)
        return options.chain;
    if (options.network)
        return NETWORK_CHAINS[options.network];
    return baseSepolia;
}
function resolveRpcUrl(chain, rpcUrl) {
    return rpcUrl ?? chain.rpcUrls.default.http[0];
}
function resolveEnvEscrowAddress(chain) {
    const byNetwork = chain.id === base.id
        ? ENV_ESCROW_ADDRESS_BASE
        : chain.id === baseSepolia.id
            ? ENV_ESCROW_ADDRESS_BASE_SEPOLIA
            : undefined;
    const candidate = byNetwork || ENV_ESCROW_ADDRESS;
    if (candidate && isAddress(candidate)) {
        return candidate;
    }
    return undefined;
}
function resolveEscrowAddress(chain, override) {
    if (override)
        return override;
    const envAddress = resolveEnvEscrowAddress(chain);
    if (envAddress)
        return envAddress;
    if (chain.id === base.id)
        return ESCROW_ADDRESSES.base;
    if (chain.id === baseSepolia.id)
        return ESCROW_ADDRESSES['base-sepolia'];
    throw new Error(`Unsupported chain ${chain.id} for escrow`);
}
function parseUsdcAmount(amount, decimals = ESCROW_USDC_DECIMALS) {
    if (typeof amount === 'bigint')
        return amount;
    return parseUnits(amount.toString(), decimals);
}
function statusFromValue(value) {
    switch (value) {
        case 1:
            return 'DEPOSITED';
        case 2:
            return 'RELEASED';
        case 3:
            return 'REFUNDED';
        default:
            return 'NONE';
    }
}
function createClients(options) {
    const chain = resolveBaseChain(options);
    const rpcUrl = resolveRpcUrl(chain, options.rpcUrl);
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({ chain, transport });
    const escrowAddress = resolveEscrowAddress(chain, options.escrowAddress);
    if (!options.privateKey) {
        return { chain, publicClient, escrowAddress };
    }
    const account = privateKeyToAccount(options.privateKey);
    const walletClient = createWalletClient({ account, chain, transport });
    return { chain, publicClient, walletClient, account, escrowAddress };
}
export async function deposit(options) {
    const { walletClient, account, escrowAddress } = createClients(options);
    if (!walletClient || !account) {
        throw new Error('privateKey is required to deposit');
    }
    const requestId = encodeRequestId(options.requestId);
    const value = parseUsdcAmount(options.amount, options.decimals);
    return walletClient.writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'deposit',
        args: [requestId, options.seller, value],
        account,
    });
}
export async function release(options) {
    const { walletClient, account, escrowAddress } = createClients(options);
    if (!walletClient || !account) {
        throw new Error('privateKey is required to release');
    }
    const requestId = encodeRequestId(options.requestId);
    return walletClient.writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'release',
        args: [requestId],
        account,
    });
}
export async function refund(options) {
    const { walletClient, account, escrowAddress } = createClients(options);
    if (!walletClient || !account) {
        throw new Error('privateKey is required to refund');
    }
    const requestId = encodeRequestId(options.requestId);
    return walletClient.writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'refund',
        args: [requestId],
        account,
    });
}
export async function batchRelease(options) {
    const { walletClient, account, escrowAddress } = createClients(options);
    if (!walletClient || !account) {
        throw new Error('privateKey is required for batch release');
    }
    const requestIds = options.requestIds.map(encodeRequestId);
    return walletClient.writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'batchRelease',
        args: [requestIds],
        account,
    });
}
export async function batchRefund(options) {
    const { walletClient, account, escrowAddress } = createClients(options);
    if (!walletClient || !account) {
        throw new Error('privateKey is required for batch refund');
    }
    const requestIds = options.requestIds.map(encodeRequestId);
    return walletClient.writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'batchRefund',
        args: [requestIds],
        account,
    });
}
export async function getEscrowStatus(options) {
    const { publicClient, escrowAddress } = createClients(options);
    const requestId = encodeRequestId(options.requestId);
    const escrow = await publicClient.readContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'escrows',
        args: [requestId],
    });
    const [buyer, seller, amount, createdAt, status] = escrow;
    return {
        requestId,
        buyer,
        seller,
        amount,
        createdAt,
        status: statusFromValue(Number(status)),
    };
}
export function watchEscrowEvents(options) {
    const { publicClient, escrowAddress } = createClients(options);
    const requestId = options.requestId ? encodeRequestId(options.requestId) : undefined;
    const unwatchers = [];
    if (options.onDeposited) {
        unwatchers.push(publicClient.watchContractEvent({
            address: escrowAddress,
            abi: ESCROW_ABI,
            eventName: 'Deposited',
            args: requestId ? { requestId } : undefined,
            onLogs: (logs) => {
                logs.forEach((log) => {
                    const args = log.args;
                    options.onDeposited?.(args);
                });
            },
        }));
    }
    if (options.onReleased) {
        unwatchers.push(publicClient.watchContractEvent({
            address: escrowAddress,
            abi: ESCROW_ABI,
            eventName: 'Released',
            args: requestId ? { requestId } : undefined,
            onLogs: (logs) => {
                logs.forEach((log) => {
                    const args = log.args;
                    options.onReleased?.(args);
                });
            },
        }));
    }
    if (options.onRefunded) {
        unwatchers.push(publicClient.watchContractEvent({
            address: escrowAddress,
            abi: ESCROW_ABI,
            eventName: 'Refunded',
            args: requestId ? { requestId } : undefined,
            onLogs: (logs) => {
                logs.forEach((log) => {
                    const args = log.args;
                    options.onRefunded?.(args);
                });
            },
        }));
    }
    if (options.onBatchReleased) {
        unwatchers.push(publicClient.watchContractEvent({
            address: escrowAddress,
            abi: ESCROW_ABI,
            eventName: 'BatchReleased',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    const args = log.args;
                    options.onBatchReleased?.(args);
                });
            },
        }));
    }
    if (options.onBatchRefunded) {
        unwatchers.push(publicClient.watchContractEvent({
            address: escrowAddress,
            abi: ESCROW_ABI,
            eventName: 'BatchRefunded',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    const args = log.args;
                    options.onBatchRefunded?.(args);
                });
            },
        }));
    }
    return () => {
        unwatchers.forEach((unwatch) => unwatch());
    };
}
//# sourceMappingURL=escrow.js.map