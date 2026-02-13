import { isAddress, isHex, keccak256, padHex, toBytes, type Address, type Hex } from 'viem'
import { BASE_NETWORK } from './chain'

export const ESCROW_TIMEOUT_SEC = 24 * 60 * 60

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
    name: 'depositETH',
    stateMutability: 'payable',
    inputs: [
      { name: 'requestId', type: 'bytes32' },
      { name: 'seller', type: 'address' },
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
    name: 'escrows',
    stateMutability: 'view',
    inputs: [{ name: 'requestId', type: 'bytes32' }],
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'token', type: 'address' },
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
      { name: 'token', type: 'address', indexed: false },
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
      { name: 'token', type: 'address', indexed: false },
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
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
] as const

const ESCROW_ADDRESSES: Record<'base' | 'base-sepolia', Address> = {
  base: '0x0000000000000000000000000000000000000000',
  'base-sepolia': '0x0000000000000000000000000000000000000000',
}

export function getEscrowAddress(): Address | null {
  const env = (import.meta as any).env || {}
  const networkOverride = BASE_NETWORK === 'base'
    ? (env.VITE_ESCROW_CONTRACT_ADDRESS_BASE as string | undefined)
    : (env.VITE_ESCROW_CONTRACT_ADDRESS_BASE_SEPOLIA as string | undefined)
  const override = (env.VITE_ESCROW_CONTRACT_ADDRESS as string | undefined)
  const address = networkOverride || override || ESCROW_ADDRESSES[BASE_NETWORK]
  return isAddress(address) ? (address as Address) : null
}

export function encodeRequestId(requestId: string): Hex {
  if (isHex(requestId)) {
    if (requestId.length === 66) return requestId as Hex
    return padHex(requestId as Hex, { size: 32 })
  }
  return keccak256(toBytes(requestId))
}
