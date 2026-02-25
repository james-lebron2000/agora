#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { compileEscrow } from './compile.mjs';

dotenv.config();

const args = process.argv.slice(2);
const networkArgIndex = args.indexOf('--network');
const network = networkArgIndex >= 0 ? args[networkArgIndex + 1] : 'base-sepolia';
if (!['base', 'base-sepolia'].includes(network)) {
  throw new Error(`Unsupported network: ${network}`);
}

const chain = network === 'base' ? base : baseSepolia;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error('Missing DEPLOYER_PRIVATE_KEY');
}

const account = privateKeyToAccount(privateKey);
const rpcUrl = process.env.CHAIN_RPC_URL
  || (network === 'base' ? process.env.BASE_RPC_URL : process.env.BASE_SEPOLIA_RPC_URL)
  || chain.rpcUrls.default.http[0];

const USDC_ADDRESSES = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

const usdcAddress = process.env.USDC_ADDRESS || USDC_ADDRESSES[network];
const treasury = process.env.TREASURY_ADDRESS || account.address;

const { abi, bytecode } = compileEscrow();
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

console.log(`[contracts] network=${network}`);
console.log(`[contracts] deployer=${account.address}`);
console.log(`[contracts] treasury=${treasury}`);
console.log(`[contracts] usdc=${usdcAddress}`);

const txHash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [usdcAddress, treasury],
  account,
});
console.log(`[contracts] tx=${txHash}`);

const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
const contractAddress = receipt.contractAddress;
if (!contractAddress) {
  throw new Error('Missing contractAddress in receipt');
}
console.log(`[contracts] deployed=${contractAddress}`);

const deploymentsDir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'deployments');
fs.mkdirSync(deploymentsDir, { recursive: true });
const outputPath = path.join(deploymentsDir, `${network}.json`);
fs.writeFileSync(outputPath, JSON.stringify({
  network,
  chainId: chain.id,
  rpcUrl,
  deployer: account.address,
  treasury,
  usdcAddress,
  contractAddress,
  txHash,
  deployedAt: new Date().toISOString(),
}, null, 2));
console.log(`[contracts] deployment metadata -> ${outputPath}`);

console.log('[contracts] export env vars:');
if (network === 'base') {
  console.log(`AGORA_ESCROW_CONTRACT_ADDRESS_BASE=${contractAddress}`);
  console.log(`VITE_ESCROW_CONTRACT_ADDRESS_BASE=${contractAddress}`);
} else {
  console.log(`AGORA_ESCROW_CONTRACT_ADDRESS_BASE_SEPOLIA=${contractAddress}`);
  console.log(`VITE_ESCROW_CONTRACT_ADDRESS_BASE_SEPOLIA=${contractAddress}`);
}
