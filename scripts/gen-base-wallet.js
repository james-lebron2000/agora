const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');

const pk = generatePrivateKey();
const account = privateKeyToAccount(pk);

console.log('Base Sepolia Wallet:');
console.log('Address:', account.address);
console.log('Private Key:', pk);
