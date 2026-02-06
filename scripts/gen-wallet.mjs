// Simple wallet generator using crypto
import crypto from 'crypto';

function generatePrivateKey() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

const pk = generatePrivateKey();
console.log('Base Sepolia Wallet (for testnet only):');
console.log('Private Key:', pk);
console.log('\n⚠️  IMPORTANT: This is a testnet wallet. Do NOT use for mainnet.');
console.log('Save this private key and use it to access the address on Base Sepolia.');
