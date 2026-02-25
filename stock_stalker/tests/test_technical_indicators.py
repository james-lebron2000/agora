"""Test technical indicators."""

import sys
sys.path.insert(0, '.')

from analysis.technical_indicators import TechnicalAnalyzer, TechnicalIndicators
from datetime import datetime
import random


def generate_sample_data(days=250):
    """Generate sample price data for testing."""
    base_price = 100
    prices = []
    volumes = []
    highs = []
    lows = []
    
    for i in range(days):
        # Random walk
        change = random.gauss(0, 2)
        price = base_price + change
        price = max(price, 50)  # Floor
        
        prices.append(price)
        volumes.append(random.randint(1000000, 5000000))
        highs.append(price + random.uniform(0, 5))
        lows.append(price - random.uniform(0, 5))
        
        base_price = price
    
    return prices, volumes, highs, lows


def test_technical_indicators():
    """Test technical indicator calculations."""
    print("=" * 60)
    print("Testing Technical Indicators")
    print("=" * 60)
    
    # Generate sample data
    prices, volumes, highs, lows = generate_sample_data(250)
    
    print(f"\n📊 Sample Data:")
    print(f"  Days: {len(prices)}")
    print(f"  Price range: ${min(prices):.2f} - ${max(prices):.2f}")
    print(f"  Latest price: ${prices[-1]:.2f}")
    
    # Calculate indicators
    print("\n🔧 Calculating indicators...")
    indicators = TechnicalAnalyzer.calculate_all(
        ticker="TEST",
        prices=prices,
        volumes=volumes,
        highs=highs,
        lows=lows
    )
    
    # Display results
    print("\n📈 Trend Indicators:")
    print(f"  SMA 20:  ${indicators.sma_20:.2f}" if indicators.sma_20 else "  SMA 20:  N/A")
    print(f"  SMA 50:  ${indicators.sma_50:.2f}" if indicators.sma_50 else "  SMA 50:  N/A")
    print(f"  SMA 200: ${indicators.sma_200:.2f}" if indicators.sma_200 else "  SMA 200: N/A")
    print(f"  EMA 12:  ${indicators.ema_12:.2f}" if indicators.ema_12 else "  EMA 12:  N/A")
    print(f"  EMA 26:  ${indicators.ema_26:.2f}" if indicators.ema_26 else "  EMA 26:  N/A")
    
    print("\n💹 Momentum Indicators:")
    print(f"  RSI 14:  {indicators.rsi_14:.2f}" if indicators.rsi_14 else "  RSI 14:  N/A")
    print(f"  MACD:    {indicators.macd:.4f}" if indicators.macd else "  MACD:    N/A")
    print(f"  Signal:  {indicators.macd_signal:.4f}" if indicators.macd_signal else "  Signal:  N/A")
    print(f"  Hist:    {indicators.macd_histogram:.4f}" if indicators.macd_histogram else "  Hist:    N/A")
    
    print("\n📊 Volatility Indicators:")
    print(f"  BB Upper:  ${indicators.bb_upper:.2f}" if indicators.bb_upper else "  BB Upper:  N/A")
    print(f"  BB Middle: ${indicators.bb_middle:.2f}" if indicators.bb_middle else "  BB Middle: N/A")
    print(f"  BB Lower:  ${indicators.bb_lower:.2f}" if indicators.bb_lower else "  BB Lower:  N/A")
    print(f"  BB Width:  {indicators.bb_width:.4f}" if indicators.bb_width else "  BB Width:  N/A")
    
    print("\n📈 Support/Resistance:")
    print(f"  Pivot: ${indicators.pivot_point:.2f}" if indicators.pivot_point else "  Pivot: N/A")
    print(f"  S1:    ${indicators.support_1:.2f}" if indicators.support_1 else "  S1:    N/A")
    print(f"  S2:    ${indicators.support_2:.2f}" if indicators.support_2 else "  S2:    N/A")
    print(f"  R1:    ${indicators.resistance_1:.2f}" if indicators.resistance_1 else "  R1:    N/A")
    print(f"  R2:    ${indicators.resistance_2:.2f}" if indicators.resistance_2 else "  R2:    N/A")
    
    print("\n🎯 Trading Signal:")
    signal = indicators.get_signal()
    print(f"  Signal: {signal}")
    
    # Verify calculations
    print("\n✅ Verification:")
    checks = [
        ("SMA 20 calculated", indicators.sma_20 is not None),
        ("RSI calculated", indicators.rsi_14 is not None),
        ("MACD calculated", indicators.macd is not None),
        ("BB calculated", indicators.bb_upper is not None),
        ("RSI in valid range", 0 <= indicators.rsi_14 <= 100 if indicators.rsi_14 else True),
        ("BB width positive", indicators.bb_width > 0 if indicators.bb_width else True),
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
    success = test_technical_indicators()
    sys.exit(0 if success else 1)
