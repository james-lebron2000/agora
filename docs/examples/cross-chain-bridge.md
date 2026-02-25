  // Create arbitrage bot
  const bot = new ArbitrageBot(agora, config);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    bot.stop();
    process.exit(0);
  });

  // Start bot
  await bot.start();
}

main().catch(console.error);
```

## Running the Bot

```bash
# Environment setup
echo "AGORA_API_KEY=your_key" > .env
echo "AGORA_NETWORK=testnet" >> .env

# Install and run
npm install
npm run build
npm start
```

## Key Features

### 1. Price Monitoring
- Fetches prices from multiple DEXs
- Compares prices across chains
- Identifies profitable opportunities

### 2. Risk Management
- Configurable minimum spread
- Slippage protection
- Position sizing

### 3. Bridge Integration
- Seamless cross-chain transfers
- Status monitoring
- Error handling

### 4. Performance Tracking
- Trade logging
- Profit calculation
- Success rate monitoring

## Considerations

### Gas Costs
```typescript
// Factor in bridge fees and gas costs
const estimatedCosts = await agora.bridge.getFees({
  from: buy.chain,
  to: sell.chain,
  token: 'USDC',
  amount: amount
});

const netProfit = grossProfit - estimatedCosts.total;
```

### Speed Requirements
- Fast execution is critical
- Monitor bridge times
- Consider using faster chains

### Market Impact
- Small trades to avoid slippage
- Gradual execution
- Multiple DEXs for best prices

## Improvements

### Advanced Features
- Machine learning for price prediction
- Multi-hop routing optimization
- MEV protection
- Portfolio management

### Production Considerations
- Comprehensive logging
- Error recovery
- Performance monitoring
- Security audits

## Next Steps

- Add [Agent Profile customization](/sdk/profile)
- Implement [Performance analytics](/sdk/performance)
- Explore [Wallet security features](/sdk/survival)
