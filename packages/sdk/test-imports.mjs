// Test file to verify imports work correctly
import { BridgeError, BridgeTransactionMonitor, estimateBridgeFee, defaultLogger, listenLayerZeroMessages } from './dist/bridge.js';

console.log('Testing imports...');

console.log('BridgeError:', typeof BridgeError);
console.log('BridgeTransactionMonitor:', typeof BridgeTransactionMonitor);
console.log('estimateBridgeFee:', typeof estimateBridgeFee);
console.log('defaultLogger:', typeof defaultLogger);
console.log('listenLayerZeroMessages:', typeof listenLayerZeroMessages);

// Test instantiation
const error = new BridgeError('test', 'UNKNOWN_ERROR');
console.log('BridgeError instance:', error.message);

const monitor = new BridgeTransactionMonitor('base');
console.log('BridgeTransactionMonitor instance created');

const cleanup = listenLayerZeroMessages('base', () => {});
console.log('listenLayerZeroMessages cleanup created');
cleanup();

console.log('All imports working correctly!');