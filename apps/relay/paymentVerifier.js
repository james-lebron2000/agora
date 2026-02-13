import {
  createPublicClient,
  decodeEventLog,
  erc20Abi,
  formatUnits,
  http,
  isAddress,
  isHex,
  keccak256,
  parseUnits,
  toBytes,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';

const DEFAULT_USDC = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

const CHAINS = {
  base,
  'base-sepolia': baseSepolia,
};

const ESCROW_ABI = [
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'requestId', type: 'bytes32', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
];

function parseDidAddress(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^eip155:(\d+):(0x[a-fA-F0-9]{40})$/);
  if (!match) return null;
  const address = match[2];
  if (!isAddress(address)) return null;
  return address.toLowerCase();
}

function normalizeAddress(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isAddress(trimmed)) return null;
  return trimmed.toLowerCase();
}

function normalizeNetwork(input) {
  if (typeof input === 'number') {
    if (input === base.id) return 'base';
    if (input === baseSepolia.id) return 'base-sepolia';
    return null;
  }
  if (typeof input !== 'string') return null;
  const value = input.trim().toLowerCase();
  if (!value) return null;
  if (value === 'base' || value === String(base.id)) return 'base';
  if (value === 'base-sepolia' || value === 'base_sepolia' || value === String(baseSepolia.id)) return 'base-sepolia';
  return null;
}

function parseAmountUnits(amount, decimals) {
  if (amount == null) return { value: null, invalid: false };
  if (typeof amount === 'bigint') {
    return amount > 0n
      ? { value: amount, invalid: false }
      : { value: null, invalid: true };
  }
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || amount <= 0) return { value: null, invalid: true };
    try {
      return { value: parseUnits(amount.toString(), decimals), invalid: false };
    } catch {
      return { value: null, invalid: true };
    }
  }
  if (typeof amount === 'string') {
    const trimmed = amount.trim();
    if (!trimmed) return { value: null, invalid: true };
    try {
      return { value: parseUnits(trimmed, decimals), invalid: false };
    } catch {
      return { value: null, invalid: true };
    }
  }
  return { value: null, invalid: true };
}

function normalizeToken(input) {
  if (typeof input !== 'string') return 'USDC';
  const token = input.trim().toUpperCase();
  if (!token) return 'USDC';
  return token;
}

function encodeRequestId(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  if (isHex(trimmed, { strict: false }) && trimmed.length === 66) {
    return trimmed.toLowerCase();
  }
  return keccak256(toBytes(trimmed)).toLowerCase();
}

function resolveEscrowAddress(network) {
  if (network === 'base') return normalizeAddress(process.env.AGORA_ESCROW_CONTRACT_ADDRESS_BASE || '');
  return normalizeAddress(process.env.AGORA_ESCROW_CONTRACT_ADDRESS_BASE_SEPOLIA || '');
}

function isLikelyTxNotFound(error) {
  const message = String(error || '').toLowerCase();
  return (
    message.includes('not found')
    || message.includes('no transaction')
    || message.includes('missing or invalid parameters')
    || message.includes('transactionreceiptnotfounderror')
    || message.includes('receipt with hash')
    || message.includes('could not be found')
  );
}

