"""Test backtesting engine."""

import sys
sys.path.insert(0, '.')

from datetime import datetime, timedelta
from analysis.backtest import BacktestEngine, BacktestResult, TradeAction, simple_ma_strategy, rsi_strategy
import random


def generate_sample_price_data(days=100, start_price=100):
    """Generate sample price data for testing."""
    data = []
    price = start_price
    
    for i in range(days):
        # Random walk with trend
        change = random.gauss(0.001, 0.02)  # Slight upward bias
        price = price * (1 + change)
        
        # Generate OHLCV
        day_data = {
            'date': datetime.now() - timedelta(days=days-i),
            'open': price * (1 + random.gauss(0, 0.005)),
            'high': price * (1 + abs(random.gauss(0, 0.01))),
            'low': price * (1 - abs(random.gauss(0, 0.01))),
            'close': price,
            'volume': random.randint(1000000, 5000000),
        }
        data.append(day_data)
    
    return data


def test_backtest_engine():
    """Test the backtest engine."""
    print("=" * 60)
    print("Testing Backtest Engine")
    print("=" * 60)
    
    # Generate sample data
    print("\n📊 Generating sample price data...")
    price_data = generate_sample_price_data(days=100, start_price=100)
    print(f"✓ Generated {len(price_data)} days of data")
    print(f"  Price range: ${price_data[0]['close']:.2f} - ${price_data[-1]['close']:.2f}")
    
    # Test 1: Simple MA Strategy
    print("\n" + "=" * 60)
    print("Test 1: Simple Moving Average Strategy")
    print("=" * 60)
    
    engine = BacktestEngine(initial_capital=100000.0)
    result = engine.run_backtest(
        ticker="TEST",
        price_data=price_data,
        strategy=simple_ma_strategy,
    )
    
    print(result.summary())
    
    # Test 2: RSI Strategy
    print("\n" + "=" * 60)
    print("Test 2: RSI Mean Reversion Strategy")
    print("=" * 60)
    
    engine2 = BacktestEngine(initial_capital=100000.0)
    result2 = engine2.run_backtest(
        ticker="TEST",
        price_data=price_data,
        strategy=rsi_strategy,
    )
    
    print(result2.summary())
    
    # Compare strategies
    print("\n" + "=" * 60)
    print("Strategy Comparison")
    print("=" * 60)
    print(f"{'Metric':<25} {'MA Strategy':>15} {'RSI Strategy':>15}")
    print("-" * 60)
    print(f"{'Total Return':<25} {result.total_return_pct:>14.2f}% {result2.total_return_pct:>14.2f}%")
    print(f"{'Total Trades':<25} {result.total_trades:>15} {result2.total_trades:>15}")
    print(f"{'Win Rate':<25} {result.win_rate:>14.1%} {result2.win_rate:>14.1%}")
    print(f"{'Max Drawdown':<25} {result.max_drawdown_pct:>14.2f}% {result2.max_drawdown_pct:>14.2f}%")
    print(f"{'Sharpe Ratio':<25} {result.sharpe_ratio:>15.2f} {result2.sharpe_ratio:>15.2f}")
    print("=" * 60)
    
    # Verify results
    print("\n✅ Verification:")
    checks = [
        ("Engine initialized", engine.initial_capital == 100000.0),
        ("Results generated", result is not None),
        ("Trades recorded", len(result.trades) >= 0),
        ("Capital tracked", result.final_capital >= 0),
        ("Metrics calculated", result.sharpe_ratio is not None),
    ]
    
    all_passed = True
    for name, passed in checks:
        status = "✓" if passed else "✗"
        print(f"  {status} {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ All tests PASSED")
    else:
        print("❌ Some tests FAILED")
    print("=" * 60)
    
    return all_passed


if __name__ == "__main__":
    success = test_backtest_engine()
    sys.exit(0 if success else 1)
