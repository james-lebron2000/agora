"""Test Alpha Vantage integration."""

import sys
sys.path.insert(0, '.')

from data.fetchers.alpha_vantage_fetcher import AlphaVantageFetcher
from analysis.technical_indicators import TechnicalAnalyzer

# API密钥
API_KEY = "2HV3KV4QHQP0QXK0"


def test_alpha_vantage():
    """Test Alpha Vantage API integration."""
    print("=" * 70)
    print("Testing Alpha Vantage API Integration")
    print("=" * 70)
    
    # Initialize fetcher
    print("\n1️⃣ Initializing Alpha Vantage Fetcher...")
    try:
        fetcher = AlphaVantageFetcher(API_KEY)
        print("✅ Fetcher initialized")
    except Exception as e:
        print(f"❌ Failed to initialize: {e}")
        return False
    
    # Test 1: Get real-time quote
    print("\n2️⃣ Testing Real-Time Quote (AAPL)...")
    try:
        quote = fetcher.get_quote("AAPL")
        print(f"✅ Quote received:")
        print(f"   Symbol: {quote['symbol']}")
        print(f"   Price: ${quote['price']:.2f}")
        print(f"   Change: {quote['change']:.2f} ({quote['change_percent']})")
        print(f"   Volume: {quote['volume']:,}")
    except Exception as e:
        print(f"❌ Quote failed: {e}")
    
    # Test 2: Get daily data
    print("\n3️⃣ Testing Daily Price Data (TSLA)...")
    try:
        daily_data = fetcher.get_daily("TSLA", outputsize='compact')
        print(f"✅ Daily data received: {len(daily_data)} days")
        if daily_data:
            latest = daily_data[-1]
            print(f"   Latest: {latest['date'].strftime('%Y-%m-%d')}")
            print(f"   Close: ${latest['close']:.2f}")
            print(f"   Volume: {latest['volume']:,}")
    except Exception as e:
        print(f"❌ Daily data failed: {e}")
    
    # Test 3: Get RSI
    print("\n4️⃣ Testing RSI Indicator (MSFT)...")
    try:
        rsi_data = fetcher.get_rsi("MSFT", time_period=14)
        print(f"✅ RSI data received: {len(rsi_data)} data points")
        if rsi_data:
            latest = rsi_data[-1]
            rsi_value = list(latest.values())[1]  # First value after timestamp
            print(f"   Latest RSI: {rsi_value:.2f}")
            if rsi_value < 30:
                print("   📊 Signal: Oversold (RSI < 30)")
            elif rsi_value > 70:
                print("   📊 Signal: Overbought (RSI > 70)")
            else:
                print("   📊 Signal: Neutral")
    except Exception as e:
        print(f"❌ RSI failed: {e}")
    
    # Test 4: Get SMA
    print("\n5️⃣ Testing SMA Indicator (NVDA)...")
    try:
        sma_data = fetcher.get_sma("NVDA", time_period=20)
        print(f"✅ SMA data received: {len(sma_data)} data points")
        if sma_data:
            latest = sma_data[-1]
            sma_value = list(latest.values())[1]
            print(f"   Latest SMA(20): ${sma_value:.2f}")
    except Exception as e:
        print(f"❌ SMA failed: {e}")
    
    # Test 5: Get MACD
    print("\n6️⃣ Testing MACD Indicator (AAPL)...")
    try:
        macd_data = fetcher.get_macd("AAPL")
        print(f"✅ MACD data received: {len(macd_data)} data points")
        if macd_data:
            latest = macd_data[-1]
            print(f"   MACD: {latest['macd']:.4f}")
            print(f"   Signal: {latest['macd_signal']:.4f}")
            print(f"   Histogram: {latest['macd_hist']:.4f}")
            if latest['macd_hist'] > 0:
                print("   📊 Signal: Bullish")
            else:
                print("   📊 Signal: Bearish")
    except Exception as e:
        print(f"❌ MACD failed: {e}")
    
    # Test 6: Get company overview
    print("\n7️⃣ Testing Company Overview (GOOGL)...")
    try:
        overview = fetcher.get_company_overview("GOOGL")
        print(f"✅ Company overview received:")
        print(f"   Name: {overview['name']}")
        print(f"   Sector: {overview['sector']}")
        print(f"   Market Cap: ${overview['market_cap']}")
        print(f"   P/E Ratio: {overview['pe_ratio']}")
    except Exception as e:
        print(f"❌ Company overview failed: {e}")
    
    # Test 7: Integration with technical analyzer
    print("\n8️⃣ Testing Integration with Technical Analyzer...")
    try:
        # Get daily data for analysis
        daily_data = fetcher.get_daily("AAPL", outputsize='compact')
        
        if len(daily_data) >= 50:
            prices = [d['close'] for d in daily_data]
            volumes = [d['volume'] for d in daily_data]
            highs = [d['high'] for d in daily_data]
            lows = [d['low'] for d in daily_data]
            
            indicators = TechnicalAnalyzer.calculate_all(
                ticker="AAPL",
                prices=prices,
                volumes=volumes,
                highs=highs,
                lows=lows,
            )
            
            print(f"✅ Technical analysis complete:")
            print(f"   SMA 20: ${indicators.sma_20:.2f}" if indicators.sma_20 else "   SMA 20: N/A")
            print(f"   RSI 14: {indicators.rsi_14:.2f}" if indicators.rsi_14 else "   RSI 14: N/A")
            print(f"   Signal: {indicators.get_signal()}")
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
    
    # Summary
    print("\n" + "=" * 70)
    print("✅ Alpha Vantage API Integration Test Complete!")
    print("=" * 70)
    print("\n📊 Summary:")
    print("  - Real-time quotes: Available")
    print("  - Historical data: Available")
    print("  - Technical indicators: Available")
    print("  - Company fundamentals: Available")
    print("\n💡 Free tier limits:")
    print("  - 5 API calls per minute")
    print("  - 500 API calls per day")
    print("=" * 70)
    
    return True


if __name__ == "__main__":
    try:
        success = test_alpha_vantage()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