export function createUsdcPaymentVerifier(options = {}) {
  const minConfirmationsByToken = {
    USDC: Math.max(
      1,
      Number(options.minConfirmationsUsdc || options.minConfirmations || process.env.AGORA_MIN_CONFIRMATIONS_USDC || 1),
    ),
    ETH: Math.max(
      1,
      Number(options.minConfirmationsEth || options.minConfirmations || process.env.AGORA_MIN_CONFIRMATIONS_ETH || 1),
    ),
  };
  const rpcUrls = {
    base: options.baseRpcUrl || process.env.AGORA_BASE_RPC_URL || base.rpcUrls.default.http[0],
    'base-sepolia': options.baseSepoliaRpcUrl || process.env.AGORA_BASE_SEPOLIA_RPC_URL || baseSepolia.rpcUrls.default.http[0],
  };

  const usdcAddresses = {
    base: options.usdcBase || process.env.AGORA_USDC_BASE || DEFAULT_USDC.base,
    'base-sepolia': options.usdcBaseSepolia || process.env.AGORA_USDC_BASE_SEPOLIA || DEFAULT_USDC['base-sepolia'],
  };

  const clients = {
    base: null,
    'base-sepolia': null,
  };

  const getClient = (network) => {
    if (!clients[network]) {
      clients[network] = createPublicClient({ chain: CHAINS[network], transport: http(rpcUrls[network]) });
    }
    return clients[network];
  };

  async function verifyUSDCTransfer(input) {
    const txHash = typeof input?.txHash === 'string'
      ? input.txHash.trim()
      : typeof input?.payment_tx === 'string'
        ? input.payment_tx.trim()
        : '';

    if (!txHash) {
      return { ok: false, error: 'INVALID_REQUEST', message: 'tx_hash is required' };
    }

    if (txHash.startsWith('relay:held:')) {
      const syntheticToken = normalizeToken(input?.token);
      return {
        ok: true,
        payment: {
          tx_hash: txHash,
          chain: 'relay',
          token: syntheticToken,
          status: 'VERIFIED_SYNTHETIC',
          confirmations: 0,
          amount: input?.amount ?? null,
          amount_units: null,
          payer: normalizeAddress(input?.payer) || parseDidAddress(input?.senderId) || null,
          payee: normalizeAddress(input?.payee) || null,
          block_number: null,
          verified_at: new Date().toISOString(),
        },
      };
    }

    if (!isHex(txHash, { strict: false }) || txHash.length !== 66) {
      return { ok: false, error: 'INVALID_TX_HASH', message: 'tx_hash must be a 0x-prefixed 32-byte hash' };
    }

    const network = normalizeNetwork(input?.chain) || 'base-sepolia';
    if (!network) {
      return { ok: false, error: 'UNSUPPORTED_CHAIN', message: 'Only base and base-sepolia are supported' };
    }

    const token = normalizeToken(input?.token);
    if (token !== 'USDC' && token !== 'ETH') {
      return { ok: false, error: 'UNSUPPORTED_TOKEN', message: 'Only USDC and ETH are supported' };
    }

    const expectedPayer = normalizeAddress(input?.payer) || parseDidAddress(input?.senderId);
    const expectedPayee = normalizeAddress(input?.payee);
    const amountParsed = parseAmountUnits(input?.amount, token === 'ETH' ? 18 : 6);
    if (amountParsed.invalid) {
      return { ok: false, error: 'INVALID_AMOUNT', message: `amount must be a positive ${token} value` };
    }
    const expectedAmountUnits = amountParsed.value;

    const usdcAddress = token === 'USDC' ? normalizeAddress(usdcAddresses[network]) : null;
    if (token === 'USDC' && !usdcAddress) {
      return { ok: false, error: 'MISCONFIGURED_USDC', message: `Invalid USDC address for ${network}` };
    }

    const client = getClient(network);

    let receipt;
    try {
      receipt = await client.getTransactionReceipt({ hash: txHash });
    } catch (error) {
      if (isLikelyTxNotFound(error)) {
        return {
          ok: false,
          error: 'TX_NOT_FOUND',
          message: 'Transaction is not indexed yet',
          pending: true,
        };
      }
      return {
        ok: false,
        error: 'RPC_ERROR',
        message: String(error),
      };
    }

    if (receipt.status !== 'success') {
      return {
        ok: false,
        error: 'TX_REVERTED',
        message: 'Transaction reverted',
      };
    }

    const latestBlock = await client.getBlockNumber();
    const confirmations = Number(latestBlock - receipt.blockNumber + 1n);
    const requiredConfirmations = token === 'ETH'
      ? minConfirmationsByToken.ETH
      : minConfirmationsByToken.USDC;
    if (confirmations < requiredConfirmations) {
      return {
        ok: false,
        error: 'TX_UNCONFIRMED',
        message: `Waiting for confirmations (${confirmations}/${requiredConfirmations})`,
        pending: true,
        confirmations,
      };
    }

    if (token === 'ETH') {
      const tx = await client.getTransaction({ hash: txHash });
      const from = normalizeAddress(tx.from);
      const to = normalizeAddress(tx.to);
      const value = tx.value;

      if (expectedPayer && from !== expectedPayer) {
        return { ok: false, error: 'PAYER_MISMATCH', message: 'ETH tx payer mismatch' };
      }
      if (expectedPayee && to !== expectedPayee) {
        return { ok: false, error: 'PAYEE_MISMATCH', message: 'ETH tx payee mismatch' };
      }
      if (expectedAmountUnits != null && value !== expectedAmountUnits) {
        return { ok: false, error: 'AMOUNT_MISMATCH', message: 'ETH tx amount mismatch' };
      }

      return {
        ok: true,
        payment: {
          tx_hash: txHash,
          chain: network,
          token,
          status: 'VERIFIED',
          confirmations,
          amount: formatUnits(value, 18),
          amount_units: value.toString(),
          payer: from,
          payee: to,
          block_number: Number(receipt.blockNumber),
          verified_at: new Date().toISOString(),
        },
      };
    }

    let matchedTransfer = null;
    for (const log of receipt.logs) {
      const logAddress = normalizeAddress(log.address);
      if (!logAddress || logAddress !== usdcAddress) continue;

      try {
        const decoded = decodeEventLog({
          abi: erc20Abi,
          data: log.data,
          topics: log.topics,
          strict: false,
        });
        if (decoded.eventName !== 'Transfer') continue;

        const from = normalizeAddress(decoded.args.from);
        const to = normalizeAddress(decoded.args.to);
        const value = decoded.args.value;

        if (expectedPayer && from !== expectedPayer) continue;
        if (expectedPayee && to !== expectedPayee) continue;
        if (expectedAmountUnits != null && value !== expectedAmountUnits) continue;

        matchedTransfer = { from, to, value };
        break;
      } catch {
        continue;
      }
    }

    if (!matchedTransfer) {
      return {
        ok: false,
        error: 'TRANSFER_NOT_MATCHED',
        message: 'No matching USDC transfer found in transaction logs',
      };
    }

    return {
      ok: true,
      payment: {
        tx_hash: txHash,
        chain: network,
        token,
        status: 'VERIFIED',
        confirmations,
        amount: formatUnits(matchedTransfer.value, 6),
        amount_units: matchedTransfer.value.toString(),
        payer: matchedTransfer.from,
        payee: matchedTransfer.to,
        block_number: Number(receipt.blockNumber),
        verified_at: new Date().toISOString(),
      },
    };
  }

  async function verifyEscrowDeposit(input) {
    const txHash = typeof input?.txHash === 'string'
      ? input.txHash.trim()
      : typeof input?.payment_tx === 'string'
        ? input.payment_tx.trim()
        : '';

    if (!txHash) {
      return { ok: false, error: 'INVALID_REQUEST', message: 'tx_hash is required' };
    }

    if (txHash.startsWith('relay:held:')) {
      const syntheticToken = normalizeToken(input?.token);
      return {
        ok: true,
        payment: {
          tx_hash: txHash,
          chain: 'relay',
          token: syntheticToken,
          status: 'VERIFIED_SYNTHETIC',
          confirmations: 0,
          amount: input?.amount ?? null,
          amount_units: null,
          payer: normalizeAddress(input?.payer) || parseDidAddress(input?.senderId) || null,
          payee: normalizeAddress(input?.payee) || null,
          block_number: null,
          verified_at: new Date().toISOString(),
          mode: 'synthetic',
        },
      };
    }

    if (!isHex(txHash, { strict: false }) || txHash.length !== 66) {
      return { ok: false, error: 'INVALID_TX_HASH', message: 'tx_hash must be a 0x-prefixed 32-byte hash' };
    }

    const network = normalizeNetwork(input?.chain) || 'base-sepolia';
    if (!network) {
      return { ok: false, error: 'UNSUPPORTED_CHAIN', message: 'Only base and base-sepolia are supported' };
    }

    const escrowAddress = resolveEscrowAddress(network);
    if (!escrowAddress) {
      return { ok: false, error: 'ESCROW_NOT_CONFIGURED', message: `Escrow contract address not configured for ${network}` };
    }

    const token = normalizeToken(input?.token);
    if (token !== 'USDC' && token !== 'ETH') {
      return { ok: false, error: 'UNSUPPORTED_TOKEN', message: 'Only USDC and ETH are supported' };
    }

    const requestIdRaw = input?.requestId || input?.request_id || input?.requestId;
    const requestIdHash = encodeRequestId(String(requestIdRaw || ''));
    if (!requestIdHash) {
      return { ok: false, error: 'INVALID_REQUEST_ID', message: 'request_id is required for escrow verification' };
    }

    const expectedBuyer = normalizeAddress(input?.payer) || parseDidAddress(input?.senderId);
    const expectedSeller = normalizeAddress(input?.payee);

    const amountParsed = parseAmountUnits(input?.amount, token === 'ETH' ? 18 : 6);
    if (amountParsed.invalid) {
      return { ok: false, error: 'INVALID_AMOUNT', message: `amount must be a positive ${token} value` };
    }
    const expectedAmountUnits = amountParsed.value;

    const usdcAddress = normalizeAddress(usdcAddresses[network]);
    const expectedTokenAddress = token === 'USDC'
      ? usdcAddress
      : '0x0000000000000000000000000000000000000000';
    if (token === 'USDC' && !expectedTokenAddress) {
      return { ok: false, error: 'MISCONFIGURED_USDC', message: `Invalid USDC address for ${network}` };
    }

    const client = getClient(network);
    let receipt;
    try {
      receipt = await client.getTransactionReceipt({ hash: txHash });
    } catch (error) {
      if (isLikelyTxNotFound(error)) {
        return { ok: false, error: 'TX_NOT_FOUND', message: 'Transaction is not indexed yet', pending: true };
      }
      return { ok: false, error: 'RPC_ERROR', message: String(error) };
    }

    if (receipt.status !== 'success') {
      return { ok: false, error: 'TX_REVERTED', message: 'Transaction reverted' };
    }

    const latestBlock = await client.getBlockNumber();
    const confirmations = Number(latestBlock - receipt.blockNumber + 1n);
    const requiredConfirmations = token === 'ETH'
      ? minConfirmationsByToken.ETH
      : minConfirmationsByToken.USDC;
    if (confirmations < requiredConfirmations) {
      return {
        ok: false,
        error: 'TX_UNCONFIRMED',
        message: `Waiting for confirmations (${confirmations}/${requiredConfirmations})`,
        pending: true,
        confirmations,
      };
    }

    let decodedDeposit = null;
    for (const log of receipt.logs || []) {
      const logAddress = normalizeAddress(log.address);
      if (!logAddress || logAddress !== escrowAddress) continue;
      try {
        const decoded = decodeEventLog({ abi: ESCROW_ABI, data: log.data, topics: log.topics });
        if (decoded?.eventName !== 'Deposited') continue;
        decodedDeposit = decoded;
        break;
      } catch {
        continue;
      }
    }

    if (!decodedDeposit) {
      return { ok: false, error: 'ESCROW_EVENT_NOT_FOUND', message: 'No Deposited event found for escrow contract' };
    }

    const args = decodedDeposit.args || {};
    const actualRequestId = String(args.requestId || '').toLowerCase();
    const buyer = normalizeAddress(args.buyer);
    const seller = normalizeAddress(args.seller);
    const tokenAddr = normalizeAddress(args.token) || '0x0000000000000000000000000000000000000000';
    const amountUnits = typeof args.amount === 'bigint' ? args.amount : null;

    if (actualRequestId !== requestIdHash) {
      return { ok: false, error: 'REQUEST_ID_MISMATCH', message: 'Escrow requestId mismatch' };
    }
    if (expectedBuyer && buyer && buyer !== expectedBuyer) {
      return { ok: false, error: 'PAYER_MISMATCH', message: 'Escrow buyer mismatch' };
    }
    if (expectedSeller && seller && seller !== expectedSeller) {
      return { ok: false, error: 'PAYEE_MISMATCH', message: 'Escrow seller mismatch' };
    }
    if (tokenAddr.toLowerCase() !== expectedTokenAddress.toLowerCase()) {
      return { ok: false, error: 'TOKEN_MISMATCH', message: 'Escrow token mismatch' };
    }
    if (expectedAmountUnits != null && amountUnits != null && amountUnits !== expectedAmountUnits) {
      return { ok: false, error: 'AMOUNT_MISMATCH', message: 'Escrow amount mismatch' };
    }

    return {
      ok: true,
      payment: {
        tx_hash: txHash,
        chain: network,
        token,
        status: 'VERIFIED',
        confirmations,
        amount: expectedAmountUnits != null ? formatUnits(expectedAmountUnits, token === 'ETH' ? 18 : 6) : null,
        amount_units: expectedAmountUnits != null ? expectedAmountUnits.toString() : null,
        payer: buyer || expectedBuyer || null,
        payee: seller || expectedSeller || null,
        escrow_contract: escrowAddress,
        block_number: Number(receipt.blockNumber),
        verified_at: new Date().toISOString(),
        mode: 'escrow',
      },
    };
  }

  return {
    verifyUSDCTransfer,
    verifyEscrowDeposit,
    parseDidAddress,
    normalizeAddress,
    normalizeNetwork,
  };
}
